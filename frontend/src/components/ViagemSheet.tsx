import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TriangleExclamationPoint } from 'lucide-react';
import { mensagemDeErro } from '../api/client';
import { viagemApi } from '../api/endpoints';
import type { StatusViagem, Viagem } from '../api/types';
import { addDays, plural, toISODate, today, tripDays } from '../utils/format';
import { salvarTipoViagem, STATUS_VIAGEM, TIPO_VIAGEM, type TipoViagem } from '../utils/labels';
import { ICONE_TIPO_VIAGEM } from './icons';
import { Field, LoadingButton, Segmented, Sheet } from './ui';

interface ViagemSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sem viagem: criação. Com viagem: edição dos dados gerais e do status. */
  viagem?: Viagem;
  onSalva?: (viagem: Viagem, tipo?: TipoViagem) => void;
}

export function ViagemSheet({ open, onClose, viagem, onSalva }: ViagemSheetProps) {
  const queryClient = useQueryClient();
  const editando = Boolean(viagem);
  const [tipo, setTipo] = useState<TipoViagem>('amigos');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [status, setStatus] = useState<StatusViagem>('planejando');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    if (viagem) {
      setNome(viagem.nome);
      setDescricao(viagem.descricao ?? '');
      setInicio(viagem.data_inicio);
      setFim(viagem.data_fim);
      setStatus(viagem.status);
    } else {
      const base = addDays(toISODate(today()), 30);
      setTipo('amigos');
      setNome('');
      setDescricao('');
      setInicio(base);
      setFim(addDays(base, 6));
    }
  }, [open, viagem]);

  const salvar = useMutation({
    mutationFn: () =>
      viagem
        ? viagemApi.atualizar(viagem.id, {
            nome: nome.trim(),
            descricao: descricao.trim(),
            data_inicio: inicio,
            data_fim: fim,
            status,
          })
        : viagemApi.criar({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            data_inicio: inicio,
            data_fim: fim,
          }),
    onSuccess: (salva) => {
      if (!viagem) salvarTipoViagem(salva.id, tipo);
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      queryClient.setQueryData(['viagem', salva.id], salva);
      onSalva?.(salva, viagem ? undefined : tipo);
      onClose();
    },
    onError: (e) => setErro(mensagemDeErro(e)),
  });

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro('Dê um nome para a viagem.');
    if (!inicio || !fim) return setErro('Informe as datas de ida e volta.');
    if (fim < inicio) return setErro('A volta não pode ser antes da ida.');
    salvar.mutate();
  };

  const dias = inicio && fim && fim >= inicio ? tripDays(inicio, fim) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editando ? 'Editar viagem' : 'Nova viagem'}
      subtitle={editando ? undefined : 'Você pode convidar as pessoas depois.'}
      footer={
        <>
          <button type="button" className="btn btn-gray" onClick={onClose}>
            Cancelar
          </button>
          <LoadingButton type="submit" form="viagem-form" className="btn btn-primary" loading={salvar.isPending}>
            {editando ? 'Salvar' : 'Criar viagem'}
          </LoadingButton>
        </>
      }
    >
      <form id="viagem-form" className="stack gap-5" onSubmit={enviar} noValidate>
        {erro && (
          <div className="alert alert-danger" role="alert">
            <TriangleExclamationPoint aria-hidden />
            <span>{erro}</span>
          </div>
        )}

        {!editando && (
          <fieldset className="tipo-fieldset">
            <legend className="field-label">Para quem é?</legend>
            <div className="tipo-grid">
              {(Object.keys(TIPO_VIAGEM) as TipoViagem[]).map((t) => {
                const Icone = ICONE_TIPO_VIAGEM[t];
                return (
                  <label key={t} className={`tipo-option ${tipo === t ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="tipo"
                      value={t}
                      checked={tipo === t}
                      onChange={() => setTipo(t)}
                      className="sr-only"
                    />
                    <span className="tipo-icon">
                      <Icone aria-hidden />
                    </span>
                    <strong className="subhead">{TIPO_VIAGEM[t].label}</strong>
                    <span className="caption secondary">{TIPO_VIAGEM[t].descricao}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <Field label="Nome da viagem">
          {(p) => (
            <input
              {...p}
              className="input"
              placeholder="Ex.: Férias de julho na Europa"
              maxLength={255}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              required
            />
          )}
        </Field>

        <div className="form-grid">
          <Field label="Ida">
            {(p) => (
              <input
                {...p}
                type="date"
                className="input"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  if (fim && e.target.value > fim) setFim(e.target.value);
                }}
                required
              />
            )}
          </Field>
          <Field label="Volta" hint={dias ? plural(dias, 'dia') : undefined}>
            {(p) => (
              <input
                {...p}
                type="date"
                className="input"
                value={fim}
                min={inicio}
                onChange={(e) => setFim(e.target.value)}
                required
              />
            )}
          </Field>
        </div>

        {editando && (
          <div className="field">
            <span className="field-label">Status</span>
            <Segmented<StatusViagem>
              label="Status da viagem"
              value={status}
              onChange={setStatus}
              options={(Object.keys(STATUS_VIAGEM) as StatusViagem[]).map((s) => ({
                value: s,
                label: STATUS_VIAGEM[s].label,
              }))}
            />
          </div>
        )}

        <Field label="Descrição" hint="Opcional. Combine o clima da viagem com quem vai junto.">
          {(p) => (
            <textarea
              {...p}
              className="textarea"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Sheet>
  );
}
