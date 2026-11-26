import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, PartyPopper, TriangleExclamationPoint } from 'lucide-react';
import { ApiError } from '../api/client';
import { membrosApi } from '../api/endpoints';
import { Empty, Glass, PageLoader } from '../components/ui';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { useDocumentTitle } from '../utils/hooks';

function mensagem(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return 'Este convite foi enviado para outro email. Entre com a conta do email convidado.';
    if (e.status === 404) return 'O link expirou ou foi cancelado. Peça um novo convite a quem organiza a viagem.';
    if (e.status === 409) return 'Este convite já foi usado, ou você já participa desta viagem.';
    return e.message;
  }
  return 'Não foi possível aceitar o convite.';
}

/** Destino dos links de convite enviados por email: /convite?token=... */
export default function Convite() {
  useDocumentTitle('Convite');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { usuario, carregando } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const tentou = useRef(false);

  useEffect(() => {
    if (!token || !usuario || tentou.current) return;
    tentou.current = true;
    membrosApi
      .aceitar(token)
      .then((viagem) => {
        queryClient.invalidateQueries({ queryKey: ['viagens'] });
        toast.sucesso(`Você entrou em “${viagem.nome}”.`);
        navigate(`/viagens/${viagem.id}`, { replace: true });
      })
      .catch((e) => setErro(mensagem(e)));
  }, [token, usuario, navigate, toast, queryClient]);

  if (carregando) return <PageLoader />;

  const retorno = `/convite?token=${encodeURIComponent(token)}`;

  return (
    <div className="page container" style={{ display: 'grid', placeItems: 'center' }}>
      <Glass lg className="card-pad invite-card">
        {!token ? (
          <Empty icon={<TriangleExclamationPoint />} title="Link incompleto">
            Abra o link exatamente como chegou no seu email.
          </Empty>
        ) : !usuario ? (
          <Empty
            icon={<Mail />}
            title="Você foi convidado para uma viagem"
            action={
              <div className="row wrap gap-3" style={{ justifyContent: 'center' }}>
                <Link to="/entrar" state={{ from: retorno }} className="btn btn-primary">
                  Entrar para aceitar
                </Link>
                <Link to="/cadastro" state={{ from: retorno }} className="btn btn-gray">
                  Criar conta
                </Link>
              </div>
            }
          >
            Entre (ou crie uma conta) com o mesmo email que recebeu o convite. Depois disso, você
            entra direto na viagem.
          </Empty>
        ) : erro ? (
          <Empty
            icon={<TriangleExclamationPoint />}
            title="Não deu para aceitar"
            action={
              <Link to="/viagens" className="btn btn-primary">
                Ir para minhas viagens
              </Link>
            }
          >
            {erro}
          </Empty>
        ) : (
          <Empty icon={<PartyPopper />} title="Entrando na viagem…">
            Só um instante.
          </Empty>
        )}
      </Glass>
    </div>
  );
}
