import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Heart,
  MapPin,
  PiggyBank,
  Route,
  Search,
  Star,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { catalogoApi } from '../api/endpoints';
import { ExploreGlobe } from '../components/globe';
import { Glass, Photo, Segmented } from '../components/ui';
import { useAuth } from '../state/auth';
import { countryName } from '../utils/format';
import {
  FOTOS,
  LUGARES_INSPIRACAO,
  fotoDoDestino,
  montarLugaresGlobo,
  type LugarGlobo,
} from '../utils/featured';
import { CATEGORIA_DESTINO } from '../utils/labels';

function GlobePlaceholder() {
  return <div className="globe-placeholder" aria-hidden />;
}

function Hero() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [busca, setBusca] = useState('');
  const [ativo, setAtivo] = useState<LugarGlobo | null>(null);

  const destinos = useQuery({
    queryKey: ['catalogo', 'destinos', 'globo'],
    queryFn: () => catalogoApi.destinos({ tamanho_pagina: 100 }),
    staleTime: 5 * 60_000,
  });

  const lugares = useMemo(
    () => (destinos.data ? montarLugaresGlobo(destinos.data.itens) : LUGARES_INSPIRACAO),
    [destinos.data],
  );

  const buscar = (event: FormEvent) => {
    event.preventDefault();
    const q = busca.trim();
    navigate(q ? `/explorar?q=${encodeURIComponent(q)}` : '/explorar');
  };

  const sugestoes = destinos.data?.itens.slice(0, 4) ?? [];

  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Planejamento de viagens colaborativo</span>
          <h1 className="large-title">
            Planeje junto.
            <br />
            <span className="gradient-text">Viaje melhor.</span>
          </h1>
          <p className="hero-sub secondary">
            Monte roteiros com várias paradas, organize atividades e orçamento e convide amigos e
            família para planejar com você — tudo num só lugar.
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

          {sugestoes.length > 0 && (
            <p className="footnote secondary hero-popular">
              Populares:{' '}
              {sugestoes.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ' · '}
                  <Link to={`/explorar/destinos/${d.id}`}>{d.nome}</Link>
                </span>
              ))}
            </p>
          )}

          <div className="row wrap gap-3 hero-ctas">
            <Link to={usuario ? '/viagens' : '/cadastro'} className="btn btn-brand btn-lg">
              {usuario ? 'Ir para minhas viagens' : 'Começar a planejar'} <ArrowRight />
            </Link>
            <Link to="/explorar" className="btn btn-plain btn-lg">
              <Compass /> Ver destinos
            </Link>
          </div>
        </div>

        <div className="hero-globe">
          <Suspense fallback={<GlobePlaceholder />}>
            <ExploreGlobe
              lugares={lugares}
              onAtivoChange={setAtivo}
              onSelect={(l) => l.destinoId && navigate(`/explorar/destinos/${l.destinoId}`)}
            />
          </Suspense>
          <Glass className="globe-caption" aria-live="polite">
            <span className="globe-caption-dot" aria-hidden />
            {ativo ? (
              <span className="subhead">
                <strong>{ativo.nome}</strong>
                <span className="secondary"> · {countryName(ativo.pais)}</span>
                {ativo.destinoId && (
                  <Link to={`/explorar/destinos/${ativo.destinoId}`} className="globe-caption-link">
                    Ver destino
                  </Link>
                )}
              </span>
            ) : (
              <span className="subhead secondary">Gire o globo para descobrir lugares</span>
            )}
          </Glass>
        </div>
      </div>
    </section>
  );
}

type Jeito = 'individual' | 'amigos' | 'familia';

