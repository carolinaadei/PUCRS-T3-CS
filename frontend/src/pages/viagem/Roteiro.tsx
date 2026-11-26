import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  CalendarDays,
  Clock,
  Globe,
  MapPin,
  Pencil,
  Plus,
  Route,
  Star,
  Trash,
  Wallet,
} from 'lucide-react';
import { atividadesApi, orcamentoApi, roteiroApi } from '../../api/endpoints';
import type { AtividadeViagem, DestinoViagem } from '../../api/types';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { ICONE_CATEGORIA } from '../../components/icons';
import { ParadaSheet } from '../../components/ParadaSheet';
import { Empty, Glass, Photo, Spinner } from '../../components/ui';
import { useToast } from '../../state/toast';
import { fotoDoDestino } from '../../utils/featured';
import {
  countryName,
  diffDays,
  formatDuration,
  formatMoney,
  formatRange,
  formatTime,
  formatWeekday,
  plural,
  toNumber,
  tripDays,
} from '../../utils/format';
import { CATEGORIA_ATIVIDADE, PROXIMO_STATUS_ATIVIDADE, STATUS_ATIVIDADE } from '../../utils/labels';
import { AtividadeSheet, AvaliarSheet } from './AtividadeSheet';
import type { ContextoViagem } from './contexto';

