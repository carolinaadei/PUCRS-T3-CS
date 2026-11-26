import { request } from './client';
import type {
  AtividadeCatalogo,
  AtividadeViagem,
  AtualizarAtividadePayload,
  AtualizarDestinoPayload,
  AtualizarViagemPayload,
  Convite,
  CriarAtividadePayload,
  CriarDestinoPayload,
  CriarViagemPayload,
  DestinoCatalogo,
  DestinoViagem,
  FiltrosAtividades,
  FiltrosDestinos,
  ItemListaViagem,
  MapaViagem,
  Membro,
  PapelMembro,
  Pagina,
  PaginaNotificacoes,
  PaisesVisitados,
  RankingDestinos,
  ResumoFinanceiro,
  Review,
  TokenResponse,
  Usuario,
  Viagem,
} from './types';

export const authApi = {
  login: (email: string, senha: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: { email, senha }, auth: false }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  recuperarSenha: (email: string) =>
    request<{ detail: string }>('/auth/recuperar-senha', {
      method: 'POST',
      body: { email },
      auth: false,
    }),
  redefinirSenha: (token: string, senha_nova: string) =>
    request<void>('/auth/redefinir-senha', {
      method: 'POST',
      body: { token, senha_nova },
      auth: false,
    }),
};

export const usuarioApi = {
  cadastrar: (nome: string, email: string, senha: string) =>
    request<Usuario>('/usuarios', { method: 'POST', body: { nome, email, senha }, auth: false }),
  me: () => request<Usuario>('/usuarios/me'),
  atualizar: (dados: { nome?: string; email?: string }) =>
    request<Usuario>('/usuarios/me', { method: 'PATCH', body: dados }),
  alterarSenha: (senha_atual: string, senha_nova: string) =>
    request<void>('/usuarios/me/senha', { method: 'PATCH', body: { senha_atual, senha_nova } }),
  excluir: () => request<void>('/usuarios/me', { method: 'DELETE' }),
  paisesVisitados: () => request<PaisesVisitados>('/usuarios/me/paises-visitados'),
};

export const viagemApi = {
  listar: (pagina = 1, tamanho_pagina = 50) =>
    request<Pagina<ItemListaViagem>>('/viagens', { query: { pagina, tamanho_pagina } }),
  consultar: (id: number) => request<Viagem>(`/viagens/${id}`),
  criar: (dados: CriarViagemPayload) =>
    request<Viagem>('/viagens', { method: 'POST', body: dados }),
  atualizar: (id: number, dados: AtualizarViagemPayload) =>
    request<Viagem>(`/viagens/${id}`, { method: 'PATCH', body: dados }),
  excluir: (id: number) => request<void>(`/viagens/${id}`, { method: 'DELETE' }),
  mapa: (id: number) => request<MapaViagem>(`/viagens/${id}/mapa`),
};

export const membrosApi = {
  listar: (viagemId: number) => request<Membro[]>(`/viagens/${viagemId}/membros`),
  alterarPapel: (viagemId: number, usuarioId: number, papel: PapelMembro) =>
    request<Membro>(`/viagens/${viagemId}/membros/${usuarioId}`, {
      method: 'PATCH',
      body: { papel },
    }),
  remover: (viagemId: number, usuarioId: number) =>
    request<void>(`/viagens/${viagemId}/membros/${usuarioId}`, { method: 'DELETE' }),
  convites: (viagemId: number) => request<Convite[]>(`/viagens/${viagemId}/convites`),
  convidar: (viagemId: number, email: string) =>
    request<Convite>(`/viagens/${viagemId}/convites`, { method: 'POST', body: { email } }),
  cancelarConvite: (viagemId: number, conviteId: number) =>
    request<void>(`/viagens/${viagemId}/convites/${conviteId}`, { method: 'DELETE' }),
  aceitar: (token: string) =>
    request<ItemListaViagem>('/viagens/convites/aceitar', { method: 'POST', body: { token } }),
};

