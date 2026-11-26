/**
 * Intermediário da Tripadvisor Terra API para o servidor do Vite (dev e preview).
 *
 * Por que aqui e não no navegador: a Tripadvisor recomenda manter a chave fora do
 * código cliente. O backend do projeto não pode ser alterado, então o próprio
 * servidor do frontend faz as chamadas com a chave, lida de TRIPADVISOR_API_KEY.
 *
 * Política de cache da Tripadvisor: só o ID do local pode ser armazenado. Este
 * módulo guarda apenas o vínculo “atividade do catálogo → ID da Tripadvisor” em
 * .cache/tripadvisor-ids.json; notas, contagens e links são buscados a cada
 * pedido, numa única chamada em lote (GET /locations?id=…).
 *
 * Rotas:
 *   GET  /tripadvisor/status      → { configurada }
 *   POST /tripadvisor/avaliacoes  → { [chave]: Nota | null }
 *        corpo: { itens: [{ chave, nome, destino, pais, categoria }] }
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export interface ItemTripadvisor {
  /** Identificador do item no frontend (ex.: id da atividade do catálogo). */
  chave: string;
  nome: string;
  destino: string;
  /** ISO alfa-2. */
  pais: string;
  /** Categoria de atividade do backend: passeio, refeicao, hospedagem, transporte, outro. */
  categoria: string;
}

export interface NotaTripadvisor {
  id: number;
  nome: string | null;
  nota: number;
  avaliacoes: number;
  icone: string | null;
  url: string | null;
}

interface Opcoes {
  chave: string | undefined;
  /** Pasta onde fica o cache de IDs (permitido pela política da Tripadvisor). */
  pastaCache: string;
  baseUrl?: string;
}

const CATEGORIAS: Record<string, string> = {
  passeio: 'ATTRACTION',
  outro: 'ATTRACTION',
  transporte: 'ATTRACTION',
  refeicao: 'RESTAURANT',
  hospedagem: 'HOTEL',
};

const MAX_ITENS = 60;
const INTERVALO_BUSCA_MS = 1100; // a busca tem limite próprio: 1 req/s
const NOVA_BUSCA_SEM_RESULTADO_MS = 7 * 24 * 60 * 60 * 1000;

class ErroTripadvisor extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type CacheIds = Record<string, { id: number | null; em: string }>;

