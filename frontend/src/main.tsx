import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import './styles/glass.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/globe.css';
import './styles/pages.css';
import './styles/trips.css';
import { ApiError } from './api/client';
import { AuthProvider } from './state/auth';
import { ToastProvider } from './state/toast';
import { aplicarTemaSalvo } from './state/theme';
import App from './App';

aplicarTemaSalvo();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (falhas, erro) =>
        !(erro instanceof ApiError && erro.status >= 400 && erro.status < 500) && falhas < 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
