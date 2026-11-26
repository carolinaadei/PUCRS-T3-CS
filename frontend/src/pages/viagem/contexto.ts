import type { PerfilViagem, Viagem } from '../../api/types';

/** O que cada aba da viagem precisa saber sobre a viagem e o papel do usuário. */
export interface ContextoViagem {
  viagem: Viagem;
  perfil: PerfilViagem;
  /** Criador e editores alteram roteiro, atividades, orçamento e status. */
  podeEditar: boolean;
  /** Só o criador convida, muda papéis, remove pessoas e exclui a viagem. */
  ehCriador: boolean;
}
