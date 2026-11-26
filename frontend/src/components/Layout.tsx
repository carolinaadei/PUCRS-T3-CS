import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, LogOut, Moon, Plane, Sun, SunMoon, User } from 'lucide-react';
import { useAuth } from '../state/auth';
import { useTema, type Tema } from '../state/theme';
import { NotificationsBell } from './Notifications';
import { Avatar, Glass, PageLoader, useDismiss } from './ui';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="logo" aria-label="ViajaJunto — início">
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0a84ff" />
            <stop offset="1" stopColor="#1fbf6a" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#logo-g)" />
        <circle cx="32" cy="32" r="15" fill="none" stroke="#fff" strokeWidth="3.5" />
        <path
          d="M17 32h30M32 17c-5 4.5-7 9.5-7 15s2 10.5 7 15c5-4.5 7-9.5 7-15s-2-10.5-7-15z"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && <span>ViajaJunto</span>}
    </Link>
  );
}

const TEMAS: { valor: Tema; label: string; icone: ReactNode }[] = [
  { valor: 'auto', label: 'Automático', icone: <SunMoon /> },
  { valor: 'light', label: 'Claro', icone: <Sun /> },
  { valor: 'dark', label: 'Escuro', icone: <Moon /> },
];

function UserMenu() {
  const { usuario, sair } = useAuth();
  const { tema, setTema } = useTema();
  const [aberto, setAberto] = useState(false);
  const ref = useDismiss<HTMLDivElement>(aberto, () => setAberto(false));
  const navigate = useNavigate();
  if (!usuario) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="avatar-btn"
        aria-label="Menu da conta"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <Avatar name={usuario.nome} seed={usuario.id} size={34} />
      </button>
      {aberto && (
        <Glass strong lg className="popover menu" role="menu">
          <div className="stack" style={{ padding: '10px 12px 8px' }}>
            <span className="headline truncate">{usuario.nome}</span>
            <span className="footnote secondary truncate">{usuario.email}</span>
          </div>
          <div className="menu-sep" />
          <Link to="/perfil" className="menu-item" role="menuitem" onClick={() => setAberto(false)}>
            <User /> Perfil e países
          </Link>
          <Link to="/viagens" className="menu-item" role="menuitem" onClick={() => setAberto(false)}>
            <Plane /> Minhas viagens
          </Link>
          <div className="menu-sep" />
          <div className="stack gap-1" style={{ padding: '4px 12px 8px' }}>
            <span className="caption tertiary">Aparência</span>
            <div className="segmented" role="group" aria-label="Aparência" style={{ width: '100%' }}>
              {TEMAS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  aria-pressed={tema === t.valor}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => setTema(t.valor)}
                  style={{ flex: 1, justifyContent: 'center', padding: 0 }}
                >
                  {t.icone}
                </button>
              ))}
            </div>
          </div>
          <div className="menu-sep" />
          <button
            type="button"
            className="menu-item danger"
            role="menuitem"
            onClick={async () => {
              setAberto(false);
              await sair();
              navigate('/');
            }}
          >
            <LogOut /> Sair
          </button>
        </Glass>
      )}
    </div>
  );
}

export function Nav() {
  const { usuario } = useAuth();
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav-wrap ${rolou ? 'is-scrolled' : ''}`}>
      <Glass as="nav" className="nav" aria-label="Principal">
        <Logo />
        <div className="nav-links">
          <NavLink to="/explorar" className="nav-link">
            <Compass aria-hidden /> <span>Explorar</span>
          </NavLink>
          {usuario && (
            <NavLink to="/viagens" className="nav-link">
              <Plane aria-hidden /> <span>Minhas viagens</span>
            </NavLink>
          )}
        </div>
        <div className="nav-actions">
          {usuario ? (
            <>
              <NotificationsBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/entrar" className="btn btn-plain btn-sm nav-hide-sm">
                Entrar
              </Link>
              <Link to="/cadastro" className="btn btn-primary btn-sm">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </Glass>
    </header>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <>
      <div className="ambient" aria-hidden>
        <span />
      </div>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <Nav />
      <main id="conteudo">
        <Outlet />
      </main>
    </>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const location = useLocation();
  if (carregando) return <PageLoader />;
  if (!usuario) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
