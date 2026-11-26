import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, ChevronRight, Luggage, Plus, Route, Users } from 'lucide-react';
import { roteiroApi, usuarioApi, viagemApi } from '../api/endpoints';
import type { ItemListaViagem } from '../api/types';
import { ICONE_TIPO_VIAGEM } from '../components/icons';
import { Empty, Glass, Photo, Segmented } from '../components/ui';
import { ViagemSheet } from '../components/ViagemSheet';
import { useAuth } from '../state/auth';
import { fotoDoDestino, fotoGrandeDoDestino } from '../utils/featured';
import { daysUntil, formatRange, plural, toISODate, today, tripDays } from '../utils/format';
import { useDocumentTitle } from '../utils/hooks';
import { lerTiposViagem, PERFIL, STATUS_VIAGEM, TIPO_VIAGEM } from '../utils/labels';

type Filtro = 'todas' | 'minhas' | 'compartilhadas';

function useRoteiro(viagemId: number) {
  return useQuery({
    queryKey: ['roteiro', viagemId],
    queryFn: () => roteiroApi.listar(viagemId),
    staleTime: 60_000,
  });
}

function Contagem({ inicio }: { inicio: string }) {
  const dias = daysUntil(inicio);
  if (dias > 1) return <>Faltam {plural(dias, 'dia')}</>;
  if (dias === 1) return <>É amanhã</>;
  if (dias === 0) return <>É hoje!</>;
  return <>Em andamento</>;
}

/** Só a próxima viagem ganha destaque com foto grande. */
function Destaque({ viagem }: { viagem: ItemListaViagem }) {
  const roteiro = useRoteiro(viagem.id);
  const paradas = roteiro.data ?? [];
  const capa = paradas[0] ? fotoGrandeDoDestino(paradas[0].destino.nome, paradas[0].destino.foto_url) : null;

  return (
    <Link to={`/viagens/${viagem.id}`} className="trip-card is-featured">
      <Photo src={capa} alt="" className="trip-card-photo" />
      <Glass className="trip-card-info">
        <span className="caption trip-countdown">
          <Contagem inicio={viagem.data_inicio} />
        </span>
        <h3 className="title-2">{viagem.nome}</h3>
        <span className="footnote secondary row gap-1">
          <CalendarDays size={14} aria-hidden /> {formatRange(viagem.data_inicio, viagem.data_fim)} ·{' '}
          {plural(tripDays(viagem.data_inicio, viagem.data_fim), 'dia')} · {STATUS_VIAGEM[viagem.status].label}
        </span>
        <span className="footnote secondary row gap-1 truncate">
          <Route size={14} aria-hidden />
          {paradas.length ? paradas.map((p) => p.destino.nome).join(' → ') : 'Roteiro ainda vazio'}
        </span>
      </Glass>
    </Link>
  );
}

/** As demais viagens em linhas de uma lista, sem cartões. */
function LinhaViagem({ viagem }: { viagem: ItemListaViagem }) {
  const roteiro = useRoteiro(viagem.id);
  const paradas = roteiro.data ?? [];
  const primeira = paradas[0];
  const tipo = viagem.papel_usuario === 'criador' ? lerTiposViagem()[String(viagem.id)] : undefined;
  const IconeTipo = tipo ? ICONE_TIPO_VIAGEM[tipo] : null;

  return (
    <li>
      <Link to={`/viagens/${viagem.id}`} className="trip-row">
        <Photo
          src={primeira ? fotoDoDestino(primeira.destino.nome, primeira.destino.foto_url) : null}
          alt=""
          className="trip-row-thumb"
        />
        <span className="stack grow" style={{ minWidth: 0 }}>
          <strong className="headline truncate">{viagem.nome}</strong>
          <span className="footnote secondary truncate">
            {formatRange(viagem.data_inicio, viagem.data_fim)}
            {paradas.length > 0 && ` · ${paradas.map((p) => p.destino.nome).join(' → ')}`}
          </span>
        </span>
        <span className="trip-row-meta footnote secondary">
          {viagem.papel_usuario !== 'criador' && (
            <span className="row gap-1">
              <Users size={13} aria-hidden /> {PERFIL[viagem.papel_usuario].label}
            </span>
          )}
          {IconeTipo && tipo && (
            <span className="row gap-1">
              <IconeTipo size={13} aria-hidden /> {TIPO_VIAGEM[tipo].label}
            </span>
          )}
          <span className={`chip ${STATUS_VIAGEM[viagem.status].chip}`}>{STATUS_VIAGEM[viagem.status].label}</span>
        </span>
        <ChevronRight aria-hidden className="trip-row-chevron" />
      </Link>
    </li>
  );
}

