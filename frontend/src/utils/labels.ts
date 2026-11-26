import type {
  CategoriaAtividade,
  CategoriaDestino,
  PerfilViagem,
  StatusAtividade,
  StatusViagem,
} from '../api/types';

export const STATUS_VIAGEM: Record<StatusViagem, { label: string; chip: string }> = {
  planejando: { label: 'Planejando', chip: 'chip-blue' },
  confirmada: { label: 'Confirmada', chip: 'chip-green' },
  concluida: { label: 'Concluída', chip: '' },
};

export const STATUS_ATIVIDADE: Record<StatusAtividade, { label: string; chip: string }> = {
  pendente: { label: 'Pendente', chip: 'chip-warning' },
  confirmada: { label: 'Confirmada', chip: 'chip-blue' },
  concluida: { label: 'Concluída', chip: 'chip-green' },
  cancelada: { label: 'Cancelada', chip: 'chip-danger' },
};

export const PROXIMO_STATUS_ATIVIDADE: Record<
  StatusAtividade,
  Exclude<StatusAtividade, 'cancelada'>
> = {
  pendente: 'confirmada',
  confirmada: 'concluida',
  concluida: 'pendente',
  cancelada: 'pendente',
};

export const PERFIL: Record<PerfilViagem, { label: string; descricao: string }> = {
  criador: { label: 'Organizador', descricao: 'Criou a viagem e gerencia quem participa.' },
  editor: { label: 'Editor', descricao: 'Edita roteiro, atividades e orçamento.' },
  visualizador: { label: 'Visualizador', descricao: 'Acompanha o roteiro e avalia atividades.' },
};

export const CATEGORIA_DESTINO: Record<CategoriaDestino, string> = {
  cidade: 'Cidade',
  praia: 'Praia',
  natureza: 'Natureza',
  cultural: 'Cultural',
};

export const CATEGORIA_ATIVIDADE: Record<CategoriaAtividade, string> = {
  passeio: 'Passeio',
  refeicao: 'Refeição',
  hospedagem: 'Hospedagem',
  transporte: 'Transporte',
  outro: 'Outro',
};

/** Como a viagem foi pensada. O backend não guarda este dado; fica neste navegador. */
export type TipoViagem = 'individual' | 'amigos' | 'familia';

export const TIPO_VIAGEM: Record<TipoViagem, { label: string; descricao: string }> = {
  individual: { label: 'Individual', descricao: 'Só você, no seu ritmo.' },
  amigos: { label: 'Amigos', descricao: 'Roteiro dividido com a turma.' },
  familia: { label: 'Família', descricao: 'Todo mundo junto, do avô ao caçula.' },
};

const TIPO_KEY = 'viajajunto.tipos';

export function lerTiposViagem(): Record<string, TipoViagem> {
  try {
    return JSON.parse(localStorage.getItem(TIPO_KEY) ?? '{}') as Record<string, TipoViagem>;
  } catch {
    return {};
  }
}

export function salvarTipoViagem(viagemId: number, tipo: TipoViagem): void {
  try {
    const tipos = lerTiposViagem();
    tipos[String(viagemId)] = tipo;
    localStorage.setItem(TIPO_KEY, JSON.stringify(tipos));
  } catch {
    // Sem armazenamento local, o tipo só não aparece nos cartões.
  }
}
