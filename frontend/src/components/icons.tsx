import { BedDouble, Bus, Heart, Sparkles, Ticket, User, Users, Utensils, type LucideIcon } from 'lucide-react';
import type { CategoriaAtividade } from '../api/types';
import type { TipoViagem } from '../utils/labels';

/** Tipos de atividade são identificados por ícone + texto, nunca só por cor. */
export const ICONE_CATEGORIA: Record<CategoriaAtividade, LucideIcon> = {
  passeio: Ticket,
  refeicao: Utensils,
  hospedagem: BedDouble,
  transporte: Bus,
  outro: Sparkles,
};

export const ICONE_TIPO_VIAGEM: Record<TipoViagem, LucideIcon> = {
  individual: User,
  amigos: Users,
  familia: Heart,
};
