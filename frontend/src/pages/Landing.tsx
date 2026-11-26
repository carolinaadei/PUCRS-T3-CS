import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  PiggyBank,
  Route,
  Search,
  UserPlus,
} from 'lucide-react';
import { catalogoApi } from '../api/endpoints';
import { agregarNotas, itemDaAtividade } from '../api/tripadvisor';
import {
  CreditoTripadvisor,
  NotaTripadvisor,
  tripadvisorIndisponivel,
  useNotasTripadvisor,
} from '../components/NotaTripadvisor';
import { ExploreGlobe } from '../components/globe';
import { Glass, Photo, Segmented } from '../components/ui';
import { useAuth } from '../state/auth';
import {
  FOTOS,
  LUGARES_INSPIRACAO,
  POPULARES,
  paisDoLugar,
  montarLugaresGlobo,
  type LugarGlobo,
} from '../utils/featured';

function GlobePlaceholder() {
  return <div className="globe-placeholder" aria-hidden />;
}

type Foco = { lugar: LugarGlobo; seq: number } | null;

function Hero({ lugares, foco }: { lugares: LugarGlobo[]; foco: Foco }) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [busca, setBusca] = useState('');
  const [ativo, setAtivo] = useState<LugarGlobo | null>(null);

  const buscar = (event: FormEvent) => {
    event.preventDefault();
    const q = busca.trim();
    navigate(q ? `/explorar?q=${encodeURIComponent(q)}` : '/explorar');
  };

  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1 className="large-title">
            Planeje junto.
            <br />
            <span className="gradient-text">Viaje melhor.</span>
          </h1>
          <p className="hero-sub secondary">
            Crie roteiros de viagem com múltiplas paradas, organize atividades e orçamentos e
            convide amigos e familiares para planejar tudo junto com você.
          </p>

          <Glass as="form" className="hero-search" onSubmit={buscar} role="search">
            <Search aria-hidden />
            <label htmlFor="hero-busca" className="sr-only">
              Para onde você quer ir?
            </label>
            <input
              id="hero-busca"
              className="hero-search-input"
              placeholder="Para onde você quer ir?"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary">
              Explorar
            </button>
          </Glass>

          <div className="row wrap gap-3 hero-ctas">
            <Link to={usuario ? '/viagens' : '/cadastro'} className="btn btn-brand btn-lg">
              {usuario ? 'Ir para minhas viagens' : 'Começar a planejar'} <ArrowRight />
            </Link>
          </div>
        </div>

        <div className="hero-globe">
          <Suspense fallback={<GlobePlaceholder />}>
            <ExploreGlobe
              lugares={lugares}
              foco={foco}
              onAtivoChange={setAtivo}
              onSelect={(l) => l.destinoId && navigate(`/explorar/destinos/${l.destinoId}`)}
            />
          </Suspense>
          {/* Sem rótulo visível: o cartão do globo já mostra o lugar. Leitores de tela ainda o ouvem. */}
          <p className="sr-only" aria-live="polite">
            {ativo ? [ativo.nome, paisDoLugar(ativo)].filter(Boolean).join(', ') : ''}
          </p>
        </div>
      </div>
    </section>
  );
}

type Jeito = 'individual' | 'grupo';

const JEITOS: Record<Jeito, { titulo: string; foto: string; texto: string; pontos: string[] }> = {
  individual: {
    titulo: 'No seu ritmo.',
    foto: FOTOS.individual,
    texto: 'Organize cada parada e acompanhe o orçamento sem planilhas.',
    pontos: ['Roteiro com várias cidades', 'Agenda por dia', 'Saldo do orçamento sempre à vista'],
  },
  grupo: {
    titulo: 'Todo mundo no mesmo roteiro.',
    foto: FOTOS.grupo,
    texto:
      'Amigos ou família, convidados por email. Quem edita ajusta o plano; quem acompanha vê tudo e avalia os passeios.',
    pontos: ['Convites por email', 'Editores e visualizadores', 'Avisos quando algo muda'],
  },
};

