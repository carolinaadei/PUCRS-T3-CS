import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken, onUnauthorized, setToken } from '../api/client';
import { authApi, usuarioApi } from '../api/endpoints';
import type { Usuario } from '../api/types';

interface AuthState {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<Usuario>;
  sair: () => Promise<void>;
  /** Limpa a sessão local sem chamar a API (ex.: após trocar a senha). */
  encerrarLocalmente: () => void;
  atualizarUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState<boolean>(() => Boolean(getToken()));

  const encerrarLocalmente = useCallback(() => {
    setToken(null);
    setUsuario(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    if (!getToken()) return;
    let ativo = true;
    usuarioApi
      .me()
      .then((u) => ativo && setUsuario(u))
      .catch(() => ativo && setToken(null))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        setUsuario(null);
        queryClient.clear();
      }),
    [queryClient],
  );

  const entrar = useCallback(async (email: string, senha: string) => {
    const { access_token } = await authApi.login(email, senha);
    setToken(access_token);
    try {
      const u = await usuarioApi.me();
      setUsuario(u);
      return u;
    } catch (error) {
      setToken(null);
      throw error;
    }
  }, []);

  const cadastrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      await usuarioApi.cadastrar(nome, email, senha);
      return entrar(email, senha);
    },
    [entrar],
  );

  const sair = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Token já inválido: basta limpar a sessão local.
    }
    encerrarLocalmente();
  }, [encerrarLocalmente]);

  const value = useMemo<AuthState>(
    () => ({
      usuario,
      carregando,
      entrar,
      cadastrar,
      sair,
      encerrarLocalmente,
      atualizarUsuario: setUsuario,
    }),
    [usuario, carregando, entrar, cadastrar, sair, encerrarLocalmente],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
