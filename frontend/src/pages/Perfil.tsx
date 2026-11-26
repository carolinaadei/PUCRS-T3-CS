import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Globe, KeyRound, Trash, TriangleExclamationPoint, User } from 'lucide-react';
import { ApiError, mensagemDeErro } from '../api/client';
import { usuarioApi } from '../api/endpoints';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { VisitedGlobe } from '../components/globe';
import { Avatar, Field, Glass, LoadingButton } from '../components/ui';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { countryName, formatDate, formatLongDate } from '../utils/format';
import { useDocumentTitle } from '../utils/hooks';

function DadosConta() {
  const { usuario, atualizarUsuario } = useAuth();
  const toast = useToast();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [campos, setCampos] = useState<Record<string, string>>({});

  useEffect(() => {
    setNome(usuario?.nome ?? '');
    setEmail(usuario?.email ?? '');
  }, [usuario]);

  const salvar = useMutation({
    mutationFn: () => usuarioApi.atualizar({ nome: nome.trim(), email: email.trim() }),
    onSuccess: (u) => {
      atualizarUsuario(u);
      toast.sucesso('Dados atualizados.');
    },
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fields).length) setCampos(e.fields);
      else toast.erro(e);
    },
  });

  const mudou = nome.trim() !== usuario?.nome || email.trim() !== usuario?.email;

  return (
    <Glass className="card-pad stack gap-4">
      <h2 className="headline row gap-2">
        <User size={18} aria-hidden /> Seus dados
      </h2>
      <form
        className="stack gap-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setCampos({});
          salvar.mutate();
        }}
        noValidate
      >
        <Field label="Nome" error={campos.nome}>
          {(p) => <input {...p} className="input" value={nome} onChange={(e) => setNome(e.target.value)} />}
        </Field>
        <Field label="Email" error={campos.email}>
          {(p) => (
            <input {...p} type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>
        <LoadingButton
          type="submit"
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
          loading={salvar.isPending}
          disabled={!mudou || !nome.trim()}
        >
          Salvar alterações
        </LoadingButton>
      </form>
    </Glass>
  );
}

function TrocarSenha() {
  const { encerrarLocalmente } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const trocar = useMutation({
    mutationFn: () => usuarioApi.alterarSenha(atual, nova),
    onSuccess: () => {
      // A API encerra todas as sessões, inclusive esta.
      encerrarLocalmente();
      toast.sucesso('Senha alterada. Entre de novo com a nova senha.');
      navigate('/entrar', { replace: true });
    },
    onError: (e) => setErro(e instanceof ApiError && e.status === 400 ? 'Senha atual incorreta.' : mensagemDeErro(e)),
  });

  return (
    <Glass className="card-pad stack gap-4">
      <h2 className="headline row gap-2">
        <KeyRound size={18} aria-hidden /> Senha
      </h2>
      <form
        className="stack gap-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setErro(null);
          if (nova.length < 8) return setErro('A nova senha precisa de pelo menos 8 caracteres.');
          trocar.mutate();
        }}
        noValidate
      >
        {erro && (
          <div className="alert alert-danger" role="alert">
            <TriangleExclamationPoint aria-hidden />
            <span>{erro}</span>
          </div>
        )}
        <div className="form-grid">
          <Field label="Senha atual">
            {(p) => (
              <input
                {...p}
                type="password"
                autoComplete="current-password"
                className="input"
                value={atual}
                onChange={(e) => setAtual(e.target.value)}
              />
            )}
          </Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
            {(p) => (
              <input
                {...p}
                type="password"
                autoComplete="new-password"
                className="input"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
              />
            )}
          </Field>
        </div>
        <p className="footnote tertiary">Ao trocar a senha, todas as suas sessões são encerradas.</p>
        <LoadingButton
          type="submit"
          className="btn btn-gray"
          style={{ alignSelf: 'flex-start' }}
          loading={trocar.isPending}
          disabled={!atual || !nova}
        >
          Alterar senha
        </LoadingButton>
      </form>
    </Glass>
  );
}

