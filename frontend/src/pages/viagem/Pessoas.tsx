import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Eye, Mail, Pencil, Send, Trash, UserPlus, X } from 'lucide-react';
import { ApiError, mensagemDeErro } from '../../api/client';
import { membrosApi } from '../../api/endpoints';
import type { Membro, PapelMembro } from '../../api/types';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Avatar, Glass, LoadingButton, Spinner } from '../../components/ui';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { formatDate, relativeTime } from '../../utils/format';
import { PERFIL } from '../../utils/labels';
import type { ContextoViagem } from './contexto';

export function AbaPessoas({ viagem, ehCriador, destacarConvite }: ContextoViagem & { destacarConvite?: boolean }) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [remover, setRemover] = useState<Membro | null>(null);

  const membros = useQuery({
    queryKey: ['membros', viagem.id],
    queryFn: () => membrosApi.listar(viagem.id),
  });
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
    mutationFn: ({ id, papel }: { id: number; papel: PapelMembro }) =>
      membrosApi.alterarPapel(viagem.id, id, papel),
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

  return (
    <div className="trip-layout">
      <div className="stack gap-4">
        <Glass className="list-group">
          <div className="list-row">
            <h2 className="headline grow">Quem vai</h2>
            <span className="footnote secondary">{membros.data?.length ?? '–'} pessoas</span>
          </div>
          {membros.isLoading && (
            <div className="list-row">
              <Spinner />
            </div>
          )}
          {membros.data?.map((m) => {
            const souEu = m.usuario_id === usuario?.id;
            return (
              <div key={m.usuario_id} className="list-row">
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
                      onChange={(e) =>
                        alterarPapel.mutate({ id: m.usuario_id, papel: e.target.value as PapelMembro })
                      }
                    >
                      <option value="editor">Editor</option>
                      <option value="visualizador">Visualizador</option>
                    </select>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      aria-label={`Remover ${m.nome}`}
                      onClick={() => setRemover(m)}
                    >
                      <Trash />
                    </button>
                  </>
                ) : (
                  <span className={`chip ${m.papel === 'editor' ? 'chip-blue' : ''}`}>
                    {m.papel === 'editor' ? <Pencil aria-hidden /> : <Eye aria-hidden />}
                    {PERFIL[m.papel].label}
                  </span>
                )}
              </div>
            );
          })}
        </Glass>

        {ehCriador && (convites.data?.length ?? 0) > 0 && (
          <Glass className="list-group">
            <div className="list-row">
              <h2 className="headline grow">Convites pendentes</h2>
            </div>
            {convites.data!.map((c) => (
              <div key={c.id} className="list-row">
                <span className="invite-icon">
                  <Mail aria-hidden />
                </span>
                <div className="stack grow" style={{ minWidth: 0 }}>
                  <span className="subhead truncate">{c.email}</span>
                  <span className="footnote secondary">Válido até {formatDate(c.expira_em.slice(0, 10), true)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-gray btn-sm"
                  onClick={() => cancelar.mutate(c.id)}
                  disabled={cancelar.isPending}
                >
                  <X /> Cancelar
                </button>
              </div>
            ))}
          </Glass>
        )}
      </div>

      <aside className="trip-aside">
        {ehCriador ? (
          <Glass className={`card-pad stack gap-3 ${destacarConvite ? 'is-highlight' : ''}`}>
            <span className="budget-icon">
              <UserPlus aria-hidden />
            </span>
            <h2 className="headline">Convidar alguém</h2>
            <p className="subhead secondary">
              Enviamos um link por email, válido por 7 dias. A pessoa entra como visualizadora e você
              pode promovê-la a editora depois.
            </p>
            <form className="stack gap-3" onSubmit={enviar} noValidate>
              <label className="sr-only" htmlFor="convite-email">
                Email do convidado
              </label>
              <input
                id="convite-email"
                className="input"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus={destacarConvite}
                aria-invalid={erro ? true : undefined}
              />
              {erro && <span className="field-error">{erro}</span>}
              <LoadingButton type="submit" className="btn btn-primary" loading={convidar.isPending} disabled={!email}>
                <Send /> Enviar convite
              </LoadingButton>
            </form>
          </Glass>
        ) : null}
        <Glass className="card-pad stack gap-3">
          <h2 className="headline">Papéis</h2>
          {(['criador', 'editor', 'visualizador'] as const).map((p) => (
            <div key={p} className="stack">
              <strong className="subhead">{PERFIL[p].label}</strong>
              <span className="footnote secondary">{PERFIL[p].descricao}</span>
            </div>
          ))}
        </Glass>
      </aside>

      <ConfirmSheet
        open={remover !== null}
        onClose={() => setRemover(null)}
        titulo={`Remover ${remover?.nome ?? ''}?`}
        confirmar="Remover da viagem"
        carregando={removerMembro.isPending}
        onConfirmar={() => remover && removerMembro.mutate(remover)}
      >
        {remover?.nome} perde o acesso a esta viagem imediatamente. Você pode convidar de novo
        depois.
      </ConfirmSheet>
    </div>
  );
}