export default function Viagens() {
  useDocumentTitle('Minhas viagens');
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [criando, setCriando] = useState(false);

  const lista = useInfiniteQuery({
    queryKey: ['viagens', 'lista'],
    queryFn: ({ pageParam }) => viagemApi.listar(pageParam, 100),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.tem_proxima ? ultima.pagina + 1 : undefined),
  });

  const paises = useQuery({ queryKey: ['paises-visitados'], queryFn: usuarioApi.paisesVisitados });

  const todas = useMemo(() => lista.data?.pages.flatMap((p) => p.itens) ?? [], [lista.data]);

  const { proximas, anteriores } = useMemo(() => {
    const hoje = toISODate(today());
    const filtradas = todas.filter((v) =>
      filtro === 'todas' ? true : filtro === 'minhas' ? v.papel_usuario === 'criador' : v.papel_usuario !== 'criador',
    );
    const ativa = (v: ItemListaViagem) => v.data_fim >= hoje && v.status !== 'concluida';
    return {
      proximas: filtradas.filter(ativa).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio)),
      anteriores: filtradas.filter((v) => !ativa(v)).sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)),
    };
  }, [todas, filtro]);

  const compartilhadas = todas.filter((v) => v.papel_usuario !== 'criador').length;
  const primeiroNome = usuario?.nome.split(' ')[0] ?? '';
  const [destaque, ...demaisProximas] = proximas;

  return (
    <div className="page container">
      <header className="page-header">
        <div className="stack gap-2">
          <span className="eyebrow">Minhas viagens</span>
          <h1 className="title-1">Olá, {primeiroNome}.</h1>
          {todas.length > 0 ? (
            <p className="stats-inline subhead secondary">
              <span><strong className="tabular">{todas.length}</strong> viagens</span>
              <span><strong className="tabular">{proximas.length}</strong> por vir</span>
              <span><strong className="tabular">{compartilhadas}</strong> compartilhadas comigo</span>
              <Link to="/perfil">
                <strong className="tabular">{paises.data?.total ?? '–'}</strong>{' '}
                {paises.data?.total === 1 ? 'país visitado' : 'países visitados'}
              </Link>
            </p>
          ) : (
            <p className="secondary">Que tal começar a planejar a próxima?</p>
          )}
        </div>
        <button type="button" className="btn btn-brand btn-lg" onClick={() => setCriando(true)}>
          <Plus /> Nova viagem
        </button>
      </header>

      {todas.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <Segmented<Filtro>
            label="Filtrar viagens"
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: 'todas', label: 'Todas' },
              { value: 'minhas', label: 'Organizo' },
              { value: 'compartilhadas', label: 'Compartilhadas' },
            ]}
          />
        </div>
      )}

      {lista.isLoading && <div className="skeleton" style={{ height: 360 }} />}

      {lista.isSuccess && todas.length === 0 && (
        <Empty
          icon={<Luggage />}
          title="Sua primeira viagem começa aqui"
          action={
            <div className="row wrap gap-3" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={() => setCriando(true)}>
                <Plus /> Criar viagem
              </button>
              <Link to="/explorar" className="btn btn-gray">
                Explorar destinos
              </Link>
            </div>
          }
        >
          Crie uma viagem, monte o roteiro e convide quem vai junto. Se alguém já te convidou, abra
          o link do email para entrar na viagem.
        </Empty>
      )}

      {destaque && (
        <section className="stack gap-3" style={{ marginBottom: 48 }}>
          <h2 className="title-3">Próxima viagem</h2>
          <Destaque viagem={destaque} />
        </section>
      )}

      {demaisProximas.length > 0 && (
        <section className="stack gap-2" style={{ marginBottom: 40 }}>
          <h2 className="title-3">Também por vir</h2>
          <ul className="trip-list">
            {demaisProximas.map((v) => (
              <LinhaViagem key={v.id} viagem={v} />
            ))}
          </ul>
        </section>
      )}

      {anteriores.length > 0 && (
        <section className="stack gap-2">
          <h2 className="title-3">Anteriores</h2>
          <ul className="trip-list">
            {anteriores.map((v) => (
              <LinhaViagem key={v.id} viagem={v} />
            ))}
          </ul>
        </section>
      )}

      {lista.isSuccess && todas.length > 0 && proximas.length + anteriores.length === 0 && (
        <Empty icon={<Users />} title="Nada por aqui">
          {filtro === 'compartilhadas'
            ? 'Ninguém compartilhou uma viagem com você ainda.'
            : 'Você ainda não organiza nenhuma viagem.'}
        </Empty>
      )}

      {lista.hasNextPage && (
        <button
          type="button"
          className="btn btn-plain"
          style={{ display: 'flex', margin: '24px auto 0' }}
          onClick={() => lista.fetchNextPage()}
        >
          Carregar mais <ArrowRight />
        </button>
      )}

      <ViagemSheet
        open={criando}
        onClose={() => setCriando(false)}
        onSalva={(v, tipo) =>
          navigate(`/viagens/${v.id}${tipo && tipo !== 'individual' ? '?aba=pessoas' : ''}`)
        }
      />
    </div>
  );
}
