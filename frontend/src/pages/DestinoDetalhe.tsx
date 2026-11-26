import { Suspense, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MapPin, Plus, Ticket } from 'lucide-react';
import { agregarNotas, itemDaAtividade } from '../api/tripadvisor';
import {
  CreditoTripadvisor,
  NotaTripadvisor,
  tripadvisorIndisponivel,
  useNotasTripadvisor,
} from '../components/NotaTripadvisor';
import { catalogoApi } from '../api/endpoints';
import { AtividadeCatalogoSheet } from '../components/AtividadeCatalogoSheet';
import { TripGlobe, type ParadaGlobo } from '../components/globe';
import { ParadaSheet } from '../components/ParadaSheet';
import { Empty, Glass, PageLoader, Photo } from '../components/ui';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { fotoGrandeDoDestino } from '../utils/featured';
import { countryName } from '../utils/format';
import { useDocumentTitle } from '../utils/hooks';
import { CATEGORIA_ATIVIDADE, CATEGORIA_DESTINO } from '../utils/labels';

export default function DestinoDetalhe() {
  const { id } = useParams();
  const destinoId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { usuario } = useAuth();
  const [adicionando, setAdicionando] = useState(false);
  const [atividadeAberta, setAtividadeAberta] = useState<number | null>(null);

  const destino = useQuery({
    queryKey: ['catalogo', 'destino', destinoId],
    queryFn: () => catalogoApi.destino(destinoId),
    enabled: Number.isFinite(destinoId),
  });

  const atividades = useQuery({
    queryKey: ['catalogo', 'atividades', 'destino', destinoId],
    queryFn: () => catalogoApi.atividades({ destino_catalogo_id: destinoId, tamanho_pagina: 100 }),
    enabled: Number.isFinite(destinoId),
  });

  useDocumentTitle(destino.data?.nome);

  const ponto = useMemo<ParadaGlobo[]>(() => {
    const d = destino.data;
    if (!d || d.latitude === null || d.longitude === null) return [];
    // Sem datas: o pino mostra só o nome do destino.
    return [
      {
        id: d.id,
        ordem: 1,
        nome: d.nome,
        pais: d.pais_codigo,
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        chegada: '',
        saida: '',
      },
    ];
  }, [destino.data]);

  // Notas da Tripadvisor das atividades; a do destino é a média ponderada delas.
  const notas = useNotasTripadvisor((atividades.data?.itens ?? []).map(itemDaAtividade));

  if (destino.isLoading) return <PageLoader />;
  if (!destino.data) {
    return (
      <div className="page container">
        <Empty
          icon={<MapPin />}
          title="Destino não encontrado"
          action={
            <Link to="/explorar" className="btn btn-primary">
              Voltar ao catálogo
            </Link>
          }
        />
      </div>
    );
  }

  const d = destino.data;
  const lista = atividades.data?.itens ?? [];
  const notaDestino = agregarNotas(lista.map((a) => notas.data?.[String(a.id)]));

  const adicionar = () => {
    if (!usuario) {
      navigate('/entrar', { state: { from: `/explorar/destinos/${d.id}` } });
      return;
    }
    setAdicionando(true);
  };

  return (
    <div className="page container">
      <Link to="/explorar" className="back-link">
        <ChevronLeft aria-hidden /> Explorar
      </Link>

      <section className="dest-hero">
        <Photo src={fotoGrandeDoDestino(d.nome, d.foto_url)} alt={d.nome} className="dest-hero-photo" eager />
        <Glass lg className="dest-hero-panel">
          <div className="row wrap gap-2">
            <span className="chip chip-glass">{CATEGORIA_DESTINO[d.categoria]}</span>
            {notaDestino && (
              <span className="chip chip-glass">
                <NotaTripadvisor nota={notaDestino.nota} avaliacoes={notaDestino.avaliacoes} compacta />
                <span>no Tripadvisor</span>
              </span>
            )}
          </div>
          <h1 className="large-title dest-hero-title">{d.nome}</h1>
          <p className="headline dest-hero-country">
            <MapPin aria-hidden /> {countryName(d.pais_codigo)}
          </p>
          <button type="button" className="btn btn-primary btn-lg" onClick={adicionar}>
            <Plus /> Adicionar a uma viagem
          </button>
        </Glass>
      </section>

      <div className="dest-body">
        <div className="stack gap-6">
          {d.descricao && (
            <section className="stack gap-3">
              <h2 className="title-3">Sobre</h2>
              <p className="dest-desc">{d.descricao}</p>
            </section>
          )}

          <section className="stack gap-4">
            <div className="row between wrap gap-2">
              <h2 className="title-3">O que fazer</h2>
              <CreditoTripadvisor indisponivel={tripadvisorIndisponivel(notas.error)} />
            </div>
            {atividades.isLoading && <div className="skeleton" style={{ height: 240 }} />}
            {!atividades.isLoading && lista.length === 0 && (
              <Empty icon={<Ticket />} title="Nenhuma atividade cadastrada">
                Este destino ainda não tem atividades no catálogo.
              </Empty>
            )}
            <div className="stack gap-2">
              {lista.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="act-row"
                  onClick={() => setAtividadeAberta(a.id)}
                >
                  <Photo src={a.foto_url} alt="" className="act-row-thumb" />
                  <span className="stack gap-1 grow" style={{ textAlign: 'left', minWidth: 0 }}>
                    <strong className="subhead truncate">{a.nome}</strong>
                    <span className="footnote secondary truncate">
                      {CATEGORIA_ATIVIDADE[a.categoria]}
                      {a.endereco ? ` · ${a.endereco}` : ''}
                    </span>
                  </span>
                  <span className="footnote" style={{ flex: 'none' }}>
                    {(() => {
                      const nota = notas.data?.[String(a.id)];
                      if (nota) {
                        return (
                          <NotaTripadvisor
                            nota={nota.nota}
                            avaliacoes={nota.avaliacoes}
                            icone={nota.icone}
                            compacta
                          />
                        );
                      }
                      if (notas.isFetching) return <span className="skeleton rank-nota-carregando" aria-hidden />;
                      return null;
                    })()}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="stack gap-4">
          {ponto.length > 0 && (
            <Glass className="dest-map">
              <Suspense fallback={<div className="globe-placeholder" style={{ width: 240 }} />}>
                <TripGlobe paradas={ponto} altura={320} />
              </Suspense>
            </Glass>
          )}
        </aside>
      </div>

      <AtividadeCatalogoSheet atividadeId={atividadeAberta} onClose={() => setAtividadeAberta(null)} />
      {usuario && (
        <ParadaSheet
          open={adicionando}
          onClose={() => setAdicionando(false)}
          destino={d}
          onSalva={(p) => {
            toast.sucesso(`${d.nome} entrou no roteiro.`);
            navigate(`/viagens/${p.viagem_id}`);
          }}
        />
      )}
    </div>
  );
}
