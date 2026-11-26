import { useCallback, useEffect, useState } from 'react';

export type Tema = 'auto' | 'light' | 'dark';
const KEY = 'viajajunto.tema';

function ler(): Tema {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function aplicarTemaSalvo(): void {
  const tema = ler();
  if (tema === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', tema);
}

function prefereEscuro(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Tema escolhido e tema efetivo (resolvendo "auto" pela preferência do sistema). */
export function useTema() {
  const [tema, setTemaState] = useState<Tema>(ler);
  const [sistemaEscuro, setSistemaEscuro] = useState(prefereEscuro);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSistemaEscuro(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setTemaState(ler()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const setTema = useCallback((novo: Tema) => {
    try {
      if (novo === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, novo);
    } catch {
      // Sem armazenamento: o tema vale só nesta visita.
    }
    if (novo === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', novo);
    setTemaState(novo);
  }, []);

  const escuro = tema === 'dark' || (tema === 'auto' && sistemaEscuro);
  return { tema, setTema, escuro };
}