function LinhaAtividade({
  atividade,
  podeEditar,
  onEditar,
  onRemover,
  onAvaliar,
}: {
  atividade: AtividadeViagem;
  podeEditar: boolean;
  onEditar: () => void;
  onRemover: () => void;
  onAvaliar: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const Icone = ICONE_CATEGORIA[atividade.atividade.categoria];
  const status = STATUS_ATIVIDADE[atividade.status];

  const avancar = useMutation({
    mutationFn: () =>
      atividadesApi.atualizar(atividade.viagem_id, atividade.destino_viagem_id, atividade.id, {
        status: PROXIMO_STATUS_ATIVIDADE[atividade.status],
      }),
    onSuccess: (nova) => {
      queryClient.setQueryData<AtividadeViagem[]>(
        ['atividades', atividade.viagem_id, atividade.destino_viagem_id],
        (lista) => lista?.map((a) => (a.id === nova.id ? nova : a)),
      );
      if (nova.status === 'concluida') toast.info('Concluída! Que tal deixar uma avaliação?');
    },
    onError: toast.erro,
  });

  const detalhes = [
    CATEGORIA_ATIVIDADE[atividade.atividade.categoria],
    formatDuration(atividade.duracao_minutos),
    toNumber(atividade.custo_previsto) > 0 ? formatMoney(atividade.custo_previsto) : null,
  ].filter(Boolean);

  return (
    <li className="act-line">
      <span className="act-time tabular">{formatTime(atividade.hora_inicio) || '—'}</span>
      <span className="act-icon" aria-hidden>
        <Icone />
      </span>
      <div className="stack grow" style={{ minWidth: 0 }}>
        <span className="subhead act-name">{atividade.atividade.nome}</span>
        <span className="footnote secondary truncate">{detalhes.join(' · ')}</span>
      </div>
      <div className="row gap-1 act-actions">
        {atividade.status === 'concluida' && (
          <button type="button" className="btn btn-plain btn-sm" onClick={onAvaliar}>
            <Star /> Avaliar
          </button>
        )}
        {podeEditar ? (
          <button
            type="button"
            className={`chip ${status.chip}`}
            onClick={() => avancar.mutate()}
            disabled={avancar.isPending}
            title="Avançar andamento"
            aria-label={`Andamento: ${status.label}. Clique para avançar.`}
          >
            {status.label}
          </button>
        ) : (
          <span className={`chip ${status.chip}`}>{status.label}</span>
        )}
        {podeEditar && (
          <>
            <button type="button" className="icon-btn icon-btn-sm" onClick={onEditar} aria-label="Editar atividade">
              <Pencil />
            </button>
            <button type="button" className="icon-btn icon-btn-sm" onClick={onRemover} aria-label="Remover atividade">
              <Trash />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function CartaoParada({
  parada,
  total,
  podeEditar,
  onMover,
  onEditar,
  onRemover,
}: {
  parada: DestinoViagem;
  total: number;
  podeEditar: boolean;
  onMover: (direcao: -1 | 1) => void;
  onEditar: () => void;
  onRemover: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [sheet, setSheet] = useState<{ atividade?: AtividadeViagem } | null>(null);
  const [remover, setRemover] = useState<AtividadeViagem | null>(null);
  const [avaliar, setAvaliar] = useState<AtividadeViagem | null>(null);

  const atividades = useQuery({
    queryKey: ['atividades', parada.viagem_id, parada.id],
    queryFn: () => atividadesApi.listar(parada.viagem_id, parada.id),
  });

  const removerAtividade = useMutation({
    mutationFn: (a: AtividadeViagem) => atividadesApi.remover(a.viagem_id, a.destino_viagem_id, a.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', parada.viagem_id] });
      queryClient.invalidateQueries({ queryKey: ['orcamento', parada.viagem_id] });
      setRemover(null);
      toast.sucesso('Atividade removida do roteiro.');
    },
    onError: toast.erro,
  });

  const porDia = useMemo(() => {
    const grupos = new Map<string, AtividadeViagem[]>();
    for (const a of atividades.data ?? []) {
      grupos.set(a.data, [...(grupos.get(a.data) ?? []), a]);
    }
    return [...grupos.entries()];
  }, [atividades.data]);

  const noites = diffDays(parada.data_chegada, parada.data_saida);

  return (
    <li className="stop">
      <div className="stop-rail" aria-hidden>
        <span className="stop-num">{parada.ordem}</span>
      </div>
      <Glass className="stop-card">
        <header className="stop-head">
          <Photo src={fotoDoDestino(parada.destino.nome, parada.destino.foto_url)} alt="" className="stop-thumb" />
          <div className="stack gap-1 grow" style={{ minWidth: 0 }}>
            <h3 className="title-3">
              <Link to={`/explorar/destinos/${parada.destino_catalogo_id}`} className="stop-title-link">
                {parada.destino.nome}
              </Link>
            </h3>
            <span className="subhead secondary row gap-1 wrap">
              <MapPin size={14} aria-hidden /> {countryName(parada.destino.pais_codigo)}
              <span aria-hidden>·</span>
              <CalendarDays size={14} aria-hidden /> {formatRange(parada.data_chegada, parada.data_saida)}
              <span aria-hidden>·</span>
              {noites === 0 ? 'bate e volta' : plural(noites, 'noite')}
            </span>
            {parada.hospedagem && (
              <span className="subhead row gap-1">
                <BedDouble size={15} aria-hidden className="secondary" /> {parada.hospedagem}
              </span>
            )}
          </div>
          {podeEditar && (
            <div className="row gap-1 stop-tools">
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => onMover(-1)}
                disabled={parada.ordem === 1}
                aria-label="Mover para antes"
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => onMover(1)}
                disabled={parada.ordem === total}
                aria-label="Mover para depois"
              >
                <ArrowDown />
              </button>
              <button type="button" className="icon-btn icon-btn-sm" onClick={onEditar} aria-label="Editar estadia">
                <Pencil />
              </button>
              <button type="button" className="icon-btn icon-btn-sm" onClick={onRemover} aria-label="Remover parada">
                <Trash />
              </button>
            </div>
          )}
        </header>

        {parada.descricao && <p className="subhead secondary stop-notes">{parada.descricao}</p>}

        <div className="stop-agenda">
          {atividades.isLoading && <Spinner />}
          {atividades.data?.length === 0 && (
            <p className="footnote tertiary">Nenhuma atividade planejada nesta parada ainda.</p>
          )}
          {porDia.map(([dia, lista]) => (
            <section key={dia} className="day">
              <h4 className="footnote day-title">{formatWeekday(dia)}</h4>
              <ul className="day-list">
                {lista.map((a) => (
                  <LinhaAtividade
                    key={a.id}
                    atividade={a}
                    podeEditar={podeEditar}
                    onEditar={() => setSheet({ atividade: a })}
                    onRemover={() => setRemover(a)}
                    onAvaliar={() => setAvaliar(a)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {podeEditar && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSheet({})}>
              <Plus /> Adicionar atividade
            </button>
          )}
        </div>
      </Glass>

      {sheet && (
        <AtividadeSheet open onClose={() => setSheet(null)} parada={parada} atividade={sheet.atividade} />
      )}
      <AvaliarSheet
        atividade={avaliar}
        onClose={() => setAvaliar(null)}
        onAvaliada={() => toast.sucesso('Avaliação publicada no catálogo.')}
      />
      <ConfirmSheet
        open={remover !== null}
        onClose={() => setRemover(null)}
        titulo="Remover atividade?"
        confirmar="Remover"
        carregando={removerAtividade.isPending}
        onConfirmar={() => remover && removerAtividade.mutate(remover)}
      >
        “{remover?.atividade.nome}” sai do roteiro. O catálogo e as avaliações públicas continuam.
      </ConfirmSheet>
    </li>
  );
}

export function AbaRoteiro({ viagem, podeEditar }: ContextoViagem) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [nova, setNova] = useState(false);
  const [editar, setEditar] = useState<DestinoViagem | null>(null);
  const [remover, setRemover] = useState<DestinoViagem | null>(null);

  const roteiro = useQuery({
    queryKey: ['roteiro', viagem.id],
    queryFn: () => roteiroApi.listar(viagem.id),
  });
  const orcamento = useQuery({
    queryKey: ['orcamento', viagem.id],
    queryFn: () => orcamentoApi.consultar(viagem.id),
  });

  const paradas = roteiro.data ?? [];

  const reordenar = useMutation({
    mutationFn: (ids: number[]) => roteiroApi.reordenar(viagem.id, ids),
    onSuccess: (lista) => {
      queryClient.setQueryData(['roteiro', viagem.id], lista);
      queryClient.invalidateQueries({ queryKey: ['mapa', viagem.id] });
    },
    onError: toast.erro,
  });

  const removerParada = useMutation({
    mutationFn: (p: DestinoViagem) => roteiroApi.remover(viagem.id, p.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roteiro', viagem.id] });
      queryClient.invalidateQueries({ queryKey: ['orcamento', viagem.id] });
      queryClient.invalidateQueries({ queryKey: ['mapa', viagem.id] });
      setRemover(null);
      toast.sucesso('Parada removida.');
    },
    onError: toast.erro,
  });

  const mover = (parada: DestinoViagem, direcao: -1 | 1) => {
    const ids = paradas.map((p) => p.id);
    const i = ids.indexOf(parada.id);
    const j = i + direcao;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reordenar.mutate(ids);
  };

  const paises = new Set(paradas.map((p) => p.destino.pais_codigo));
  const ultimaSaida = paradas.length ? paradas[paradas.length - 1].data_saida : undefined;
  const orc = orcamento.data;
  const pct = orc?.percentual_consumido !== null && orc?.percentual_consumido !== undefined
    ? Math.min(100, toNumber(orc.percentual_consumido))
    : null;

  return (
    <div className="trip-layout">
      <div className="stack gap-4">
        {roteiro.isLoading && <div className="skeleton" style={{ height: 260 }} />}
        {roteiro.isSuccess && paradas.length === 0 && (
          <Glass className="card-pad">
            <Empty
              icon={<Route />}
              title="Roteiro em branco"
              action={
                podeEditar && (
                  <button type="button" className="btn btn-primary" onClick={() => setNova(true)}>
                    <Plus /> Adicionar primeira parada
                  </button>
                )
              }
            >
              {podeEditar
                ? 'Adicione as cidades por onde vocês vão passar, na ordem da viagem.'
                : 'Quem organiza ainda não adicionou paradas.'}
            </Empty>
          </Glass>
        )}
        {paradas.length > 0 && (
          <ol className="stops" aria-label="Paradas na ordem de visita">
            {paradas.map((p) => (
              <CartaoParada
                key={p.id}
                parada={p}
                total={paradas.length}
                podeEditar={podeEditar}
                onMover={(d) => mover(p, d)}
                onEditar={() => setEditar(p)}
                onRemover={() => setRemover(p)}
              />
            ))}
          </ol>
        )}
        {podeEditar && paradas.length > 0 && (
          <button type="button" className="btn btn-glass add-stop" onClick={() => setNova(true)}>
            <Plus /> Adicionar parada
          </button>
        )}
      </div>

      <aside className="trip-aside">
        <Glass className="card-pad stack gap-4">
          <h2 className="headline">Resumo</h2>
          <dl className="summary">
            <div>
              <dt><CalendarDays aria-hidden /> Duração</dt>
              <dd className="tabular">{plural(tripDays(viagem.data_inicio, viagem.data_fim), 'dia')}</dd>
            </div>
            <div>
              <dt><Route aria-hidden /> Paradas</dt>
              <dd className="tabular">{paradas.length}</dd>
            </div>
            <div>
              <dt><Globe aria-hidden /> Países</dt>
              <dd>{[...paises].map(countryName).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt><Clock aria-hidden /> Período</dt>
              <dd>{formatRange(viagem.data_inicio, viagem.data_fim)}</dd>
            </div>
          </dl>
          {orc && (
            <div className="stack gap-2">
              <div className="row between">
                <span className="subhead row gap-2">
                  <Wallet size={16} aria-hidden className="secondary" /> Planejado
                </span>
                <strong className="tabular">{formatMoney(orc.total_planejado)}</strong>
              </div>
              {pct !== null && (
                <>
                  <div
                    className={`progress ${orc.orcamento_excedido ? 'is-over' : ''}`}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label="Orçamento consumido"
                  >
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="footnote secondary">
                    {orc.orcamento_excedido ? 'Acima do orçamento de ' : 'de '}
                    {formatMoney(orc.orcamento_total)}
                  </span>
                </>
              )}
              {pct === null && <span className="footnote tertiary">Orçamento ainda não definido.</span>}
            </div>
          )}
        </Glass>
      </aside>

      <ParadaSheet
        open={nova}
        onClose={() => setNova(false)}
        viagem={viagem}
        chegadaSugerida={ultimaSaida}
        onSalva={(p) => {
          toast.sucesso(`${p.destino.nome} entrou no roteiro.`);
          queryClient.invalidateQueries({ queryKey: ['mapa', viagem.id] });
        }}
      />
      <ParadaSheet open={editar !== null} onClose={() => setEditar(null)} viagem={viagem} parada={editar ?? undefined} />
      <ConfirmSheet
        open={remover !== null}
        onClose={() => setRemover(null)}
        titulo={`Remover ${remover?.destino.nome ?? 'parada'}?`}
        confirmar="Remover parada"
        carregando={removerParada.isPending}
        onConfirmar={() => remover && removerParada.mutate(remover)}
      >
        A parada e todas as atividades planejadas nela saem do roteiro. O catálogo e as avaliações
        públicas continuam.
      </ConfirmSheet>
    </div>
  );
}
