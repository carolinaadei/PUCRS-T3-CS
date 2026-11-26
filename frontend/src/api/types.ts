// Tipos espelhados dos schemas Pydantic do backend (app/adapters/inbound/api/schemas).
// Decimais chegam como string ("1000.00"); datas como "AAAA-MM-DD"; horários "HH:MM:SS".

export type Decimal = string;
export type ISODate = string;
export type ISODateTime = string;

export type StatusViagem = 'planejando' | 'confirmada' | 'concluida';
export type StatusAtividade = 'pendente' | 'confirmada' | 'concluida' | 'cancelada';
export type PerfilViagem = 'criador' | 'editor' | 'visualizador';
export type PapelMembro = 'editor' | 'visualizador';
export type CategoriaDestino = 'cidade' | 'praia' | 'natureza' | 'cultural';
export type CategoriaAtividade = 'passeio' | 'refeicao' | 'hospedagem' | 'transporte' | 'outro';
export type FonteCatalogo = 'manual' | 'geoapify';
export type TipoNotificacao =
  | 'membro_entrou'
  | 'papel_alterado'
  | 'membro_removido'
  | 'viagem_excluida'
  | 'viagem_alterada'
  | 'roteiro_alterado'
  | 'atividade_alterada';

export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanho_pagina: number;
  tem_proxima: boolean;
}

// Autenticação e usuário
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  criado_em: ISODateTime;
}

// Viagens
export interface Viagem {
  id: number;
  criador_id: number;
  nome: string;
  descricao: string | null;
  data_inicio: ISODate;
  data_fim: ISODate;
  status: StatusViagem;
  criado_em: ISODateTime | null;
  atualizado_em: ISODateTime | null;
}

export interface ItemListaViagem extends Viagem {
  papel_usuario: PerfilViagem;
}

export interface CriarViagemPayload {
  nome: string;
  descricao?: string | null;
  data_inicio: ISODate;
  data_fim: ISODate;
}

export interface AtualizarViagemPayload {
  nome?: string | null;
  descricao?: string | null;
  data_inicio?: ISODate | null;
  data_fim?: ISODate | null;
  status?: StatusViagem | null;
}

// Colaboradores
export interface Membro {
  usuario_id: number;
  nome: string;
  email: string;
  papel: PerfilViagem;
  entrou_em: ISODateTime | null;
}

export interface Convite {
  id: number;
  email: string;
  expira_em: ISODateTime;
  criado_em: ISODateTime | null;
}

// Catálogo
export interface DestinoCatalogo {
  id: number;
  nome: string;
  pais_codigo: string;
  categoria: CategoriaDestino;
  descricao: string | null;
  latitude: Decimal | null;
  longitude: Decimal | null;
  foto_url: string | null;
  id_externo: string | null;
  fonte: FonteCatalogo;
}

export interface Review {
  id: number;
  nota: number;
  comentario: string | null;
  autor_nome: string | null;
  criado_em: ISODateTime;
}

export interface DadosAtividadeCatalogo {
  id: number;
  nome: string;
  descricao: string | null;
  categoria: CategoriaAtividade;
  endereco: string | null;
  latitude: Decimal | null;
  longitude: Decimal | null;
  foto_url: string | null;
  id_externo: string | null;
  fonte: FonteCatalogo;
  destino: DestinoCatalogo;
}

export interface AtividadeCatalogo extends DadosAtividadeCatalogo {
  media_avaliacoes: number | null;
  total_avaliacoes: number;
  reviews: Review[];
}

export interface FiltrosAtividades {
  nome?: string;
  categoria?: CategoriaAtividade;
  localizacao?: string;
  nota_minima?: number;
  destino_catalogo_id?: number;
  pagina?: number;
  tamanho_pagina?: number;
}

export interface FiltrosDestinos {
  nome?: string;
  pais_codigo?: string;
  categoria?: CategoriaDestino;
  pagina?: number;
  tamanho_pagina?: number;
}

export interface DestinoRanqueado {
  posicao: number;
  destino: DestinoCatalogo;
  media_avaliacoes: number;
  nota_ranking: number;
  total_avaliacoes: number;
}

export interface RankingDestinos {
  media_geral: number | null;
  peso_priori: number;
  itens: DestinoRanqueado[];
}

// Roteiro
export interface DestinoViagem {
  id: number;
  viagem_id: number;
  destino_catalogo_id: number;
  destino: DestinoCatalogo;
  ordem: number;
  data_chegada: ISODate;
  data_saida: ISODate;
  descricao: string | null;
  hospedagem: string | null;
}

export interface CriarDestinoPayload {
  destino_catalogo_id: number;
  data_chegada: ISODate;
  data_saida: ISODate;
  descricao?: string | null;
  hospedagem?: string | null;
  ordem?: number | null;
}

export interface AtualizarDestinoPayload {
  data_chegada?: ISODate | null;
  data_saida?: ISODate | null;
  descricao?: string | null;
  hospedagem?: string | null;
}

export interface AtividadeViagem {
  id: number;
  viagem_id: number;
  destino_viagem_id: number;
  catalogo_atividade_id: number;
  atividade: DadosAtividadeCatalogo;
  data: ISODate;
  hora_inicio: string | null;
  duracao_minutos: number | null;
  custo_previsto: Decimal;
  status: StatusAtividade;
  realizada_em: ISODateTime | null;
  realizada_por_id: number | null;
}

export interface CriarAtividadePayload {
  catalogo_atividade_id: number;
  data: ISODate;
  hora_inicio?: string | null;
  duracao_minutos?: number | null;
  custo_previsto?: string;
  status?: Exclude<StatusAtividade, 'cancelada'>;
}

export interface AtualizarAtividadePayload {
  data?: ISODate | null;
  hora_inicio?: string | null;
  duracao_minutos?: number | null;
  custo_previsto?: string | null;
  status?: Exclude<StatusAtividade, 'cancelada'> | null;
}

// Orçamento
export interface ResumoCategoria {
  categoria: CategoriaAtividade;
  total_planejado: Decimal;
  percentual_orcamento: Decimal | null;
  percentual_planejado: Decimal | null;
}

export interface ResumoFinanceiro {
  viagem_id: number;
  orcamento_total: Decimal | null;
  total_planejado: Decimal;
  saldo_disponivel: Decimal | null;
  percentual_consumido: Decimal | null;
  orcamento_excedido: boolean;
  categorias: ResumoCategoria[];
}

// Mapa
export interface PaisVisitado {
  pais_codigo: string;
  primeira_visita: ISODate;
  ultima_visita: ISODate;
  total_viagens: number;
}

export interface PaisesVisitados {
  total: number;
  paises: PaisVisitado[];
}

export interface PontoMapa {
  parada_id: number;
  destino_catalogo_id: number;
  ordem: number;
  nome: string;
  pais_codigo: string;
  latitude: number | null;
  longitude: number | null;
  data_chegada: ISODate;
  data_saida: ISODate;
}

export interface MapaViagem {
  viagem_id: number;
  paradas: PontoMapa[];
}

// Notificações
export interface Notificacao {
  id: number;
  tipo: TipoNotificacao;
  mensagem: string;
  viagem_id: number | null;
  ator_id: number | null;
  lida: boolean;
  lida_em: ISODateTime | null;
  criado_em: ISODateTime;
}

export interface PaginaNotificacoes extends Pagina<Notificacao> {
  nao_lidas: number;
}
