import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, TriangleExclamationPoint } from 'lucide-react';
import { itemDaAtividade } from '../../api/tripadvisor';
import { NotaTripadvisor, useNotasTripadvisor } from '../../components/NotaTripadvisor';
import { mensagemDeErro } from '../../api/client';
import { atividadesApi, catalogoApi } from '../../api/endpoints';
import type { AtividadeViagem, DestinoViagem, StatusAtividade } from '../../api/types';
import { ICONE_CATEGORIA } from '../../components/icons';
import { Field, LoadingButton, Photo, Segmented, Sheet, Spinner, StarsInput } from '../../components/ui';
import { formatMoney, formatTime, parseMoneyInput } from '../../utils/format';
import { CATEGORIA_ATIVIDADE, STATUS_ATIVIDADE } from '../../utils/labels';

type StatusEntrada = Exclude<StatusAtividade, 'cancelada'>;

function invalidarViagem(queryClient: ReturnType<typeof useQueryClient>, viagemId: number) {
  queryClient.invalidateQueries({ queryKey: ['atividades', viagemId] });
  queryClient.invalidateQueries({ queryKey: ['orcamento', viagemId] });
}

export function AtividadeSheet({
  open,
  onClose,
  parada,
  atividade,
}: {
  open: boolean;
  onClose: () => void;
  parada: DestinoViagem;
  atividade?: AtividadeViagem;
}) {
  const queryClient = useQueryClient();
  const editando = Boolean(atividade);
  const [catalogoId, setCatalogoId] = useState<number | null>(null);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [duracao, setDuracao] = useState('');
  const [custo, setCusto] = useState('');
  const [status, setStatus] = useState<StatusEntrada>('pendente');
  const [erro, setErro] = useState<string | null>(null);

  const catalogo = useQuery({
    queryKey: ['catalogo', 'atividades', 'destino', parada.destino_catalogo_id],
    queryFn: () =>
      catalogoApi.atividades({ destino_catalogo_id: parada.destino_catalogo_id, tamanho_pagina: 100 }),
    enabled: open && !editando,
  });
  const notas = useNotasTripadvisor((catalogo.data?.itens ?? []).map(itemDaAtividade));

  useEffect(() => {
    if (!open) return;
    setErro(null);
    if (atividade) {
      setCatalogoId(atividade.catalogo_atividade_id);
      setData(atividade.data);
      setHora(formatTime(atividade.hora_inicio));
      setDuracao(atividade.duracao_minutos ? String(atividade.duracao_minutos) : '');
      setCusto(Number(atividade.custo_previsto) ? atividade.custo_previsto.replace('.', ',') : '');
      setStatus(atividade.status === 'cancelada' ? 'pendente' : atividade.status);
    } else {
      setCatalogoId(null);
      setData(parada.data_chegada);
      setHora('');
      setDuracao('');
      setCusto('');
      setStatus('pendente');
    }
  }, [open, atividade, parada]);

  const salvar = useMutation({
    mutationFn: () => {
      const custoDecimal = custo.trim() ? parseMoneyInput(custo) : '0.00';
      const dados = {
        data,
        hora_inicio: hora || null,
        duracao_minutos: duracao ? Number(duracao) : null,
        custo_previsto: custoDecimal ?? '0.00',
        status,
      };
      return atividade
        ? atividadesApi.atualizar(parada.viagem_id, parada.id, atividade.id, dados)
        : atividadesApi.criar(parada.viagem_id, parada.id, { catalogo_atividade_id: catalogoId!, ...dados });
    },
    onSuccess: () => {
      invalidarViagem(queryClient, parada.viagem_id);
      onClose();
    },
    onError: (e) => setErro(mensagemDeErro(e)),
  });

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!editando && !catalogoId) return setErro('Escolha uma atividade do catálogo.');
    if (!data) return setErro('Escolha o dia.');
    if (custo.trim() && parseMoneyInput(custo) === null) return setErro('Custo inválido. Use, por exemplo, 150,00.');
    if (duracao && (!Number.isInteger(Number(duracao)) || Number(duracao) < 1))
      return setErro('A duração deve ser um número inteiro de minutos.');
    salvar.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editando ? atividade!.atividade.nome : `Atividade em ${parada.destino.nome}`}
      subtitle={editando ? 'Ajuste quando, quanto custa e o andamento.' : 'Escolha no catálogo deste destino.'}
      wide={!editando}
      footer={
        <>
          <button type="button" className="btn btn-gray" onClick={onClose}>
            Cancelar
          </button>
          <LoadingButton type="submit" form="atividade-form" className="btn btn-primary" loading={salvar.isPending}>
            {editando ? 'Salvar' : 'Adicionar'}
          </LoadingButton>
        </>
      }
    >
      <form id="atividade-form" className="stack gap-5" onSubmit={enviar} noValidate>
        {erro && (
          <div className="alert alert-danger" role="alert">
            <TriangleExclamationPoint aria-hidden />
            <span>{erro}</span>
          </div>
        )}

        {!editando && (
          <div className="pick-list" role="listbox" aria-label="Atividades do catálogo">
            {catalogo.isLoading && (
              <div className="row" style={{ justifyContent: 'center', padding: 24 }}>
                <Spinner />
              </div>
            )}
            {catalogo.data?.itens.length === 0 && (
              <p className="subhead secondary" style={{ padding: 12 }}>
                Este destino ainda não tem atividades no catálogo.
              </p>
            )}
            {catalogo.data?.itens.map((a) => {
              const ativo = catalogoId === a.id;
              const Icone = ICONE_CATEGORIA[a.categoria];
              return (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  className={`pick-item ${ativo ? 'is-selected' : ''}`}
                  onClick={() => setCatalogoId(a.id)}
                >
                  <Photo src={a.foto_url} alt="" className="pick-thumb" />
                  <span className="stack grow" style={{ textAlign: 'left', minWidth: 0 }}>
                    <strong className="subhead truncate">{a.nome}</strong>
                    <span className="footnote secondary row gap-1">
                      <Icone size={13} aria-hidden /> {CATEGORIA_ATIVIDADE[a.categoria]}
                      {notas.data?.[String(a.id)] && (
                        <>
                          {' · '}
                          <NotaTripadvisor
                            nota={notas.data[String(a.id)]!.nota}
                            avaliacoes={notas.data[String(a.id)]!.avaliacoes}
                            compacta
                          />
                        </>
                      )}
                    </span>
                  </span>
                  {ativo && <Check className="pick-check" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}

        <div className="form-grid">
          <Field label="Dia" hint={`Entre a chegada e a saída de ${parada.destino.nome}.`}>
            {(p) => (
              <input
                {...p}
                type="date"
                className="input"
                value={data}
                min={parada.data_chegada}
                max={parada.data_saida}
                onChange={(e) => setData(e.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Horário" hint="Opcional. Horário local.">
            {(p) => (
              <input {...p} type="time" className="input" value={hora} onChange={(e) => setHora(e.target.value)} />
            )}
          </Field>
          <Field label="Duração (min)" hint="Opcional.">
            {(p) => (
              <input
                {...p}
                type="number"
                inputMode="numeric"
                min={1}
                step={15}
                className="input"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Custo previsto (R$)"
            hint={custo && parseMoneyInput(custo) !== null ? formatMoney(parseMoneyInput(custo)) : 'Entra no orçamento da viagem.'}
          >
            {(p) => (
              <input
                {...p}
                inputMode="decimal"
                className="input"
                placeholder="0,00"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="field">
          <span className="field-label">Andamento</span>
          <Segmented<StatusEntrada>
            label="Andamento da atividade"
            value={status}
            onChange={setStatus}
            options={(['pendente', 'confirmada', 'concluida'] as StatusEntrada[]).map((s) => ({
              value: s,
              label: STATUS_ATIVIDADE[s].label,
            }))}
          />
        </div>
      </form>
    </Sheet>
  );
}

export function AvaliarSheet({
  atividade,
  onClose,
  onAvaliada,
}: {
  atividade: AtividadeViagem | null;
  onClose: () => void;
  onAvaliada?: () => void;
}) {
  const queryClient = useQueryClient();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setNota(0);
    setComentario('');
    setErro(null);
  }, [atividade]);

  const enviar = useMutation({
    mutationFn: () =>
      atividadesApi.avaliar(
        atividade!.viagem_id,
        atividade!.destino_viagem_id,
        atividade!.id,
        nota,
        comentario.trim() || null,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      onAvaliada?.();
      onClose();
    },
    onError: (e) => setErro(mensagemDeErro(e)),
  });

  return (
    <Sheet
      open={atividade !== null}
      onClose={onClose}
      title="Como foi?"
      subtitle={atividade?.atividade.nome}
      footer={
        <>
          <button type="button" className="btn btn-gray" onClick={onClose}>
            Agora não
          </button>
          <LoadingButton
            type="button"
            className="btn btn-primary"
            disabled={nota === 0}
            loading={enviar.isPending}
            onClick={() => enviar.mutate()}
          >
            Publicar avaliação
          </LoadingButton>
        </>
      }
    >
      <div className="stack gap-4" style={{ alignItems: 'center', textAlign: 'center' }}>
        {erro && (
          <div className="alert alert-danger" role="alert" style={{ alignSelf: 'stretch' }}>
            <TriangleExclamationPoint aria-hidden />
            <span>{erro}</span>
          </div>
        )}
        <StarsInput value={nota} onChange={setNota} />
        <textarea
          className="textarea"
          placeholder="Conte o que achou (opcional)"
          aria-label="Comentário"
          maxLength={2000}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        <p className="footnote tertiary">
          A avaliação fica pública no catálogo, com seu nome. Se você já avaliou esta atividade,
          esta substitui a anterior.
        </p>
      </div>
    </Sheet>
  );
}