export const roteiroApi = {
  listar: (viagemId: number) => request<DestinoViagem[]>(`/viagens/${viagemId}/destinos`),
  criar: (viagemId: number, dados: CriarDestinoPayload) =>
    request<DestinoViagem>(`/viagens/${viagemId}/destinos`, { method: 'POST', body: dados }),
  atualizar: (viagemId: number, destinoId: number, dados: AtualizarDestinoPayload) =>
    request<DestinoViagem>(`/viagens/${viagemId}/destinos/${destinoId}`, {
      method: 'PATCH',
      body: dados,
    }),
  remover: (viagemId: number, destinoId: number) =>
    request<void>(`/viagens/${viagemId}/destinos/${destinoId}`, { method: 'DELETE' }),
  reordenar: (viagemId: number, destinos_ids: number[]) =>
    request<DestinoViagem[]>(`/viagens/${viagemId}/destinos/ordem`, {
      method: 'PUT',
      body: { destinos_ids },
    }),
};

export const atividadesApi = {
  listar: (viagemId: number, destinoId: number) =>
    request<AtividadeViagem[]>(`/viagens/${viagemId}/destinos/${destinoId}/atividades`),
  criar: (viagemId: number, destinoId: number, dados: CriarAtividadePayload) =>
    request<AtividadeViagem>(`/viagens/${viagemId}/destinos/${destinoId}/atividades`, {
      method: 'POST',
      body: dados,
    }),
  atualizar: (
    viagemId: number,
    destinoId: number,
    atividadeId: number,
    dados: AtualizarAtividadePayload,
  ) =>
    request<AtividadeViagem>(
      `/viagens/${viagemId}/destinos/${destinoId}/atividades/${atividadeId}`,
      { method: 'PATCH', body: dados },
    ),
  remover: (viagemId: number, destinoId: number, atividadeId: number) =>
    request<void>(`/viagens/${viagemId}/destinos/${destinoId}/atividades/${atividadeId}`, {
      method: 'DELETE',
    }),
  avaliar: (
    viagemId: number,
    destinoId: number,
    atividadeId: number,
    nota: number,
    comentario: string | null,
  ) =>
    request<Review>(
      `/viagens/${viagemId}/destinos/${destinoId}/atividades/${atividadeId}/avaliacao`,
      { method: 'PUT', body: { nota, comentario } },
    ),
};

export const orcamentoApi = {
  consultar: (viagemId: number) => request<ResumoFinanceiro>(`/viagens/${viagemId}/orcamento`),
  definir: (viagemId: number, valor_total: string) =>
    request<ResumoFinanceiro>(`/viagens/${viagemId}/orcamento`, {
      method: 'PUT',
      body: { valor_total },
    }),
};

export const catalogoApi = {
  destinos: (filtros: FiltrosDestinos = {}) =>
    request<Pagina<DestinoCatalogo>>('/catalogo/destinos', {
      query: { ...filtros },
      auth: false,
    }),
  destino: (id: number) => request<DestinoCatalogo>(`/catalogo/destinos/${id}`, { auth: false }),
  ranking: (limite = 10) =>
    request<RankingDestinos>('/catalogo/destinos/ranking', { query: { limite }, auth: false }),
  atividades: (filtros: FiltrosAtividades = {}) =>
    request<Pagina<AtividadeCatalogo>>('/catalogo/atividades', {
      query: { ...filtros },
      auth: false,
    }),
  atividade: (id: number) =>
    request<AtividadeCatalogo>(`/catalogo/atividades/${id}`, { auth: false }),
  avaliacoes: (id: number, pagina = 1, tamanho_pagina = 20) =>
    request<Pagina<Review>>(`/catalogo/atividades/${id}/avaliacoes`, {
      query: { pagina, tamanho_pagina },
      auth: false,
    }),
};

export const notificacoesApi = {
  listar: (pagina = 1, tamanho_pagina = 20, nao_lidas = false) =>
    request<PaginaNotificacoes>('/notificacoes', { query: { pagina, tamanho_pagina, nao_lidas } }),
  contagem: () => request<{ nao_lidas: number }>('/notificacoes/nao-lidas/contagem'),
  marcarLida: (id: number) => request<unknown>(`/notificacoes/${id}/lida`, { method: 'PATCH' }),
  marcarTodas: () =>
    request<{ marcadas: number }>('/notificacoes/marcar-todas-lidas', { method: 'POST' }),
};
