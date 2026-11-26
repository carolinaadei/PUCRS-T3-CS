const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';
const TOKEN_KEY = 'viajajunto.token';

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Armazenamento indisponível (aba privada): a sessão dura até recarregar.
  }
}

/** Erro de API com status HTTP e mensagem pronta para exibir. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

const MENSAGENS_STATUS: Record<number, string> = {
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procura.',
  409: 'Conflito com o estado atual. Atualize e tente de novo.',
  503: 'Serviço temporariamente indisponível. Tente em instantes.',
};

function traduzirValidacao(msg: string): string {
  return msg
    .replace(/^Value error, /, '')
    .replace('Field required', 'Campo obrigatório')
    .replace(/String should have at least (\d+) characters?/, 'Use pelo menos $1 caracteres')
    .replace(/String should have at most (\d+) characters?/, 'Use no máximo $1 caracteres')
    .replace(/Input should be greater than or equal to (\S+)/, 'Informe um valor maior ou igual a $1')
    .replace(/Input should be less than or equal to (\S+)/, 'Informe um valor menor ou igual a $1')
    .replace('value is not a valid email address', 'Email inválido')
    .replace(/Decimal input should have no more than (\d+) decimal places?/, 'Use no máximo $1 casas decimais');
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Corpo vazio ou não-JSON.
  }
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === 'string') {
    return new ApiError(response.status, detail);
  }
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {};
    for (const item of detail as ValidationItem[]) {
      const campo = item.loc?.filter((p) => p !== 'body' && p !== 'query').join('.') ?? '';
      if (campo && item.msg) fields[campo] = traduzirValidacao(item.msg);
    }
    const primeira = Object.values(fields)[0];
    return new ApiError(response.status, primeira ?? 'Verifique os dados informados.', fields);
  }
  return new ApiError(
    response.status,
    MENSAGENS_STATUS[response.status] ?? 'Algo deu errado. Tente novamente.',
  );
}

export type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'Não foi possível conectar à API. Verifique se o backend está rodando.');
  }

  if (!response.ok) {
    const error = await parseError(response);
    if (response.status === 401 && token) {
      setToken(null);
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw error;
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function mensagemDeErro(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Algo deu errado. Tente novamente.';
}
