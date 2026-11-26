import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronLeft,
  Ellipsis,
  Link2,
  Lock,
  Map as MapIcon,
  Pencil,
  PiggyBank,
  Route,
  Trash,
  UserPlus,
  Users,
} from 'lucide-react';
import { membrosApi, roteiroApi, viagemApi } from '../../api/endpoints';
import type { PerfilViagem } from '../../api/types';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Avatar, Empty, Glass, PageLoader, Photo, Segmented, useDismiss } from '../../components/ui';
import { ViagemSheet } from '../../components/ViagemSheet';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { fotoGrandeDoDestino, FOTOS } from '../../utils/featured';
import { daysUntil, formatRange, plural, tripDays } from '../../utils/format';
import { useDocumentTitle } from '../../utils/hooks';
import { PERFIL, STATUS_VIAGEM } from '../../utils/labels';
import { AbaMapa } from './Mapa';
import { AbaOrcamento } from './Orcamento';
import { AbaPessoas } from './Pessoas';
import { AbaRoteiro } from './Roteiro';
import type { ContextoViagem } from './contexto';

type Aba = 'roteiro' | 'mapa' | 'orcamento' | 'pessoas';
const ABAS: Aba[] = ['roteiro', 'mapa', 'orcamento', 'pessoas'];

function MenuViagem({
  podeEditar,
  ehCriador,
  onEditar,
  onExcluir,
}: {
  podeEditar: boolean;
  ehCriador: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useDismiss<HTMLDivElement>(aberto, () => setAberto(false));
  if (!podeEditar) return null;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-glass btn-icon-only"
        aria-label="Mais opções"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <Ellipsis />
      </button>
      {aberto && (
        <Glass strong lg className="popover menu" role="menu">
          <button
            type="button"
            className="menu-item"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              onEditar();
            }}
          >
            <Pencil /> Editar viagem
          </button>
          {ehCriador && (
            <>
              <div className="menu-sep" />
              <button
                type="button"
                className="menu-item danger"
                role="menuitem"
                onClick={() => {
                  setAberto(false);
                  onExcluir();
                }}
              >
                <Trash /> Excluir viagem
              </button>
            </>
          )}
        </Glass>
      )}
    </div>
  );
}

