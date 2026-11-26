import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleCheck, KeyRound, Lock, Mail, TriangleExclamationPoint, User } from 'lucide-react';
import { ApiError, mensagemDeErro } from '../api/client';
import { authApi } from '../api/endpoints';
import { Field, Glass, LoadingButton } from '../components/ui';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { resolverFoto, unsplash } from '../utils/featured';

const FOTO_AUTH = resolverFoto(unsplash('1570077188670-e3a8d69ac5ff', 1200, 1500)) ?? undefined;

function AuthShell({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-visual" aria-hidden>
        <img src={FOTO_AUTH} alt="" />
        <Glass className="auth-visual-caption">
          <p className="title-3">“Viajar junto começa muito antes do embarque.”</p>
          <p className="footnote" style={{ opacity: 0.8, marginTop: 6 }}>
            Santorini, Grécia
          </p>
        </Glass>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card stack gap-5">
          <div className="stack gap-2">
            <h1 className="title-1">{titulo}</h1>
            <p className="secondary">{subtitulo}</p>
          </div>
          {children}
          {rodape && <div className="subhead secondary">{rodape}</div>}
        </div>
      </div>
    </div>
  );
}

function ErroForm({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <div className="alert alert-danger" role="alert">
      <TriangleExclamationPoint aria-hidden />
      <span>{erro}</span>
    </div>
  );
}

function useDestino(): string {
  const location = useLocation();
  return (location.state as { from?: string } | null)?.from ?? '/viagens';
}

export function Entrar() {
  const { entrar, usuario } = useAuth();
  const navigate = useNavigate();
  const destino = useDestino();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={destino} replace />;

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      navigate(destino, { replace: true });
    } catch (e) {
      setErro(
        e instanceof ApiError && e.status === 401 ? 'Email ou senha incorretos.' : mensagemDeErro(e),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthShell
      titulo="Bem-vindo de volta"
      subtitulo="Entre para continuar planejando suas viagens."
      rodape={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" state={{ from: destino }}>
            Criar conta
          </Link>
        </>
      }
    >
      <form className="stack gap-4" onSubmit={enviar} noValidate>
        <ErroForm erro={erro} />
        <Field label="Email">
          {(p) => (
            <div className="input-icon">
              <Mail aria-hidden />
              <input
                {...p}
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
        </Field>
        <Field label="Senha">
          {(p) => (
            <div className="input-icon">
              <Lock aria-hidden />
              <input
                {...p}
                className="input"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          )}
        </Field>
        <div className="row between">
          <Link to="/recuperar-senha" className="subhead">
            Esqueci minha senha
          </Link>
        </div>
        <LoadingButton
          type="submit"
          className="btn btn-primary btn-lg btn-block"
          loading={enviando}
          disabled={!email || !senha}
        >
          Entrar
        </LoadingButton>
        {import.meta.env.DEV && (
          <button
            type="button"
            className="btn btn-gray btn-sm"
            onClick={() => {
              setEmail('criador.demo@example.com');
              setSenha('DemoViaja123!');
            }}
          >
            Preencher com a conta de demonstração do seed
          </button>
        )}
      </form>
    </AuthShell>
  );
}

export function Cadastro() {
  const { cadastrar, usuario } = useAuth();
  const navigate = useNavigate();
  const destino = useDestino();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={destino} replace />;

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    setCampos({});
    if (senha.length < 8) {
      setCampos({ senha: 'Use pelo menos 8 caracteres.' });
      return;
    }
    setEnviando(true);
    try {
      await cadastrar(nome.trim(), email.trim(), senha);
      navigate(destino, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) setCampos(e.fields);
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthShell
      titulo="Crie sua conta"
      subtitulo="Leva menos de um minuto. Depois é só chamar quem vai junto."
      rodape={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" state={{ from: destino }}>
            Entrar
          </Link>
        </>
      }
    >
      <form className="stack gap-4" onSubmit={enviar} noValidate>
        <ErroForm erro={erro} />
        <Field label="Nome" error={campos.nome}>
          {(p) => (
            <div className="input-icon">
              <User aria-hidden />
              <input
                {...p}
                className="input"
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
          )}
        </Field>
        <Field label="Email" error={campos.email}>
          {(p) => (
            <div className="input-icon">
              <Mail aria-hidden />
              <input
                {...p}
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
        </Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres." error={campos.senha}>
          {(p) => (
            <div className="input-icon">
              <Lock aria-hidden />
              <input
                {...p}
                className="input"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={8}
                required
              />
            </div>
          )}
        </Field>
        <LoadingButton
          type="submit"
          className="btn btn-brand btn-lg btn-block"
          loading={enviando}
          disabled={!nome.trim() || !email || !senha}
        >
          Criar conta
        </LoadingButton>
      </form>
    </AuthShell>
  );
}

export function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await authApi.recuperarSenha(email.trim());
      setEnviado(r.detail);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthShell
      titulo="Recuperar senha"
      subtitulo="Enviaremos um link para você criar uma nova senha."
      rodape={<Link to="/entrar">Voltar para o login</Link>}
    >
      {enviado ? (
        <div className="alert alert-success" role="status">
          <CircleCheck aria-hidden />
          <span>{enviado} O link vale por 60 minutos.</span>
        </div>
      ) : (
        <form className="stack gap-4" onSubmit={enviar} noValidate>
          <ErroForm erro={erro} />
          <Field label="Email da conta">
            {(p) => (
              <div className="input-icon">
                <Mail aria-hidden />
                <input
                  {...p}
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
          </Field>
          <LoadingButton
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            loading={enviando}
            disabled={!email}
          >
            Enviar link
          </LoadingButton>
        </form>
      )}
    </AuthShell>
  );
}

export function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const { encerrarLocalmente } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (senha.length < 8) return setErro('Use pelo menos 8 caracteres.');
    if (senha !== confirmacao) return setErro('As senhas não coincidem.');
    setEnviando(true);
    try {
      await authApi.redefinirSenha(token, senha);
      // A API encerra todas as sessões do usuário ao redefinir a senha.
      encerrarLocalmente();
      toast.sucesso('Senha redefinida. Entre com a nova senha.');
      navigate('/entrar', { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        titulo="Link incompleto"
        subtitulo="Abra o link exatamente como chegou no seu email, ou peça um novo."
        rodape={<Link to="/recuperar-senha">Pedir um novo link</Link>}
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo="Nova senha"
      subtitulo="Escolha uma senha nova. Por segurança, todas as sessões abertas serão encerradas."
      rodape={<Link to="/entrar">Voltar para o login</Link>}
    >
      <form className="stack gap-4" onSubmit={enviar} noValidate>
        <ErroForm erro={erro} />
        <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
          {(p) => (
            <div className="input-icon">
              <KeyRound aria-hidden />
              <input
                {...p}
                className="input"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          )}
        </Field>
        <Field label="Confirme a nova senha">
          {(p) => (
            <div className="input-icon">
              <KeyRound aria-hidden />
              <input
                {...p}
                className="input"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
              />
            </div>
          )}
        </Field>
        <LoadingButton
          type="submit"
          className="btn btn-primary btn-lg btn-block"
          loading={enviando}
          disabled={!senha || !confirmacao}
        >
          Salvar nova senha
        </LoadingButton>
      </form>
    </AuthShell>
  );
}
