import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, PiggyBank, TriangleExclamationPoint } from 'lucide-react';
import { orcamentoApi } from '../../api/endpoints';
import { ICONE_CATEGORIA } from '../../components/icons';
import { Glass, LoadingButton } from '../../components/ui';
import { useToast } from '../../state/toast';
import { formatMoney, formatPercent, parseMoneyInput, toNumber } from '../../utils/format';
import { CATEGORIA_ATIVIDADE } from '../../utils/labels';
import type { ContextoViagem } from './contexto';

export function AbaOrcamento({ viagem, podeEditar }: ContextoViagem) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const resumo = useQuery({
    queryKey: ['orcamento', viagem.id],
    queryFn: () => orcamentoApi.consultar(viagem.id),
  });

  useEffect(() => {
    if (resumo.data?.orcamento_total) setValor(resumo.data.orcamento_total.replace('.', ','));
  }, [resumo.data?.orcamento_total]);

  const definir = useMutation({
    mutationFn: (decimal: string) => orcamentoApi.definir(viagem.id, decimal),
    onSuccess: (novo) => {
      queryClient.setQueryData(['orcamento', viagem.id], novo);
      toast.sucesso('Orçamento atualizado.');
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível salvar.'),
  });

  const salvar = (event: FormEvent) => {
    event.preventDefault();
    setErro(null);
    const decimal = parseMoneyInput(valor);
    if (decimal === null) return setErro('Informe um valor válido, como 5.000,00.');
    definir.mutate(decimal);
  };

  if (resumo.isLoading) return <div className="skeleton" style={{ height: 360 }} />;
  const r = resumo.data;
  if (!r) return null;

  const total = toNumber(r.orcamento_total);
  const planejado = toNumber(r.total_planejado);
  const saldo = toNumber(r.saldo_disponivel);
  const pct = r.percentual_consumido !== null ? toNumber(r.percentual_consumido) : null;
  const categorias = [...r.categorias].sort((a, b) => toNumber(b.total_planejado) - toNumber(a.total_planejado));
  const maiorCategoria = Math.max(...categorias.map((c) => toNumber(c.total_planejado)), 0);

  return (
    <div className="trip-layout">
      <div className="stack gap-4">
        <Glass className="card-pad budget-hero">
          <span className="footnote secondary">Planejado em atividades</span>
          <span className="hero-number tabular">{formatMoney(planejado)}</span>
          {r.orcamento_total !== null ? (
            <>
              <div
                className={`progress progress-lg ${r.orcamento_excedido ? 'is-over' : ''}`}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, pct ?? 0)}
                aria-label="Parte do orçamento já planejada"
              >
                <span style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
              </div>
              <div className="budget-stats">
                <div>
                  <span className="footnote secondary">Orçamento</span>
                  <strong className="tabular">{formatMoney(total)}</strong>
                </div>
                <div>
                  <span className="footnote secondary">{saldo < 0 ? 'Excedente' : 'Disponível'}</span>
                  <strong className={`tabular ${saldo < 0 ? 'text-danger' : ''}`}>
                    {formatMoney(Math.abs(saldo))}
                  </strong>
                </div>
                <div>
                  <span className="footnote secondary">Consumido</span>
                  <strong className="tabular">{formatPercent(r.percentual_consumido)}</strong>
                </div>
              </div>
              {r.orcamento_excedido ? (
                <div className="alert alert-warning" role="status">
                  <TriangleExclamationPoint aria-hidden />
                  <span>
                    As atividades planejadas passam o orçamento em {formatMoney(Math.abs(saldo))}.
                  </span>
                </div>
              ) : (
                <div className="alert alert-success" role="status">
                  <CircleCheck aria-hidden />
                  <span>Dentro do orçamento.</span>
                </div>
              )}
            </>
          ) : (
            <p className="subhead secondary">
              Sem orçamento definido. {podeEditar ? 'Defina um valor para acompanhar o saldo.' : ''}
            </p>
          )}
        </Glass>

        <Glass className="card-pad stack gap-4">
          <div className="row between wrap gap-2">
            <h2 className="headline">Por tipo de atividade</h2>
            <span className="footnote tertiary">Custos previstos das atividades do roteiro</span>
          </div>
          <ul className="bars" aria-label="Custos planejados por tipo de atividade">
            {categorias.map((c) => {
              const Icone = ICONE_CATEGORIA[c.categoria];
              const valorCat = toNumber(c.total_planejado);
              const largura = maiorCategoria > 0 ? (valorCat / maiorCategoria) * 100 : 0;
              const descricao = `${CATEGORIA_ATIVIDADE[c.categoria]}: ${formatMoney(valorCat)}, ${formatPercent(
                c.percentual_planejado,
              )} do planejado${c.percentual_orcamento !== null ? `, ${formatPercent(c.percentual_orcamento)} do orçamento` : ''}`;
              return (
                <li key={c.categoria} className="bar-row" title={descricao}>
                  <span className="bar-label subhead">
                    <Icone aria-hidden /> {CATEGORIA_ATIVIDADE[c.categoria]}
                  </span>
                  <span className="bar-track" aria-hidden>
                    <span className="bar-fill" style={{ width: `${largura}%` }} />
                  </span>
                  <span className="bar-value subhead tabular">
                    {formatMoney(valorCat, true)}
                    <span className="footnote tertiary"> · {formatPercent(c.percentual_planejado)}</span>
                  </span>
                  <span className="sr-only">{descricao}</span>
                </li>
              );
            })}
          </ul>
        </Glass>
      </div>

      <aside className="trip-aside">
        <Glass className="card-pad stack gap-3">
          <span className="budget-icon">
            <PiggyBank aria-hidden />
          </span>
          <h2 className="headline">Orçamento total</h2>
          {podeEditar ? (
            <form className="stack gap-3" onSubmit={salvar} noValidate>
              <label className="sr-only" htmlFor="orcamento-valor">
                Valor do orçamento em reais
              </label>
              <div className="money-input">
                <span aria-hidden>R$</span>
                <input
                  id="orcamento-valor"
                  className="input"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
              {erro && <span className="field-error">{erro}</span>}
              <LoadingButton type="submit" className="btn btn-primary" loading={definir.isPending}>
                {r.orcamento_total === null ? 'Definir orçamento' : 'Atualizar'}
              </LoadingButton>
              <p className="footnote tertiary">
                Um único valor para a viagem toda. O saldo é recalculado a cada atividade.
              </p>
            </form>
          ) : (
            <p className="subhead secondary">
              {r.orcamento_total !== null
                ? `${formatMoney(total)} definidos por quem edita a viagem.`
                : 'Ainda não definido por quem edita a viagem.'}
            </p>
          )}
        </Glass>
      </aside>
    </div>
  );
}
