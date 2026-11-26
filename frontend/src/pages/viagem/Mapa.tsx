import { Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, Map as MapIcon } from 'lucide-react';
import { viagemApi } from '../../api/endpoints';
import { TripGlobe, type ParadaGlobo } from '../../components/globe';
import { Empty } from '../../components/ui';
import { formatRange, plural } from '../../utils/format';
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
      <Empty icon={<MapIcon />} title="Nada no mapa ainda">
        Adicione paradas no roteiro para ver o caminho da viagem no globo.
      </Empty>
    );
  }

  return (
    <div className="stack gap-4">
      <div className="map-plain">
        <Suspense fallback={<div className="globe-placeholder" />}>
          <TripGlobe paradas={comCoordenadas} altura={560} />
        </Suspense>
      </div>
      {/* A ordem de visita vira uma linha sob o globo, sem cartão lateral. */}
      <ol className="route-line subhead">
        {paradas.map((p) => (
          <li key={p.parada_id}>
            <span className="map-num">{p.ordem}</span>
            <strong>{p.nome}</strong>
            <span className="secondary footnote">{formatRange(p.data_chegada, p.data_saida)}</span>
          </li>
        ))}
      </ol>
      <p className="footnote tertiary" style={{ textAlign: 'center' }}>
        Arraste para girar · role para aproximar
        {semCoordenadas > 0 && (
          <>
            {' · '}
            <Info size={12} aria-hidden style={{ display: 'inline', verticalAlign: '-1px' }} />{' '}
            {plural(semCoordenadas, 'parada')} sem coordenadas no catálogo
          </>
        )}
      </p>
    </div>
  );
}