export default function ViagemDetalhe() {
  const { id } = useParams();
  const viagemId = Number(id);
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const abaParam = params.get('aba') as Aba | null;
  const aba: Aba = abaParam && ABAS.includes(abaParam) ? abaParam : 'roteiro';
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const viagem = useQuery({
    queryKey: ['viagem', viagemId],
    queryFn: () => viagemApi.consultar(viagemId),
    enabled: Number.isFinite(viagemId),
  });
  const membros = useQuery({
    queryKey: ['membros', viagemId],
    queryFn: () => membrosApi.listar(viagemId),
    enabled: viagem.isSuccess,
  });
  const roteiro = useQuery({
    queryKey: ['roteiro', viagemId],
    queryFn: () => roteiroApi.listar(viagemId),
    enabled: viagem.isSuccess,
  });

  const excluir = useMutation({
    mutationFn: () => viagemApi.excluir(viagemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.sucesso('Viagem excluída.');
      navigate('/viagens', { replace: true });
    },
    onError: toast.erro,
  });

  useDocumentTitle(viagem.data?.nome);

  if (viagem.isLoading) return <PageLoader />;
  if (!viagem.data) {
    return (
      <div className="page container">
        <Empty
          icon={<Lock />}
          title="Viagem indisponível"
          action={
            <Link to="/viagens" className="btn btn-primary">
              Voltar para minhas viagens
            </Link>
          }
        >
          Ela não existe mais ou você não participa dela. Se recebeu um convite, abra o link do email.
        </Empty>
      </div>
    );
  }

  const v = viagem.data;
  const ehCriador = v.criador_id === usuario?.id;
  const perfil: PerfilViagem =
    ehCriador ? 'criador' : (membros.data?.find((m) => m.usuario_id === usuario?.id)?.papel ?? 'visualizador');
  const podeEditar = perfil === 'criador' || perfil === 'editor';
  const ctx: ContextoViagem = { viagem: v, perfil, podeEditar, ehCriador };

  const primeira = roteiro.data?.[0];
  const capa = primeira ? fotoGrandeDoDestino(primeira.destino.nome, primeira.destino.foto_url) : FOTOS.lago;
  const faltam = daysUntil(v.data_inicio);
  const pessoas = membros.data ?? [];

  const trocarAba = (nova: Aba) => {
    const p = new URLSearchParams(params);
    if (nova === 'roteiro') p.delete('aba');
    else p.set('aba', nova);
    setParams(p, { replace: true });
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + `/viagens/${v.id}`);
      toast.sucesso('Link copiado. Só quem participa da viagem consegue abrir.');
    } catch {
      toast.erro('Não foi possível copiar o link.');
    }
  };

  return (
    <div className="page container">
      <Link to="/viagens" className="back-link">
        <ChevronLeft aria-hidden /> Minhas viagens
      </Link>

      <section className="trip-hero">
        <Photo src={capa} alt="" className="trip-hero-photo" eager />
        <Glass lg className="trip-hero-panel">
          <div className="row wrap gap-2">
            <span className={`chip chip-glass`}>{STATUS_VIAGEM[v.status].label}</span>
            {!ehCriador && <span className="chip chip-glass">Você é {PERFIL[perfil].label.toLowerCase()}</span>}
            {faltam > 0 && v.status !== 'concluida' && (
              <span className="chip chip-glass">Faltam {plural(faltam, 'dia')}</span>
            )}
          </div>
          <h1 className="title-1 trip-hero-title">{v.nome}</h1>
          <p className="subhead row gap-2 wrap trip-hero-meta">
            <CalendarDays size={16} aria-hidden /> {formatRange(v.data_inicio, v.data_fim)}
            <span aria-hidden>·</span> {plural(tripDays(v.data_inicio, v.data_fim), 'dia')}
          </p>
          {v.descricao && <p className="subhead trip-hero-desc">{v.descricao}</p>}
          <div className="row between wrap gap-3 trip-hero-actions">
            <button type="button" className="avatar-stack people-btn" onClick={() => trocarAba('pessoas')} aria-label="Ver quem vai">
              {pessoas.slice(0, 5).map((m) => (
                <Avatar key={m.usuario_id} name={m.nome} seed={m.usuario_id} size={34} title={m.nome} />
              ))}
              {pessoas.length > 5 && <span className="avatar avatar-more">+{pessoas.length - 5}</span>}
            </button>
            <div className="row gap-2">
              {ehCriador && (
                <button type="button" className="btn btn-primary" onClick={() => trocarAba('pessoas')}>
                  <UserPlus /> Convidar
                </button>
              )}
              <button type="button" className="btn btn-glass btn-icon-only" onClick={copiarLink} aria-label="Copiar link da viagem">
                <Link2 />
              </button>
              <MenuViagem
                podeEditar={podeEditar}
                ehCriador={ehCriador}
                onEditar={() => setEditando(true)}
                onExcluir={() => setExcluindo(true)}
              />
            </div>
          </div>
        </Glass>
      </section>

      <div className="trip-tabs">
        <Segmented<Aba>
          label="Seções da viagem"
          value={aba}
          onChange={trocarAba}
          options={[
            { value: 'roteiro', label: 'Roteiro', icon: <Route aria-hidden /> },
            { value: 'mapa', label: 'Mapa', icon: <MapIcon aria-hidden /> },
            { value: 'orcamento', label: 'Orçamento', icon: <PiggyBank aria-hidden /> },
            { value: 'pessoas', label: 'Pessoas', icon: <Users aria-hidden /> },
          ]}
        />
      </div>

      {aba === 'roteiro' && <AbaRoteiro {...ctx} />}
      {aba === 'mapa' && <AbaMapa {...ctx} />}
      {aba === 'orcamento' && <AbaOrcamento {...ctx} />}
      {aba === 'pessoas' && (
        <AbaPessoas {...ctx} destacarConvite={ehCriador && membros.isSuccess && pessoas.length <= 1} />
      )}

      <ViagemSheet open={editando} onClose={() => setEditando(false)} viagem={v} />
      <ConfirmSheet
        open={excluindo}
        onClose={() => setExcluindo(false)}
        titulo="Excluir esta viagem?"
        confirmar="Excluir viagem"
        carregando={excluir.isPending}
        onConfirmar={() => excluir.mutate()}
      >
        “{v.nome}” será apagada para todos, com roteiro, atividades, orçamento e participantes. Essa
        ação não pode ser desfeita.
      </ConfirmSheet>
    </div>
  );
}
