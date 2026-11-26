import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Eye, Mail, Pencil, Send, Trash, X } from 'lucide-react';
import { ApiError, mensagemDeErro } from '../../api/client';
import { membrosApi } from '../../api/endpoints';
import type { Membro, PapelMembro } from '../../api/types';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Avatar, LoadingButton, Spinner } from '../../components/ui';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { formatDate, relativeTime } from '../../utils/format';
import { PERFIL } from '../../utils/labels';
import type { ContextoViagem } from './contexto';

/** Tudo numa única lista: convidar, quem vai e convites pendentes. */
export function AbaPessoas({ viagem, ehCriador, destacarConvite }: ContextoViagem & { destacarConvite?: boolean }) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [remover, setRemover] = useState<Membro | null>(null);

  const membros = useQuery({ queryKey: ['membros', viagem.id], queryFn: () => membrosApi.listar(viagem.id) });
  const convites = useQuery({
    queryKey: ['convites', viagem.id],
    queryFn: () => membrosApi.convites(viagem.id),
    enabled: ehCriador,
  });

  const convidar = useMutation({
    mutationFn: (e: string) => membrosApi.convidar(viagem.id, e),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['convites', viagem.id] });
      setEmail('');
      toast.sucesso(`Convite enviado para ${c.email}.`);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) setErro('Essa pessoa já participa da viagem.');
      else setErro(mensagemDeErro(e));
    },
  });

  const cancelar = useMutation({
    mutationFn: (id: number) => membrosApi.cancelarConvite(viagem.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites', viagem.id] });
      toast.sucesso('Convite cancelado. O link deixou de funcionar.');
    },
    onError: toast.erro,
  });

  const alterarPapel = useMutation({
    mutationFn: ({ id, papel }: { id: number; papel: PapelMembro }) => membrosApi.alterarPapel(viagem.id, id, papel),
    onSuccess: (m) => {
      queryClient.invalidateQueries({ queryKey: ['membros', viagem.id] });
      toast.sucesso(`${m.nome} agora é ${PERFIL[m.papel].label.toLowerCase()}.`);
    },
    onError: toast.erro,
  });

  const removerMembro = useMutation({
    mutationFn: (m: Membro) => membrosApi.remover(viagem.id, m.usuario_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membros', viagem.id] });
      setRemover(null);
      toast.sucesso('Pessoa removida da viagem.');
    },
    onError: toast.erro,
  });

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setErro('Informe um email válido.');
    convidar.mutate(e);
  };

  const pendentes = convites.data ?? [];

  return (
    <div className="trip-single stack gap-5">
      {ehCriador && (
        <form className={`invite-inline ${destacarConvite ? 'is-highlight' : ''}`} onSubmit={enviar} noValidate>
          <label className="sr-only" htmlFor="convite-email">
            Email do convidado
          </label>
          <div className="input-icon grow">
            <Mail aria-hidden />
            <input
              id="convite-email"
              className="input"
              type="email"
              placeholder="Convidar por email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={destacarConvite}
              aria-invalid={erro ? true : undefined}
            />
          </div>
          <LoadingButton type="submit" className="btn btn-primary" loading={convidar.isPending} disabled={!email}>
            <Send /> Enviar convite
          </LoadingButton>
          {erro ? (
            <span className="field-error invite-inline-note">{erro}</span>
          ) : (
            <span className="footnote tertiary invite-inline-note">
              O link vale por 7 dias. A pessoa entra como visualizadora e pode ser promovida a editora.
            </span>
          )}
        </form>
      )}

      <ul className="plain-list" aria-label="Quem vai">
        <li className="plain-list-head">
          <span className="footnote secondary">Quem vai · {membros.data?.length ?? '–'}</span>
        </li>
        {membros.isLoading && (
          <li className="list-row">
            <Spinner />
          </li>
        )}
        {membros.data?.map((m) => {
          const souEu = m.usuario_id === usuario?.id;
          return (
            <li key={m.usuario_id} className="list-row">
              <Avatar name={m.nome} seed={m.usuario_id} size={40} />
              <div className="stack grow" style={{ minWidth: 0 }}>
                <span className="subhead truncate">
                  <strong>{m.nome}</strong>
                  {souEu && <span className="secondary"> (você)</span>}
                </span>
                <span className="footnote secondary truncate">
                  {m.email}
                  {m.entrou_em && m.papel !== 'criador' ? ` · entrou ${relativeTime(m.entrou_em)}` : ''}
                </span>
              </div>
              {m.papel === 'criador' ? (
                <span className="chip chip-green">
                  <Crown aria-hidden /> {PERFIL.criador.label}
                </span>
              ) : ehCriador ? (
                <>
                  <label className="sr-only" htmlFor={`papel-${m.usuario_id}`}>
                    Papel de {m.nome}
                  </label>
                  <select
                    id={`papel-${m.usuario_id}`}
                    className="select select-compact"
                    value={m.papel}
                    disabled={alterarPapel.isPending}
                    onChange={(e) => alterarPapel.mutate({ id: m.usuario_id, papel: e.target.value as PapelMembro })}
                  >
                    <option value="editor">Editor</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                  <button type="button" className="icon-btn icon-btn-sm" aria-label={`Remover ${m.nome}`} onClick={() => setRemover(m)}>
                    <Trash />
                  </button>
                </>
              ) : (
                <span className={`chip ${m.papel === 'editor' ? 'chip-blue' : ''}`}>
                  {m.papel === 'editor' ? <Pencil aria-hidden /> : <Eye aria-hidden />}
                  {PERFIL[m.papel].label}
                </span>
              )}
            </li>
          );
        })}

        {ehCriador && pendentes.length > 0 && (
          <>
            <li className="plain-list-head">
              <span className="footnote secondary">Convites pendentes · {pendentes.length}</span>
            </li>
            {pendentes.map((c) => (
              <li key={c.id} className="list-row">
                <span className="invite-icon">
                  <Mail aria-hidden />
                </span>
                <div className="stack grow" style={{ minWidth: 0 }}>
                  <span className="subhead truncate">{c.email}</span>
                  <span className="footnote secondary">Válido até {formatDate(c.expira_em.slice(0, 10), true)}</span>
                </div>
                <button type="button" className="btn btn-plain btn-sm" onClick={() => cancelar.mutate(c.id)} disabled={cancelar.isPending}>
                  <X /> Cancelar
                </button>
              </li>
            ))}
          </>
        )}
      </ul>

      <p className="footnote tertiary">
        <strong>{PERFIL.criador.label}</strong>: {PERFIL.criador.descricao.toLowerCase()}{' '}
        <strong>{PERFIL.editor.label}</strong>: {PERFIL.editor.descricao.toLowerCase()}{' '}
        <strong>{PERFIL.visualizador.label}</strong>: {PERFIL.visualizador.descricao.toLowerCase()}
      </p>

      <ConfirmSheet
        open={remover !== null}
        onClose={() => setRemover(null)}
        titulo={`Remover ${remover?.nome ?? ''}?`}
        confirmar="Remover da viagem"
        carregando={removerMembro.isPending}
        onConfirmar={() => remover && removerMembro.mutate(remover)}
      >
        {remover?.nome} perde o acesso a esta viagem imediatamente. Você pode convidar de novo depois.
      </ConfirmSheet>
    </div>
  );
}
