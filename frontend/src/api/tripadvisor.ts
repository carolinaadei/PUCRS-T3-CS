import type { DadosAtividadeCatalogo } from './types';

/** Nota de um local na Tripadvisor (Terra API), via intermediário do servidor do Vite. */
export interface NotaTripadvisor {
  id: number;
  nome: string | null;
  nota: number;
  avaliacoes: number;
  icone: string | null;
  url: string | null;
}

export interface ItemTripadvisor {
  chave: string;
  nome: string;
  destino: string;
  pais: string;
  categoria: string;
}

export type NotasTripadvisor = Record<string, NotaTripadvisor | null>;

/** Erro de “Tripadvisor não configurada”: a interface apenas omite as notas. */
export class TripadvisorIndisponivel extends Error {}

export function itemDaAtividade(a: DadosAtividadeCatalogo): ItemTripadvisor {
  return {
    chave: String(a.id),
    nome: a.nome,
    destino: a.destino.nome,
    pais: a.destino.pais_codigo,
    categoria: a.categoria,
  };
}

export async function buscarNotasTripadvisor(itens: ItemTripadvisor[]): Promise<NotasTripadvisor> {
  const resposta = await fetch('/tripadvisor/avaliacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ itens }),
  });
  if (resposta.status === 503 || resposta.status === 404) {
    const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
    throw new TripadvisorIndisponivel(corpo?.detail ?? 'Avaliações do Tripadvisor indisponíveis.');
  }
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(corpo?.detail ?? 'Não foi possível consultar a Tripadvisor.');
  }
  return (await resposta.json()) as NotasTripadvisor;
}

/**
 * Nota de um destino a partir das notas das suas atividades: média ponderada pelo
 * número de avaliações de cada uma, como o backend faz com as avaliações internas.
 */
export function agregarNotas(
  notas: (NotaTripadvisor | null | undefined)[],
): { nota: number; avaliacoes: number } | null {
  const validas = notas.filter((n): n is NotaTripadvisor => Boolean(n && n.avaliacoes > 0));
  const total = validas.reduce((soma, n) => soma + n.avaliacoes, 0);
  if (!total) return null;
  const media = validas.reduce((soma, n) => soma + n.nota * n.avaliacoes, 0) / total;
  return { nota: Math.round(media * 10) / 10, avaliacoes: total };
}
