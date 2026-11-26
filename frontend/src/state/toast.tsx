import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, Info, TriangleExclamationPoint } from 'lucide-react';
import { Glass } from '../components/ui';
import { mensagemDeErro } from '../api/client';

type Tipo = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tipo: Tipo;
  mensagem: string;
}

interface ToastApi {
  sucesso: (mensagem: string) => void;
  erro: (erroOuMensagem: unknown) => void;
  info: (mensagem: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONES: Record<Tipo, ReactNode> = {
  success: <CircleCheck aria-hidden />,
  error: <TriangleExclamationPoint aria-hidden />,
  info: <Info aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const mostrar = useCallback((tipo: Tipo, mensagem: string) => {
    const id = ++seq.current;
    setItens((atual) => [...atual.slice(-2), { id, tipo, mensagem }]);
    window.setTimeout(() => setItens((atual) => atual.filter((t) => t.id !== id)), 4200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      sucesso: (m) => mostrar('success', m),
      erro: (e) => mostrar('error', typeof e === 'string' ? e : mensagemDeErro(e)),
      info: (m) => mostrar('info', m),
    }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite" aria-atomic="false">
          {itens.map((t) => (
            <Glass key={t.id} strong lg className={`toast toast-${t.tipo}`} role="status">
              {ICONES[t.tipo]}
              <span>{t.mensagem}</span>
            </Glass>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}