const JEITOS: Record<Jeito, { titulo: string; foto: string; texto: string; pontos: string[] }> = {
  individual: {
    titulo: 'No seu ritmo.',
    foto: FOTOS.individual,
    texto: 'Organize cada parada e acompanhe o orçamento sem planilhas.',
    pontos: ['Roteiro com várias cidades', 'Agenda por dia', 'Saldo do orçamento sempre à vista'],
  },
  amigos: {
    titulo: 'Todo mundo no mesmo roteiro.',
    foto: FOTOS.amigos,
    texto: 'Convide a turma por email. Quem edita ajusta o plano; quem acompanha avalia os passeios.',
    pontos: ['Convites por email', 'Editores e visualizadores', 'Avisos quando algo muda'],
  },
  familia: {
    titulo: 'Do avô ao caçula.',
    foto: FOTOS.familia,
    texto: 'Datas, hospedagens e atividades num só lugar, visíveis para quem vai junto.',
    pontos: ['Estadias em cada parada', 'Custos por tipo de atividade', 'Mapa da rota no globo'],
  },
};

/** Um único painel com seletor no lugar de três cartões. */
function JeitosDeViajar() {
  const [jeito, setJeito] = useState<Jeito>('amigos');
  const j = JEITOS[jeito];
  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head-center">
          <span className="eyebrow">Para cada jeito de viajar</span>
          <h2 className="title-1">Sozinho, com a turma ou em família.</h2>
          <Segmented<Jeito>
            label="Jeito de viajar"
            value={jeito}
            onChange={setJeito}
            options={[
              { value: 'individual', label: 'Individual', icon: <User aria-hidden /> },
              { value: 'amigos', label: 'Amigos', icon: <Users aria-hidden /> },
              { value: 'familia', label: 'Família', icon: <Heart aria-hidden /> },
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

/** Ranking como lista numerada, em vez de cartões com foto. */
function Ranking() {
  const ranking = useQuery({
    queryKey: ['catalogo', 'ranking'],
    queryFn: () => catalogoApi.ranking(6),
    staleTime: 5 * 60_000,
  });

  const itens = ranking.data?.itens ?? [];
  if (ranking.isError || (!ranking.isLoading && itens.length === 0)) return null;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head-row">
          <div className="stack gap-2">
            <span className="eyebrow">Mais bem avaliados</span>
            <h2 className="title-1">Destinos que os viajantes amaram.</h2>
          </div>
          <Link to="/explorar" className="btn btn-plain">
            Ver todos <ArrowRight />
          </Link>
        </div>
        {ranking.isLoading && <div className="skeleton" style={{ height: 160 }} />}
        <ol className="rank-list">
          {itens.map((item) => (
            <li key={item.destino.id}>
              <Link to={`/explorar/destinos/${item.destino.id}`} className="rank-row">
                <span className="rank-pos tabular">{item.posicao}</span>
                <Photo
                  src={fotoDoDestino(item.destino.nome, item.destino.foto_url)}
                  alt=""
                  className="rank-thumb"
                />
                <span className="stack grow" style={{ minWidth: 0 }}>
                  <strong className="headline truncate">{item.destino.nome}</strong>
                  <span className="footnote secondary truncate">
                    {countryName(item.destino.pais_codigo)} · {CATEGORIA_DESTINO[item.destino.categoria]}
                  </span>
                </span>
                <span className="row gap-1 subhead" style={{ flex: 'none' }}>
                  <Star aria-hidden className="star-inline" fill="currentColor" />
                  <strong className="tabular">{item.media_avaliacoes.toFixed(1)}</strong>
                  <span className="footnote tertiary">({item.total_avaliacoes})</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ChamadaFinal() {
  const { usuario } = useAuth();
  return (
    <section className="section cta-plain">
      <div className="container stack gap-4" style={{ alignItems: 'center', textAlign: 'center' }}>
        <MapPin aria-hidden className="cta-plain-icon" />
        <h2 className="title-1">Sua próxima viagem começa com um rascunho.</h2>
        <p className="secondary section-lead">
          Crie a viagem em segundos e chame quem vai junto quando quiser.
        </p>
        <Link to={usuario ? '/viagens' : '/cadastro'} className="btn btn-brand btn-lg">
          {usuario ? 'Abrir minhas viagens' : 'Criar conta grátis'} <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <Hero />
      <JeitosDeViajar />
      <ComoFunciona />
      <Ranking />
      <ChamadaFinal />
    </>
  );
}
