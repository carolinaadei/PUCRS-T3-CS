import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import {
  buscarNotasTripadvisor,
  TripadvisorIndisponivel,
  type ItemTripadvisor,
} from '../api/tripadvisor';

/**
 * Notas da Tripadvisor para vários itens numa única chamada. Ficam só em memória
 * enquanto a página está aberta: a política da Tripadvisor proíbe armazená-las.
 */
export function useNotasTripadvisor(itens: ItemTripadvisor[]) {
  const chaves = itens
    .map((i) => i.chave)
    .sort()
    .join(',');
  return useQuery({
    queryKey: ['tripadvisor', chaves],
    queryFn: () => buscarNotasTripadvisor(itens),
    enabled: itens.length > 0,
    staleTime: 10 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function tripadvisorIndisponivel(erro: unknown): boolean {
  return erro instanceof TripadvisorIndisponivel;
}

const fmtContagem = new Intl.NumberFormat('pt-BR');

/**
 * Nota no formato exigido pela Tripadvisor: imagem de nota fornecida pela própria
 * API, contagem de avaliações e crédito com link para a página do local.
 */
export function NotaTripadvisor({
  nota,
  avaliacoes,
  icone,
  url,
  compacta = false,
}: {
  nota: number;
  avaliacoes: number;
  icone?: string | null;
  url?: string | null;
  compacta?: boolean;
}) {
  const valor = nota.toFixed(1).replace('.', ',');
  const rotulo = `${valor} de 5 no Tripadvisor, ${fmtContagem.format(avaliacoes)} avaliações`;
  return (
    <span className="ta-nota" title={rotulo}>
      {icone ? (
        <img src={icone} alt="" className="ta-bolhas" referrerPolicy="no-referrer" />
      ) : (
        <Star aria-hidden className="star-inline" fill="currentColor" />
      )}
      <strong className="tabular">{valor}</strong>
      <span className="ta-contagem tabular">({fmtContagem.format(avaliacoes)})</span>
      {!compacta &&
        (url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="ta-credito">
            Tripadvisor
          </a>
        ) : (
          <span className="ta-credito">Tripadvisor</span>
        ))}
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

/** Crédito para listas que mostram notas compactas. */
export function CreditoTripadvisor({ indisponivel }: { indisponivel?: boolean }) {
  if (indisponivel) {
    return (
      <span className="footnote tertiary">
        {import.meta.env.DEV
          ? 'Notas do Tripadvisor desligadas: defina TRIPADVISOR_API_KEY em frontend/.env.local.'
          : 'Notas do Tripadvisor indisponíveis no momento.'}
      </span>
    );
  }
  return (
    <span className="footnote tertiary">
      Notas e avaliações:{' '}
      <a href="https://www.tripadvisor.com.br" target="_blank" rel="noopener noreferrer">
        Tripadvisor
      </a>
    </span>
  );
}