function ExcluirConta() {
  const { encerrarLocalmente } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);

  const excluir = useMutation({
    mutationFn: usuarioApi.excluir,
    onSuccess: () => {
      encerrarLocalmente();
      toast.sucesso('Sua conta foi excluída.');
      navigate('/', { replace: true });
    },
    onError: (e) => {
      setAberto(false);
      toast.erro(
        e instanceof ApiError && e.status === 409
          ? 'Você organiza viagens com outras pessoas. Remova os participantes ou exclua essas viagens antes.'
          : e,
      );
    },
  });

  return (
    <Glass className="card-pad stack gap-3">
      <h2 className="headline row gap-2 text-danger">
        <Trash size={18} aria-hidden /> Excluir conta
      </h2>
      <p className="subhead secondary">
        Suas viagens sem outros participantes são apagadas e você sai das viagens de outras pessoas.
        Suas avaliações continuam públicas, sem o seu nome.
      </p>
      <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={() => setAberto(true)}>
        Excluir minha conta
      </button>
      <ConfirmSheet
        open={aberto}
        onClose={() => setAberto(false)}
        titulo="Excluir sua conta?"
        confirmar="Excluir conta"
        carregando={excluir.isPending}
        onConfirmar={() => excluir.mutate()}
      >
        Essa ação não pode ser desfeita.
      </ConfirmSheet>
    </Glass>
  );
}

export default function Perfil() {
  useDocumentTitle('Perfil');
  const { usuario } = useAuth();
  const paises = useQuery({ queryKey: ['paises-visitados'], queryFn: usuarioApi.paisesVisitados });
  if (!usuario) return null;
  const lista = paises.data?.paises ?? [];

  return (
    <div className="page container">
      <header className="profile-head">
        <Avatar name={usuario.nome} seed={usuario.id} size={84} />
        <div className="stack gap-1">
          <h1 className="title-1">{usuario.nome}</h1>
          <p className="secondary">
            {usuario.email} · desde {formatLongDate(usuario.criado_em.slice(0, 10))}
          </p>
        </div>
      </header>

      <section className="profile-globe-card">
        <Glass lg className="profile-globe">
          <div className="profile-globe-copy stack gap-3">
            <span className="eyebrow">Seu mapa</span>
            <h2 className="title-1">
              {paises.data ? (
                <>
                  <span className="gradient-text tabular">{paises.data.total}</span>{' '}
                  {paises.data.total === 1 ? 'país visitado' : 'países visitados'}
                </>
              ) : (
                'Países visitados'
              )}
            </h2>
            <p className="secondary subhead">
              Contamos paradas de viagens confirmadas ou concluídas cuja data de chegada já passou.
            </p>
            {lista.length > 0 ? (
              <ul className="country-list">
                {lista.map((p) => (
                  <li key={p.pais_codigo}>
                    <strong className="subhead">{countryName(p.pais_codigo)}</strong>
                    <span className="footnote secondary">
                      {p.total_viagens} {p.total_viagens === 1 ? 'viagem' : 'viagens'} · desde{' '}
                      {formatDate(p.primeira_visita, true)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              paises.isSuccess && (
                <p className="subhead row gap-2">
                  <Globe size={16} aria-hidden className="secondary" /> Seu primeiro carimbo aparece
                  aqui depois da viagem.
                </p>
              )
            )}
          </div>
          <div className="profile-globe-canvas">
            <Suspense fallback={<div className="globe-placeholder" style={{ width: 320 }} />}>
              <VisitedGlobe paises={lista} altura={440} />
            </Suspense>
          </div>
        </Glass>
      </section>

      <div className="profile-grid">
        <DadosConta />
        <TrocarSenha />
        <ExcluirConta />
      </div>
    </div>
  );
}
