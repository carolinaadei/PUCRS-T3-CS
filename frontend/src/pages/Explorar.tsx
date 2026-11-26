import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Compass, MapPin, Search, Sparkles, Star, Ticket } from 'lucide-react';
import { catalogoApi } from '../api/endpoints';
import type { CategoriaAtividade, CategoriaDestino } from '../api/types';
import { AtividadeCatalogoSheet } from '../components/AtividadeCatalogoSheet';
import { Empty, Glass, Photo, Segmented } from '../components/ui';
import { fotoDoDestino, fotoGrandeDoDestino } from '../utils/featured';
import { countryName } from '../utils/format';
import { useDebounced, useDocumentTitle } from '../utils/hooks';
import { CATEGORIA_ATIVIDADE, CATEGORIA_DESTINO } from '../utils/labels';

type Aba = 'destinos' | 'atividades';

function ChipsFiltro<T extends string>({
  valor,
  opcoes,
  onChange,
  rotulo,
}: {
  valor: T | '';
  opcoes: Record<T, string>;
  onChange: (v: T | '') => void;
  rotulo: string;
}) {
  return (
    <div className="row wrap gap-2" role="group" aria-label={rotulo}>
      <button
        type="button"
        className={`chip ${valor === '' ? 'chip-blue' : ''}`}
        aria-pressed={valor === ''}
        onClick={() => onChange('')}
      >
        Todas
      </button>
      {(Object.keys(opcoes) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          className={`chip ${valor === k ? 'chip-blue' : ''}`}
          aria-pressed={valor === k}
          onClick={() => onChange(k)}
        >
          {opcoes[k]}
        </button>
      ))}
    </div>
  );
}

function Destinos({ busca }: { busca: string }) {
  const [categoria, setCategoria] = useState<CategoriaDestino | ''>('');
  const termo = useDebounced(busca.trim(), 300);

  const consulta = useInfiniteQuery({
    queryKey: ['catalogo', 'destinos', 'lista', termo, categoria],
    queryFn: ({ pageParam }) =>
      catalogoApi.destinos({
        nome: termo || undefined,
        categoria: categoria || undefined,
        pagina: pageParam,
        tamanho_pagina: 24,
      }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.tem_proxima ? ultima.pagina + 1 : undefined),
  });

  const itens = consulta.data?.pages.flatMap((p) => p.itens) ?? [];

  return (
    <div className="stack gap-5">
      <ChipsFiltro valor={categoria} opcoes={CATEGORIA_DESTINO} onChange={setCategoria} rotulo="Categoria" />
      {consulta.isLoading ? (
        <div className="dest-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '4 / 5' }} />
          ))}
        </div>
      ) : consulta.isError ? (
        <Empty icon={<Compass />} title="Não foi possível carregar o catálogo">
          Verifique se a API está no ar e tente de novo.
        </Empty>
      ) : itens.length === 0 ? (
        <Empty icon={<Search />} title="Nenhum destino encontrado">
          {termo ? `Não temos “${termo}” no catálogo ainda.` : 'Tente outra categoria.'}
        </Empty>
      ) : (
        <div className="dest-grid">
          {itens.map((d) => (
            <Link key={d.id} to={`/explorar/destinos/${d.id}`} className="dest-card">
              <Photo src={fotoGrandeDoDestino(d.nome, d.foto_url)} alt={d.nome} className="dest-card-photo" />
              <span className="dest-rank chip chip-glass">{CATEGORIA_DESTINO[d.categoria]}</span>
              <Glass className="dest-card-info">
                <h3 className="headline truncate">{d.nome}</h3>
                <span className="footnote secondary row gap-1">
                  <MapPin size={13} aria-hidden /> {countryName(d.pais_codigo)}
                </span>
              </Glass>
            </Link>
          ))}
        </div>
      )}
      {consulta.hasNextPage && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ alignSelf: 'center' }}
          onClick={() => consulta.fetchNextPage()}
          disabled={consulta.isFetchingNextPage}
        >
          {consulta.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}