export function tripadvisor({ chave, pastaCache, baseUrl = 'https://terra.tripadvisor.com/api' }: Opcoes): Plugin {
  const arquivo = path.join(pastaCache, 'tripadvisor-ids.json');
  let ids: CacheIds = {};
  try {
    if (existsSync(arquivo)) ids = JSON.parse(readFileSync(arquivo, 'utf-8')) as CacheIds;
  } catch {
    ids = {};
  }
  const salvarIds = () => {
    try {
      mkdirSync(pastaCache, { recursive: true });
      writeFileSync(arquivo, JSON.stringify(ids, null, 2));
    } catch {
      // Sem cache em disco, as buscas apenas se repetem.
    }
  };

  const cabecalhos = () => ({ 'X-API-Key': chave ?? '', Accept: 'application/json' });

  // Buscas em fila, respeitando o limite de 1 por segundo.
  let fila: Promise<unknown> = Promise.resolve();
  let ultimaBusca = 0;
  const naFila = <T>(tarefa: () => Promise<T>): Promise<T> => {
    const proxima = fila.then(async () => {
      const espera = ultimaBusca + INTERVALO_BUSCA_MS - Date.now();
      if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
      ultimaBusca = Date.now();
      return tarefa();
    });
    fila = proxima.catch(() => undefined);
    return proxima;
  };

  async function buscar(params: URLSearchParams): Promise<number | null> {
    params.set('size', '1'); // cada local devolvido é cobrado: pedimos só o melhor
    params.set('version', '1');
    const resposta = await naFila(() =>
      fetch(`${baseUrl}/locations/search?${params}`, { headers: cabecalhos() }),
    );
    if (!resposta.ok) throw new ErroTripadvisor(resposta.status, await resposta.text());
    const corpo = (await resposta.json()) as { data?: { location?: { id?: number } }[] };
    return corpo.data?.[0]?.location?.id ?? null;
  }

  async function idDoItem(item: ItemTripadvisor): Promise<number | null> {
    const chaveCache = `${item.pais.toUpperCase()}|${item.destino}|${item.nome}`;
    const salvo = ids[chaveCache];
    if (salvo && (salvo.id !== null || Date.now() - Date.parse(salvo.em) < NOVA_BUSCA_SEM_RESULTADO_MS)) {
      return salvo.id;
    }
    const categoria = CATEGORIAS[item.categoria];
    const base = () => {
      const p = new URLSearchParams({ country_code: item.pais.toUpperCase() });
      if (categoria) p.set('category', categoria);
      return p;
    };
    // 1ª tentativa: só o nome. 2ª: nome e cidade, casando também com o endereço.
    let id = await buscar(new URLSearchParams({ ...Object.fromEntries(base()), query: item.nome }));
    if (id === null) {
      id = await buscar(
        new URLSearchParams({
          ...Object.fromEntries(base()),
          query: `${item.nome} ${item.destino}`,
          search_type: 'COMBINED',
        }),
      );
    }
    ids[chaveCache] = { id, em: new Date().toISOString() };
    salvarIds();
    return id;
  }

  interface LocalTerra {
    id: number;
    names?: { value: string; primary?: boolean }[];
    traveler_ratings?: { overall?: { rating?: number; count?: number; icon_url?: string } };
    urls?: { tripadvisor?: { main?: string } };
  }

  async function notasDosIds(lista: number[]): Promise<Map<number, NotaTripadvisor>> {
    const mapa = new Map<number, NotaTripadvisor>();
    for (let i = 0; i < lista.length; i += 50) {
      const lote = lista.slice(i, i + 50);
      const params = new URLSearchParams({ id: lote.join(','), version: '1' });
      const resposta = await fetch(`${baseUrl}/locations?${params}`, { headers: cabecalhos() });
      if (!resposta.ok) throw new ErroTripadvisor(resposta.status, await resposta.text());
      const corpo = (await resposta.json()) as { data?: LocalTerra[] };
      for (const local of corpo.data ?? []) {
        const geral = local.traveler_ratings?.overall;
        if (typeof geral?.rating !== 'number') continue;
        mapa.set(local.id, {
          id: local.id,
          nome: local.names?.find((n) => n.primary)?.value ?? local.names?.[0]?.value ?? null,
          nota: geral.rating,
          avaliacoes: geral.count ?? 0,
          icone: geral.icon_url ?? null,
          url: local.urls?.tripadvisor?.main ?? null,
        });
      }
    }
    return mapa;
  }

  const responder = (res: ServerResponse, status: number, corpo: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store'); // notas não podem ser armazenadas
    res.end(JSON.stringify(corpo));
  };

  const lerCorpo = (req: IncomingMessage) =>
    new Promise<string>((ok, erro) => {
      let dados = '';
      req.on('data', (parte) => {
        dados += parte;
        if (dados.length > 100_000) erro(new Error('corpo grande demais'));
      });
      req.on('end', () => ok(dados));
      req.on('error', erro);
    });

  async function tratar(req: IncomingMessage, res: ServerResponse, proximo: () => void) {
    const url = req.url ?? '';
    if (url.startsWith('/status')) return responder(res, 200, { configurada: Boolean(chave) });
    if (!url.startsWith('/avaliacoes') || req.method !== 'POST') return proximo();
    if (!chave) {
      return responder(res, 503, {
        detail: 'Defina TRIPADVISOR_API_KEY em frontend/.env.local para exibir as avaliações do Tripadvisor.',
      });
    }
    try {
      const { itens } = JSON.parse(await lerCorpo(req)) as { itens?: ItemTripadvisor[] };
      const validos = (itens ?? [])
        .filter((i) => i && i.chave && i.nome && i.destino && /^[A-Za-z]{2}$/.test(i.pais ?? ''))
        .slice(0, MAX_ITENS);
      const porChave = new Map<string, number | null>();
      for (const item of validos) porChave.set(item.chave, await idDoItem(item));
      const unicos = [...new Set([...porChave.values()].filter((id): id is number => id !== null))];
      const notas = unicos.length ? await notasDosIds(unicos) : new Map<number, NotaTripadvisor>();
      const resultado: Record<string, NotaTripadvisor | null> = {};
      for (const [k, id] of porChave) resultado[k] = id === null ? null : (notas.get(id) ?? null);
      responder(res, 200, resultado);
    } catch (erro) {
      const status = erro instanceof ErroTripadvisor ? erro.status : 500;
      const detalhe =
        status === 401 || status === 403
          ? 'A Tripadvisor recusou a chave (verifique TRIPADVISOR_API_KEY e o plano).'
          : status === 429
            ? 'Limite de chamadas da Tripadvisor atingido. Tente mais tarde.'
            : 'Não foi possível consultar a Tripadvisor.';
      responder(res, status === 500 ? 502 : status, { detail: detalhe });
    }
  }

  return {
    name: 'viajajunto-tripadvisor',
    configureServer(server) {
      server.middlewares.use('/tripadvisor', (req, res, next) => void tratar(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/tripadvisor', (req, res, next) => void tratar(req, res, next));
    },
  };
}
