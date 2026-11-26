import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Globe, Luggage, Plane, Plus, Route, Users } from 'lucide-react';
import { roteiroApi, usuarioApi, viagemApi } from '../api/endpoints';
import type { ItemListaViagem } from '../api/types';
import { ICONE_TIPO_VIAGEM } from '../components/icons';
import { Empty, Glass, Photo, Segmented } from '../components/ui';
import { ViagemSheet } from '../components/ViagemSheet';
import { useAuth } from '../state/auth';
import { fotoGrandeDoDestino } from '../utils/featured';
import { daysUntil, formatRange, plural, toISODate, today, tripDays } from '../utils/format';
import { useDocumentTitle } from '../utils/hooks';
import { lerTiposViagem, PERFIL, STATUS_VIAGEM, TIPO_VIAGEM } from '../utils/labels';

type Filtro = 'todas' | 'minhas' | 'compartilhadas';

function useRoteiroResumo(viagemId: number) {
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

function CartaoViagem({ viagem, destaque = false }: { viagem: ItemListaViagem; destaque?: boolean }) {
  const roteiro = useRoteiroResumo(viagem.id);
  const paradas = roteiro.data ?? [];
  const capa = paradas[0] ? fotoGrandeDoDestino(paradas[0].destino.nome, paradas[0].destino.foto_url) : null;
  const tipo = lerTiposViagem()[String(viagem.id)];
  const IconeTipo = tipo ? ICONE_TIPO_VIAGEM[tipo] : null;
  const status = STATUS_VIAGEM[viagem.status];

  return (
    <Link to={`/viagens/${viagem.id}`} className={`trip-card ${destaque ? 'is-featured' : ''}`}>
      <Photo src={capa} alt="" className="trip-card-photo" />
      <div className="trip-card-top row gap-2 wrap">
        <span className={`chip chip-glass`}>
          <span className="dot" style={{ color: viagem.status === 'confirmada' ? '#1fbf6a' : viagem.status === 'planejando' ? '#0a84ff' : '#8aa0b4' }} />
          {status.label}
        </span>
        {viagem.papel_usuario !== 'criador' && (
          <span className="chip chip-glass">
            <Users aria-hidden /> {PERFIL[viagem.papel_usuario].label}
          </span>
        )}
        {IconeTipo && tipo && viagem.papel_usuario === 'criador' && (
          <span className="chip chip-glass">
            <IconeTipo aria-hidden /> {TIPO_VIAGEM[tipo].label}
          </span>
        )}
      </div>
      <Glass className="trip-card-info">
        {destaque && (
          <span className="caption trip-countdown">
            <Contagem inicio={viagem.data_inicio} />
          </span>
        )}
        <h3 className={destaque ? 'title-2' : 'headline'}>{viagem.nome}</h3>
        <span className="footnote secondary row gap-1">
          <CalendarDays size={14} aria-hidden /> {formatRange(viagem.data_inicio, viagem.data_fim)} ·{' '}
          {plural(tripDays(viagem.data_inicio, viagem.data_fim), 'dia')}
        </span>
        <span className="footnote secondary row gap-1 truncate">
          <Route size={14} aria-hidden />
          {roteiro.isLoading
            ? '…'
            : paradas.length
              ? paradas.map((p) => p.destino.nome).join(' → ')
              : 'Roteiro ainda vazio'}
        </span>
      </Glass>
    </Link>
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
    const futuras = filtradas
      .filter((v) => v.data_fim >= hoje && v.status !== 'concluida')
      .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
    const passadas = filtradas
      .filter((v) => !(v.data_fim >= hoje && v.status !== 'concluida'))
      .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
    return { proximas: futuras, anteriores: passadas };
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
          <p className="secondary">
            {todas.length
              ? 'Veja o que vem por aí e continue de onde parou.'
              : 'Que tal começar a planejar a próxima?'}
          </p>
        </div>
        <button type="button" className="btn btn-brand btn-lg" onClick={() => setCriando(true)}>
          <Plus /> Nova viagem
        </button>
      </header>

      {todas.length > 0 && (
        <div className="stats-row">
          <Glass className="stat">
            <Luggage aria-hidden />
            <span className="stat-value tabular">{todas.length}</span>
            <span className="footnote secondary">viagens</span>
          </Glass>
          <Glass className="stat">
            <Plane aria-hidden />
            <span className="stat-value tabular">{proximas.length}</span>
            <span className="footnote secondary">por vir</span>
          </Glass>
          <Glass className="stat">
            <Users aria-hidden />
            <span className="stat-value tabular">{compartilhadas}</span>
            <span className="footnote secondary">compartilhadas comigo</span>
          </Glass>
          <Link to="/perfil" className="stat-link">
            <Glass className="stat" interactive>
              <Globe aria-hidden />
              <span className="stat-value tabular">{paises.data?.total ?? '–'}</span>
              <span className="footnote secondary">
                {paises.data?.total === 1 ? 'país visitado' : 'países visitados'}
              </span>
            </Glass>
          </Link>
        </div>
      )}

      {todas.length > 0 && (
        <div className="row between wrap gap-3" style={{ margin: '32px 0 20px' }}>
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

      {lista.isLoading && (
        <div className="trips-grid">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 320 }} />
          ))}
        </div>
      )}

      {lista.isSuccess && todas.length === 0 && (
        <Glass className="card-pad">
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
            Crie uma viagem, monte o roteiro e convide quem vai junto. Se alguém já te convidou,
            abra o link do email para entrar na viagem.
          </Empty>
        </Glass>
      )}

      {destaque && (
        <section className="stack gap-4" style={{ marginBottom: 48 }}>
          <h2 className="title-3">Próxima viagem</h2>
          <CartaoViagem viagem={destaque} destaque />
        </section>
      )}

      {demaisProximas.length > 0 && (
        <section className="stack gap-4" style={{ marginBottom: 48 }}>
          <h2 className="title-3">Também por vir</h2>
          <div className="trips-grid">
            {demaisProximas.map((v) => (
              <CartaoViagem key={v.id} viagem={v} />
            ))}
          </div>
        </section>
      )}

      {anteriores.length > 0 && (
        <section className="stack gap-4">
          <h2 className="title-3">Anteriores</h2>
          <div className="trips-grid">
            {anteriores.map((v) => (
              <CartaoViagem key={v.id} viagem={v} />
            ))}
          </div>
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
          className="btn btn-secondary"
          style={{ display: 'flex', margin: '32px auto 0' }}
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