/** Um único painel com seletor no lugar de vários cartões. */
function JeitosDeViajar() {
  const [jeito, setJeito] = useState<Jeito>('individual');
  const j = JEITOS[jeito];
  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head-center">
          <h2 className="title-1">Para cada jeito de viajar</h2>
          <Segmented<Jeito>
            label="Jeito de viajar"
            value={jeito}
            onChange={setJeito}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'grupo', label: 'Em grupo' },
            ]}
          />
        </div>
        <div className="feature" key={jeito}>
          <Photo src={j.foto} alt="" className="feature-photo" />
          <div className="feature-copy stack gap-4">
            <h3 className="title-2">{j.titulo}</h3>
            <p className="secondary section-lead">{j.texto}</p>
            <ul className="checklist">
              {j.pontos.map((p) => (
                <li key={p} className="subhead">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const PASSOS = [
  {
    icone: CalendarDays,
    titulo: 'Crie a viagem',
    texto: 'Nome, datas e status: planejando, confirmada ou concluída.',
  },
  {
    icone: Route,
    titulo: 'Monte o roteiro',
    texto: 'Paradas do catálogo, estadias e ordem de visita.',
  },
  {
    icone: UserPlus,
    titulo: 'Convide quem vai',
    texto: 'Convites por email, como editor ou visualizador.',
  },
  {
    icone: PiggyBank,
    titulo: 'Controle os custos',
    texto: 'Orçamento, saldo e o peso de cada categoria.',
  },
];

/** Passos em lista aberta, sem caixas. */
function ComoFunciona() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Como funciona</span>
          <h2 className="title-1">Do primeiro rascunho ao embarque.</h2>
        </div>
        <ol className="steps-plain">
          {PASSOS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo}>
              <Icone aria-hidden className="steps-plain-icon" />
              <h3 className="headline">{titulo}</h3>
              <p className="subhead secondary">{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Os 10 populares como lista numerada, em vez de cartões com foto. */
function Ranking({
  lugares,
  onFocar,
}: {
  lugares: LugarGlobo[];
  onFocar: (lugar: LugarGlobo) => void;
}) {
  const navigate = useNavigate();
  // A lista vem de POPULARES; o catálogo diz quais destinos já podem entrar num roteiro.
  const noCatalogo = new Map(
    lugares.filter((l) => l.destinoId).map((l) => [l.chave, l.destinoId as number]),
  );
  // Nota de cada destino: média, ponderada pelo nº de avaliações, das notas da
  // Tripadvisor para as atividades do destino no catálogo.
  const atividades = useQuery({
    queryKey: ['catalogo', 'atividades', 'todas'],
    queryFn: () => catalogoApi.atividades({ tamanho_pagina: 100 }),
    staleTime: 5 * 60_000,
  });
  const idsPopulares = new Set(noCatalogo.values());
  const doRanking = (atividades.data?.itens ?? []).filter((a) => idsPopulares.has(a.destino.id));
  const notasTa = useNotasTripadvisor(doRanking.map(itemDaAtividade));
  const notas = new Map<number, { nota: number; avaliacoes: number }>();
  for (const destinoId of idsPopulares) {
    const agregada = agregarNotas(
      doRanking
        .filter((a) => a.destino.id === destinoId)
        .map((a) => notasTa.data?.[String(a.id)]),
    );
    if (agregada) notas.set(destinoId, agregada);
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head-row">
          <div className="stack gap-2">
            <span className="eyebrow">Mais populares</span>
            <h2 className="title-1">Destinos que os viajantes amaram.</h2>
            <CreditoTripadvisor indisponivel={tripadvisorIndisponivel(notasTa.error)} />
          </div>
          <Link to="/explorar" className="btn btn-plain">
            Ver todos <ArrowRight />
          </Link>
        </div>
        <ol className="rank-list">
          {POPULARES.map((lugar, i) => {
            const destinoId = noCatalogo.get(lugar.chave);
            const nota = destinoId ? notas.get(destinoId) : undefined;
            return (
              <li key={lugar.chave}>
                <button
                  type="button"
                  className="rank-row"
                  aria-label={[
                    `${i + 1}º, ${lugar.nome}`,
                    nota && `nota ${nota.nota.toFixed(1)} no Tripadvisor, em ${nota.avaliacoes} avaliações`,
                    destinoId ? 'abrir o destino' : 'mostrar no globo',
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  onClick={() =>
                    destinoId ? navigate(`/explorar/destinos/${destinoId}`) : onFocar(lugar)
                  }
                >
                  <span className="rank-pos tabular">{i + 1}</span>
                  <Photo src={lugar.foto} alt="" className="rank-thumb" />
                  <span className="stack grow" style={{ minWidth: 0 }}>
                    <strong className="headline truncate">{lugar.nome}</strong>
                    <span className="footnote secondary truncate">{paisDoLugar(lugar) ?? ''}</span>
                  </span>
                  {nota ? (
                    <span className="subhead" style={{ flex: 'none' }}>
                      <NotaTripadvisor nota={nota.nota} avaliacoes={nota.avaliacoes} compacta />
                    </span>
                  ) : notasTa.isFetching ? (
                    <span className="skeleton rank-nota-carregando" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default function Landing() {
  const [foco, setFoco] = useState<Foco>(null);
  const destinos = useQuery({
    queryKey: ['catalogo', 'destinos', 'globo'],
    queryFn: () => catalogoApi.destinos({ tamanho_pagina: 100 }),
    staleTime: 5 * 60_000,
  });
  const lugares = useMemo(
    () => (destinos.data ? montarLugaresGlobo(destinos.data.itens) : LUGARES_INSPIRACAO),
    [destinos.data],
  );

  // Destinos fora do catálogo levam ao globo: sobe a página e gira até o lugar.
  const focar = (lugar: LugarGlobo) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFoco({ lugar, seq: Date.now() });
  };

  return (
    <>
      <Hero lugares={lugares} foco={foco} />
      <JeitosDeViajar />
      <ComoFunciona />
      <Ranking lugares={lugares} onFocar={focar} />
    </>
  );
}
