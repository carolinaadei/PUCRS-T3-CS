import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countries from 'i18n-iso-countries';
import world from 'world-atlas/countries-110m.json';

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }> & {
  id: string;
  /** Longitude aproximada do centro, usada para colorir o globo em degradê. */
  lngCentro: number;
};

const ANTARTIDA = '010';

function centroLongitude(geometry: Polygon | MultiPolygon): number {
  const anel: Position[] =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.coordinates.reduce<Position[]>(
          (maior, poligono) => (poligono[0].length > maior.length ? poligono[0] : maior),
          [],
        );
  if (!anel.length) return 0;
  return anel.reduce((soma, [lng]) => soma + lng, 0) / anel.length;
}

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const collection = feature(topology, topology.objects.countries) as unknown as FeatureCollection<
  Polygon | MultiPolygon,
  { name: string }
>;

/**
 * O world-atlas 110m traz alguns polígonos degenerados (ex.: um anel da Coreia do
 * Norte com quatro pontos idênticos). O H3, usado nos pontos hexagonais, lança erro
 * neles e interrompe o desenho dos países seguintes — por isso são descartados aqui.
 */
function anelValido(anel: Position[]): boolean {
  return new Set(anel.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`)).size >= 3;
}

function sanear(geometry: Polygon | MultiPolygon): Polygon | MultiPolygon | null {
  if (geometry.type === 'Polygon') {
    return anelValido(geometry.coordinates[0]) ? geometry : null;
  }
  const poligonos = geometry.coordinates.filter((p) => anelValido(p[0]));
  if (!poligonos.length) return null;
  return { type: 'MultiPolygon', coordinates: poligonos };
}

export const PAISES: CountryFeature[] = collection.features
  .filter((f) => String(f.id) !== ANTARTIDA)
  .flatMap((f) => {
    const geometry = sanear(f.geometry);
    if (!geometry) return [];
    return [{ ...f, geometry, id: String(f.id), lngCentro: centroLongitude(geometry) }];
  });

/** Código ISO alfa-2 (formato do backend) para o id numérico do world-atlas. */
export function idNumerico(alpha2: string): string | undefined {
  return countries.alpha2ToNumeric(alpha2.toUpperCase());
}

/** Código alfa-2 de um país do world-atlas, para nomeá-lo em português. */
export function alpha2DoPais(pais: CountryFeature): string | undefined {
  return countries.numericToAlpha2(pais.id);
}

function hexParaRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function misturar(a: string, b: string, t: number): [number, number, number] {
  const [r1, g1, b1] = hexParaRgb(a);
  const [r2, g2, b2] = hexParaRgb(b);
  return [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t];
}

/** Azul → verde ao redor do globo, sem emenda em ±180°. */
export function corTerra(lng: number, azul: string, verde: string, alpha = 0.9): string {
  const t = (Math.sin((lng * Math.PI) / 180) + 1) / 2;
  const [r, g, b] = misturar(azul, verde, t);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

/** Distância angular (graus) entre dois pontos na esfera. */
export function distanciaAngular(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(lat1 * rad) * Math.sin(lat2 * rad) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lng2 - lng1) * rad);
  return Math.acos(Math.min(1, Math.max(-1, a))) / rad;
}

/** Ponto de vista que enquadra um conjunto de coordenadas. */
export function enquadrar(pontos: { lat: number; lng: number }[]): {
  lat: number;
  lng: number;
  altitude: number;
} {
  if (!pontos.length) return { lat: 15, lng: -30, altitude: 2.4 };
  // Média vetorial: funciona mesmo quando os pontos cruzam o antimeridiano.
  const rad = Math.PI / 180;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of pontos) {
    x += Math.cos(p.lat * rad) * Math.cos(p.lng * rad);
    y += Math.cos(p.lat * rad) * Math.sin(p.lng * rad);
    z += Math.sin(p.lat * rad);
  }
  const lng = Math.atan2(y, x) / rad;
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / rad;
  const maior = Math.max(...pontos.map((p) => distanciaAngular(lat, lng, p.lat, p.lng)));
  const altitude = Math.min(3, Math.max(1.1, 0.9 + maior / 28));
  return { lat, lng, altitude };
}
