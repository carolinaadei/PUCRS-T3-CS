import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { tripadvisor } from './server/tripadvisor';

// O backend (FastAPI) não habilita CORS. Em desenvolvimento, o Vite atende o
// frontend e repassa /api/* para a API na mesma origem, sem alterar o backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

  return {
    plugins: [
      react(),
      // Avaliações do Tripadvisor: a chave fica no servidor (sem prefixo VITE_,
      // portanto nunca vai para o navegador).
      tripadvisor({
        chave: env.TRIPADVISOR_API_KEY || undefined,
        baseUrl: env.TRIPADVISOR_BASE_URL || undefined,
        pastaCache: path.resolve(process.cwd(), '.cache'),
      }),
    ],
    server: {
      // O backend gera links de convite e de redefinição de senha para :3000.
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      // O único pedaço grande é o do globo (three.js + H3), carregado sob demanda
      // com React.lazy; o bundle principal fica em ~105 kB gzip.
      chunkSizeWarningLimit: 2200,
    },
  };
});