function Atividades({ busca }: { busca: string }) {
  const [categoria, setCategoria] = useState<CategoriaAtividade | ''>('');
  const [notaMinima, setNotaMinima] = useState<number | ''>('');
  const [aberta, setAberta] = useState<number | null>(null);
  const termo = useDebounced(busca.trim(), 300);

  const consulta = useInfiniteQuery({
    queryKey: ['catalogo', 'atividades', 'lista', termo, categoria, notaMinima],
    queryFn: ({ pageParam }) =>
      catalogoApi.atividades({
        localizacao: termo || undefined,
        categoria: categoria || undefined,
        nota_minima: notaMinima || undefined,
        pagina: pageParam,
        tamanho_pagina: 24,
      }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.tem_proxima ? ultima.pagina + 1 : undefined),
  });

  const itens = consulta.data?.pages.flatMap((p) => p.itens) ?? [];

  return (
    <div className="stack gap-5">
      <div className="row wrap gap-4 between">
        <ChipsFiltro valor={categoria} opcoes={CATEGORIA_ATIVIDADE} onChange={setCategoria} rotulo="Tipo" />
        <label className="row gap-2 subhead secondary">
          Nota mínima
          <select
            className="select select-compact"
            value={notaMinima}
            onChange={(e) => setNotaMinima(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Qualquer</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4,5+</option>
          </select>
        </label>
      </div>

      {consulta.isLoading ? (
        <div className="act-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 112 }} />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <Empty icon={<Ticket />} title="Nenhuma atividade encontrada">
          Ajuste os filtros ou busque por outra cidade ou país.
        </Empty>
      ) : (
        <div className="act-grid">
          {itens.map((a) => (
            <Glass
              as="button"
              type="button"
              key={a.id}
              className="act-card"
              interactive
              onClick={() => setAberta(a.id)}
            >
              <Photo src={a.foto_url ?? fotoDoDestino(a.destino.nome, a.destino.foto_url)} alt="" className="act-thumb" />
              <span className="stack gap-1 grow" style={{ textAlign: 'left', minWidth: 0 }}>
                <span className="caption act-cat">{CATEGORIA_ATIVIDADE[a.categoria]}</span>
                <strong className="subhead truncate">{a.nome}</strong>
                <span className="footnote secondary truncate">
                  {a.destino.nome}, {countryName(a.destino.pais_codigo)}
                </span>
                <span className="footnote row gap-1">
                  {a.media_avaliacoes !== null ? (
                    <>
                      <Star size={13} className="star-inline" fill="currentColor" aria-hidden />
                      <strong className="tabular">{a.media_avaliacoes.toFixed(1)}</strong>
                      <span className="tertiary">({a.total_avaliacoes})</span>
                    </>
                  ) : (
                    <span className="tertiary">Sem avaliações</span>
                  )}
                </span>
              </span>
            </Glass>
          ))}
        </div>
      )}
      {consulta.hasNextPage && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ alignSelf: 'center' }}
          onClick={() => consulta.fetchNextPage()}
          disabled={consulta.isFetchingNextPage}
        >
          {consulta.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
      <AtividadeCatalogoSheet atividadeId={aberta} onClose={() => setAberta(null)} />
    </div>
  );
}

export default function Explorar() {
  useDocumentTitle('Explorar');
  const [params, setParams] = useSearchParams();
  const aba: Aba = params.get('aba') === 'atividades' ? 'atividades' : 'destinos';
  const [busca, setBusca] = useState(params.get('q') ?? '');

  const trocarAba = (nova: Aba) => {
    const p = new URLSearchParams(params);
    if (nova === 'destinos') p.delete('aba');
    else p.set('aba', nova);
    setParams(p, { replace: true });
  };

  return (
    <div className="page container">
      <header className="page-header">
        <div className="stack gap-2">
          <span className="eyebrow">Catálogo</span>
          <h1 className="title-1">Explorar</h1>
          <p className="secondary">
            Destinos e atividades que você pode colocar no roteiro, com avaliações de quem já foi.
          </p>
        </div>
      </header>

      <div className="explore-toolbar">
        <Glass className="hero-search explore-search" role="search">
          <Search aria-hidden />
          <label htmlFor="busca-catalogo" className="sr-only">
            Buscar
          </label>
          <input
            id="busca-catalogo"
            className="hero-search-input"
            placeholder={aba === 'destinos' ? 'Buscar destino pelo nome' : 'Cidade, país ou endereço'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoComplete="off"
          />
        </Glass>
        <Segmented<Aba>
          label="Tipo de busca"
          value={aba}
          onChange={trocarAba}
          options={[
            { value: 'destinos', label: 'Destinos', icon: <MapPin aria-hidden /> },
            { value: 'atividades', label: 'Atividades', icon: <Sparkles aria-hidden /> },
          ]}
        />
      </div>

      {aba === 'destinos' ? <Destinos busca={busca} /> : <Atividades busca={busca} />}
    </div>
  );
}
