import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  Heart,
  MapPin,
  PiggyBank,
  Route,
  Search,
  Star,
  User,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import { catalogoApi } from '../api/endpoints';
import { ExploreGlobe } from '../components/globe';
import { Glass, Photo } from '../components/ui';
import { useAuth } from '../state/auth';
import { countryName, formatMoney } from '../utils/format';
import {
  FOTOS,
  LUGARES_INSPIRACAO,
  POPULARES,
  fotoGrandeDoDestino,
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
  const [foco, setFoco] = useState<{ lugar: LugarGlobo; seq: number } | null>(null);

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

          <div className="row wrap gap-2" role="group" aria-label="Destinos populares">
            <span className="footnote tertiary">Populares:</span>
            {POPULARES.map((lugar) => (
              <button
                key={lugar.chave}
                type="button"
                className="chip chip-link"
                title={`${lugar.nome}, ${countryName(lugar.pais)}`}
                aria-label={`Mostrar ${lugar.nome}, ${countryName(lugar.pais)}, no globo`}
                onClick={() => setFoco({ lugar, seq: Date.now() })}
              >
                <MapPin aria-hidden /> {lugar.nome}
              </button>
            ))}
          </div>

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
          <Glass className="globe-caption" aria-live="polite">
            <span className="globe-caption-dot" aria-hidden />
            {ativo ? (
              <span className="subhead">
                <strong>{ativo.nome}</strong>
                <span className="secondary"> · {countryName(ativo.pais)}</span>
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

const JEITOS = [
  {
    chave: 'individual',
    titulo: 'Individual',
    icone: User,
    foto: FOTOS.individual,
    texto: 'Seu ritmo, suas escolhas. Organize cada parada e acompanhe o orçamento sem planilhas.',
  },
  {
    chave: 'amigos',
    titulo: 'Amigos',
    icone: Users,
    foto: FOTOS.amigos,
    texto: 'Todo mundo vê o mesmo roteiro. Editores ajustam, o resto acompanha e avalia.',
  },
  {
    chave: 'familia',
    titulo: 'Família',
    icone: Heart,
    foto: FOTOS.familia,
    texto: 'Do avô ao caçula: compartilhe datas, hospedagens e atividades com quem vai junto.',
  },
] as const;

function JeitosDeViajar() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Para cada jeito de viajar</span>
          <h2 className="title-1">Sozinho, com a turma ou em família.</h2>
          <p className="secondary section-lead">
            A mesma viagem, vista por todos. Você decide quem edita e quem só acompanha.
          </p>
        </div>
        <div className="jeitos-grid">
          {JEITOS.map(({ chave, titulo, icone: Icone, foto, texto }) => (
            <article key={chave} className="jeito-card">
              <Photo src={foto} alt="" className="jeito-photo" />
              <Glass className="jeito-caption">
                <span className="jeito-icon">
                  <Icone aria-hidden />
                </span>
                <h3 className="title-3">{titulo}</h3>
                <p className="subhead">{texto}</p>
              </Glass>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const PASSOS = [
  {
    icone: CalendarDays,
    titulo: 'Crie a viagem',
    texto: 'Dê um nome, escolha as datas e acompanhe o status: planejando, confirmada ou concluída.',
  },
  {
    icone: Route,
    titulo: 'Monte o roteiro',
    texto: 'Adicione paradas do catálogo, defina estadias e reorganize a ordem de visita.',
  },
  {
    icone: UserPlus,
    titulo: 'Convide quem vai',
    texto: 'Envie convites por email. Cada pessoa entra como editora ou visualizadora.',
  },
  {
    icone: PiggyBank,
    titulo: 'Controle os custos',
    texto: 'Defina um orçamento e veja o saldo e o peso de cada categoria em tempo real.',
  },
];

function ComoFunciona() {
  return (
    <section className="section how">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Como funciona</span>
          <h2 className="title-1">Do primeiro rascunho ao embarque.</h2>
        </div>
        <ol className="steps">
          {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo}>
              <Glass className="step" interactive>
                <span className="step-num caption tabular">0{i + 1}</span>
                <span className="step-icon">
                  <Icone aria-hidden />
                </span>
                <h3 className="headline">{titulo}</h3>
                <p className="subhead secondary">{texto}</p>
              </Glass>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Vitrine() {
  return (
    <section className="section">
      <div className="container">
        <div className="showcase">
          <Photo src={FOTOS.lago} alt="Lago entre montanhas com um barco a remo" className="showcase-photo" />
          <div className="showcase-overlay">
            <Glass lg className="showcase-card showcase-a">
              <span className="caption secondary">Roteiro</span>
              <div className="showcase-route">
                <span>Orlando</span>
                <ArrowRight aria-hidden />
                <span>Miami</span>
              </div>
              <span className="footnote secondary">26 dez – 6 jan · 12 dias</span>
            </Glass>
            <Glass lg className="showcase-card showcase-b">
              <div className="row between">
                <span className="caption secondary">Orçamento</span>
                <span className="chip chip-green">Dentro do previsto</span>
              </div>
              <span className="title-3 tabular">{formatMoney(4080, true)}</span>
              <div className="progress" aria-hidden>
                <span style={{ width: '68%' }} />
              </div>
              <span className="footnote secondary">68% de {formatMoney(6000, true)}</span>
            </Glass>
            <Glass lg className="showcase-card showcase-c">
              <span className="caption secondary">Quem vai</span>
              <div className="row gap-2">
                <UsersRound aria-hidden className="showcase-icon" />
                <span className="headline">Ana, Bruno e Carla</span>
              </div>
              <span className="footnote secondary">1 organizadora · 1 editor · 1 visualizadora</span>
            </Glass>
          </div>
        </div>
      </div>
    </section>
  );
}

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
          <Link to="/explorar" className="btn btn-secondary">
            Ver todos <ArrowRight />
          </Link>
        </div>
        <div className="dest-grid">
          {ranking.isLoading &&
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '4 / 5' }} />
            ))}
          {itens.map((item) => (
            <Link
              key={item.destino.id}
              to={`/explorar/destinos/${item.destino.id}`}
              className="dest-card"
            >
              <Photo
                src={fotoGrandeDoDestino(item.destino.nome, item.destino.foto_url)}
                alt={item.destino.nome}
                className="dest-card-photo"
              />
              <span className="dest-rank chip chip-glass">#{item.posicao}</span>
              <Glass className="dest-card-info">
                <div className="row between gap-2">
                  <h3 className="headline truncate">{item.destino.nome}</h3>
                  <span className="row gap-1 footnote">
                    <Star aria-hidden className="star-inline" fill="currentColor" />
                    <strong className="tabular">{item.media_avaliacoes.toFixed(1)}</strong>
                  </span>
                </div>
                <span className="footnote secondary truncate">
                  {countryName(item.destino.pais_codigo)} · {CATEGORIA_DESTINO[item.destino.categoria]}{' '}
                  · {item.total_avaliacoes}{' '}
                  {item.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'}
                </span>
              </Glass>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChamadaFinal() {
  const { usuario } = useAuth();
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="cta-band">
          <div className="stack gap-3" style={{ maxWidth: 560 }}>
            <h2 className="title-1">Sua próxima viagem começa com um rascunho.</h2>
            <p className="cta-sub">Crie a viagem em segundos e chame quem vai junto quando quiser.</p>
          </div>
          <Link to={usuario ? '/viagens' : '/cadastro'} className="btn btn-lg cta-btn">
            {usuario ? 'Abrir minhas viagens' : 'Criar conta grátis'} <ArrowRight />
          </Link>
        </div>
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
      <Vitrine />
      <Ranking />
      <ChamadaFinal />
    </>
  );
}
