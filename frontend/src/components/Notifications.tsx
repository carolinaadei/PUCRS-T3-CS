import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CalendarDays,
  Check,
  Pencil,
  Route,
  Trash,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { notificacoesApi } from '../api/endpoints';
import type { Notificacao, TipoNotificacao } from '../api/types';
import { relativeTime } from '../utils/format';
import { Glass, Spinner, useDismiss } from './ui';

const ICONE: Record<TipoNotificacao, LucideIcon> = {
  membro_entrou: UserPlus,
  papel_alterado: Users,
  membro_removido: Users,
  viagem_excluida: Trash,
  viagem_alterada: Pencil,
  roteiro_alterado: Route,
  atividade_alterada: CalendarDays,
};

export function NotificationsBell() {
  const [aberto, setAberto] = useState(false);
  const ref = useDismiss<HTMLDivElement>(aberto, () => setAberto(false));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // A API recomenda polling leve do contador a cada 30–60 s.
  const contagem = useQuery({
    queryKey: ['notificacoes', 'contagem'],
    queryFn: notificacoesApi.contagem,
    refetchInterval: 45_000,
  });

  const lista = useQuery({
    queryKey: ['notificacoes', 'lista'],
    queryFn: () => notificacoesApi.listar(1, 15),
    enabled: aberto,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] });

  const marcarLida = useMutation({
    mutationFn: (id: number) => notificacoesApi.marcarLida(id),
    onSuccess: invalidar,
  });

  const marcarTodas = useMutation({
    mutationFn: notificacoesApi.marcarTodas,
    onSuccess: invalidar,
  });

  const naoLidas = contagem.data?.nao_lidas ?? 0;

  const abrir = (n: Notificacao) => {
    if (!n.lida) marcarLida.mutate(n.id);
    setAberto(false);
    if (n.viagem_id && n.tipo !== 'viagem_excluida' && n.tipo !== 'membro_removido') {
      navigate(`/viagens/${n.viagem_id}`);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <Bell />
        {naoLidas > 0 && <span className="badge-count">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>

      {aberto && (
        <Glass strong lg className="popover" role="dialog" aria-label="Notificações">
          <div className="row between" style={{ padding: '16px 16px 8px' }}>
            <h2 className="headline">Notificações</h2>
            {naoLidas > 0 && (
              <button
                type="button"
                className="btn btn-plain btn-sm"
                onClick={() => marcarTodas.mutate()}
                disabled={marcarTodas.isPending}
              >
                <Check /> Marcar todas
              </button>
            )}
          </div>
          <div className="notif-list">
            {lista.isLoading && (
              <div className="row" style={{ justifyContent: 'center', padding: 32 }}>
                <Spinner />
              </div>
            )}
            {lista.data && lista.data.itens.length === 0 && (
              <p className="secondary subhead" style={{ padding: '24px 16px 32px', textAlign: 'center' }}>
                Tudo em dia. Avisaremos quando alguém mexer nas suas viagens.
              </p>
            )}
            {lista.data?.itens.map((n) => {
              const Icone = ICONE[n.tipo] ?? Bell;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item ${n.lida ? '' : 'is-unread'}`}
                  onClick={() => abrir(n)}
                >
                  <span className="notif-icon">
                    <Icone aria-hidden />
                  </span>
                  <span className="stack gap-1 grow" style={{ textAlign: 'left' }}>
                    <span className="subhead">{n.mensagem}</span>
                    <span className="caption tertiary">{relativeTime(n.criado_em)}</span>
                  </span>
                  {!n.lida && <span className="notif-dot" aria-label="Não lida" />}
                </button>
              );
            })}
          </div>
        </Glass>
      )}
    </div>
  );
}
