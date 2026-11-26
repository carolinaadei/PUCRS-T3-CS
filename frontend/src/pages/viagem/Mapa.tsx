import { Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, Map as MapIcon } from 'lucide-react';
import { viagemApi } from '../../api/endpoints';
import { TripGlobe, type ParadaGlobo } from '../../components/globe';
import { Empty, Glass } from '../../components/ui';
import { countryName, diffDays, formatRange, plural } from '../../utils/format';
import type { ContextoViagem } from './contexto';

export function AbaMapa({ viagem }: ContextoViagem) {
  const mapa = useQuery({ queryKey: ['mapa', viagem.id], queryFn: () => viagemApi.mapa(viagem.id) });

  const paradas = mapa.data?.paradas ?? [];
  const comCoordenadas = useMemo<ParadaGlobo[]>(
    () =>
      paradas
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p) => ({
          id: p.parada_id,
          ordem: p.ordem,
          nome: p.nome,
          pais: p.pais_codigo,
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          chegada: p.data_chegada,
          saida: p.data_saida,
        })),
    [paradas],
  );
  const semCoordenadas = paradas.length - comCoordenadas.length;

  if (mapa.isLoading) return <div className="skeleton" style={{ height: 520 }} />;
  if (!paradas.length) {
    return (
      <Glass className="card-pad">
        <Empty icon={<MapIcon />} title="Nada no mapa ainda">
          Adicione paradas no roteiro para ver o caminho da viagem no globo.
        </Empty>
      </Glass>
    );
  }

  return (
    <div className="trip-layout">
      <Glass className="map-card">
        <Suspense fallback={<div className="globe-placeholder" />}>
          <TripGlobe paradas={comCoordenadas} />
        </Suspense>
        <span className="map-hint caption">Arraste para girar · role para aproximar</span>
      </Glass>
      <aside className="trip-aside">
        <Glass className="card-pad stack gap-3">
          <h2 className="headline">Ordem de visita</h2>
          <ol className="map-list">
            {paradas.map((p) => {
              const noites = diffDays(p.data_chegada, p.data_saida);
              return (
                <li key={p.parada_id}>
                  <span className="map-num">{p.ordem}</span>
                  <span className="stack">
                    <strong className="subhead">{p.nome}</strong>
                    <span className="footnote secondary">
                      {countryName(p.pais_codigo)} · {formatRange(p.data_chegada, p.data_saida)} ·{' '}
                      {noites === 0 ? 'bate e volta' : plural(noites, 'noite')}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          {semCoordenadas > 0 && (
            <p className="footnote tertiary row gap-2">
              <Info size={14} aria-hidden /> {plural(semCoordenadas, 'parada')} sem coordenadas no
              catálogo não {semCoordenadas === 1 ? 'aparece' : 'aparecem'} no globo.
            </p>
          )}
        </Glass>
      </aside>
    </div>
  );
}
