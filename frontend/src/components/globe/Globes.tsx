import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import { useTema } from '../../state/theme';
import { countryName, formatDate } from '../../utils/format';
import type { LugarGlobo } from '../../utils/featured';
import {
  alpha2DoPais,
  corTerra,
  distanciaAngular,
  enquadrar,
  idNumerico,
  PAISES,
  type CountryFeature,
} from './geo';

/* ───────────── Base compartilhada ───────────── */

const PALETA = {
  claro: {
    oceano: '#d9e9f7',
    brilho: '#c6def2',
    azul: '#0a84ff',
    verde: '#1fbf6a',
    atmosfera: '#8fcbff',
    contorno: 'rgba(10, 60, 110, 0.18)',
  },
  escuro: {
    oceano: '#0b2034',
    brilho: '#08182a',
    azul: '#3d9bff',
    verde: '#30d158',
    atmosfera: '#2a78d0',
    contorno: 'rgba(160, 200, 240, 0.16)',
  },
};

function usePaleta() {
  const { escuro } = useTema();
  return escuro ? PALETA.escuro : PALETA.claro;
}

function useTamanho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [tamanho, setTamanho] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setTamanho((atual) =>
        Math.abs(atual.width - width) < 1 && Math.abs(atual.height - height) < 1
          ? atual
          : { width: Math.round(width), height: Math.round(height) },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, ...tamanho };
}

function useMaterial(cor: string, brilho: string) {
  return useMemo(
    () =>
      new MeshPhongMaterial({
        color: cor,
        emissive: brilho,
        emissiveIntensity: 0.35,
        shininess: 6,
      }),
    [cor, brilho],
  );
}

const movimentoReduzido = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/*
 * Acessores estáveis. O react-globe.gl recalcula uma camada inteira quando recebe
 * uma função nova; com funções fixas, re-renderizar o React não refaz a malha.
 */
type ComLatLng = { lat: number; lng: number };
const lerLat = (d: object) => (d as ComLatLng).lat;
const lerLng = (d: object) => (d as ComLatLng).lng;
const marcarVisibilidade = (el: HTMLElement, visivel: boolean) =>
  el.classList.toggle('is-hidden', !visivel);

function useCorHex(azul: string, verde: string, alpha: number) {
  return useCallback(
    (f: object) => corTerra((f as CountryFeature).lngCentro, azul, verde, alpha),
    [azul, verde, alpha],
  );
}

/* ───────────── Globo de exploração (página inicial) ───────────── */

interface ExploreGlobeProps {
  lugares: LugarGlobo[];
  onSelect?: (lugar: LugarGlobo) => void;
  onAtivoChange?: (lugar: LugarGlobo | null) => void;
}

function criarMarcador(lugar: LugarGlobo): HTMLElement {
  const raiz = document.createElement('div');
  raiz.className = 'gm';
  raiz.dataset.chave = lugar.chave;

  const pulso = document.createElement('span');
  pulso.className = 'gm-pulse';
  const ponto = document.createElement('span');
  ponto.className = 'gm-dot';

  const cartao = document.createElement('div');
  cartao.className = `gm-card${lugar.destinoId ? ' is-link' : ''}`;
  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.src = lugar.foto;
  img.addEventListener('error', () => cartao.classList.add('no-photo'));
  const meta = document.createElement('div');
  meta.className = 'gm-meta';
  const nome = document.createElement('strong');
  nome.textContent = lugar.nome;
  const pais = document.createElement('span');
  pais.textContent = countryName(lugar.pais);
  meta.append(nome, pais);
  cartao.append(img, meta);

  raiz.append(pulso, ponto, cartao);
  return raiz;
}

export function ExploreGlobe({ lugares, onSelect, onAtivoChange }: ExploreGlobeProps) {
  const paleta = usePaleta();
  const { ref, width, height } = useTamanho<HTMLDivElement>();
  const globeRef = useRef<GlobeMethods>();
  const material = useMaterial(paleta.oceano, paleta.brilho);
  const marcadores = useRef(new Map<string, HTMLElement>());
  const ativoRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const onAtivoRef = useRef(onAtivoChange);
  onSelectRef.current = onSelect;
  onAtivoRef.current = onAtivoChange;
  const [pronto, setPronto] = useState(false);
  const corHex = useCorHex(paleta.azul, paleta.verde, 0.85);

  const elemento = useCallback((obj: object) => {
    const lugar = obj as LugarGlobo;
    let el = marcadores.current.get(lugar.chave);
    if (!el) {
      el = criarMarcador(lugar);
      const cartao = el.querySelector('.gm-card') as HTMLElement;
      cartao.addEventListener('click', () => onSelectRef.current?.(lugar));
      cartao.addEventListener('pointerenter', () => {
        const controls = globeRef.current?.controls();
        if (controls) controls.autoRotate = false;
      });
      cartao.addEventListener('pointerleave', () => {
        const controls = globeRef.current?.controls();
        if (controls && !movimentoReduzido()) controls.autoRotate = true;
      });
      marcadores.current.set(lugar.chave, el);
    }
    return el;
  }, []);

  const aoFicarPronto = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !movimentoReduzido();
    controls.autoRotateSpeed = 0.55;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    globe.pointOfView({ lat: 18, lng: -40, altitude: 2.35 }, 0);
    setPronto(true);
  }, []);

  // A cada quadro, o lugar mais próximo do centro da vista ganha o cartão com foto.
  useEffect(() => {
    if (!pronto) return;
    let frame = 0;
    let ultimo = 0;
    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      if (t - ultimo < 120) return;
      ultimo = t;
      const globe = globeRef.current;
      if (!globe) return;
      const pov = globe.pointOfView();
      let melhor: LugarGlobo | null = null;
      let menor = Infinity;
      for (const lugar of lugares) {
        const d = distanciaAngular(pov.lat, pov.lng, lugar.lat, lugar.lng);
        if (d < menor) {
          menor = d;
          melhor = lugar;
        }
      }
      const chave = melhor && menor < 42 ? melhor.chave : null;
      if (chave === ativoRef.current) return;
      if (ativoRef.current) marcadores.current.get(ativoRef.current)?.classList.remove('is-active');
      if (chave) marcadores.current.get(chave)?.classList.add('is-active');
      ativoRef.current = chave;
      onAtivoRef.current?.(chave ? melhor : null);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [pronto, lugares]);

  const altura = Math.max(height, 320);
  return (
    <div ref={ref} className="globe-frame" role="img" aria-label="Globo interativo com destinos em destaque. Arraste para girar.">
      {width > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={altura}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          showAtmosphere
          atmosphereColor={paleta.atmosfera}
          atmosphereAltitude={0.17}
          hexPolygonsData={PAISES}
          hexPolygonResolution={3}
          hexPolygonMargin={0.42}
          hexPolygonUseDots
          hexPolygonAltitude={0.004}
          hexPolygonColor={corHex}
          htmlElementsData={lugares}
          htmlLat={lerLat}
          htmlLng={lerLng}
          htmlAltitude={0.01}
          htmlElement={elemento}
          htmlElementVisibilityModifier={marcarVisibilidade}
          htmlTransitionDuration={0}
          enablePointerInteraction={false}
          onGlobeReady={aoFicarPronto}
          animateIn
        />
      )}
    </div>
  );
}

/* ───────────── Globo da viagem (rota entre paradas) ───────────── */

export interface ParadaGlobo {
  id: number;
  ordem: number;
  nome: string;
  pais: string;
  lat: number;
  lng: number;
  chegada: string;
  saida: string;
}

interface Arco {
  inicio: ParadaGlobo;
  fim: ParadaGlobo;
}

function criarPino(parada: ParadaGlobo): HTMLElement {
  const raiz = document.createElement('div');
  raiz.className = 'tp';
  const numero = document.createElement('span');
  numero.className = 'tp-num';
  numero.textContent = String(parada.ordem);
  const rotulo = document.createElement('span');
  rotulo.className = 'tp-label';
  const nome = document.createElement('strong');
  nome.textContent = parada.nome;
  const datas = document.createElement('span');
  datas.textContent = `${formatDate(parada.chegada)} – ${formatDate(parada.saida)}`;
  rotulo.append(nome, datas);
  raiz.append(numero, rotulo);
  return raiz;
}

const pinoDaParada = (d: object) => criarPino(d as ParadaGlobo);
const arcoInicioLat = (d: object) => (d as Arco).inicio.lat;
const arcoInicioLng = (d: object) => (d as Arco).inicio.lng;
const arcoFimLat = (d: object) => (d as Arco).fim.lat;
const arcoFimLng = (d: object) => (d as Arco).fim.lng;
const corAnel = () => (t: number) => `rgba(31, 191, 106, ${1 - t})`;

export function TripGlobe({ paradas, altura = 520 }: { paradas: ParadaGlobo[]; altura?: number }) {
  const paleta = usePaleta();
  const { ref, width } = useTamanho<HTMLDivElement>();
  const globeRef = useRef<GlobeMethods>();
  const material = useMaterial(paleta.oceano, paleta.brilho);
  const [pronto, setPronto] = useState(false);
  const corHex = useCorHex(paleta.azul, paleta.verde, 0.55);
  const corArco = useCallback(() => [paleta.azul, paleta.verde], [paleta.azul, paleta.verde]);

  const arcos = useMemo<Arco[]>(
    () => paradas.slice(1).map((fim, i) => ({ inicio: paradas[i], fim })),
    [paradas],
  );

  useEffect(() => {
    if (!pronto) return;
    globeRef.current?.pointOfView(enquadrar(paradas), 1200);
  }, [pronto, paradas]);

  const aoFicarPronto = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.enableZoom = true;
    controls.zoomSpeed = 0.6;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.enableDamping = true;
    setPronto(true);
  }, []);

  return (
    <div ref={ref} className="globe-frame" role="img" aria-label="Mapa da rota da viagem">
      {width > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={altura}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          atmosphereColor={paleta.atmosfera}
          atmosphereAltitude={0.15}
          hexPolygonsData={PAISES}
          hexPolygonResolution={3}
          hexPolygonMargin={0.45}
          hexPolygonUseDots
          hexPolygonAltitude={0.004}
          hexPolygonColor={corHex}
          arcsData={arcos}
          arcStartLat={arcoInicioLat}
          arcStartLng={arcoInicioLng}
          arcEndLat={arcoFimLat}
          arcEndLng={arcoFimLng}
          arcColor={corArco}
          arcStroke={0.7}
          arcAltitudeAutoScale={0.45}
          arcDashLength={0.5}
          arcDashGap={0.12}
          arcDashAnimateTime={2600}
          ringsData={paradas}
          ringLat={lerLat}
          ringLng={lerLng}
          ringColor={corAnel}
          ringMaxRadius={2.4}
          ringPropagationSpeed={1.6}
          ringRepeatPeriod={1400}
          htmlElementsData={paradas}
          htmlLat={lerLat}
          htmlLng={lerLng}
          htmlAltitude={0.012}
          htmlElement={pinoDaParada}
          htmlElementVisibilityModifier={marcarVisibilidade}
          htmlTransitionDuration={0}
          enablePointerInteraction={false}
          onGlobeReady={aoFicarPronto}
        />
      )}
    </div>
  );
}

/* ───────────── Globo de países visitados (perfil) ───────────── */

export function VisitedGlobe({
  paises,
  altura = 420,
}: {
  paises: { pais_codigo: string; total_viagens: number }[];
  altura?: number;
}) {
  const paleta = usePaleta();
  const { ref, width } = useTamanho<HTMLDivElement>();
  const globeRef = useRef<GlobeMethods>();
  const material = useMaterial(paleta.oceano, paleta.brilho);

  const visitados = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of paises) {
      const id = idNumerico(p.pais_codigo);
      if (id) mapa.set(id, p.total_viagens);
    }
    return mapa;
  }, [paises]);

  const acessores = useMemo(() => {
    const visitado = (f: object) => visitados.has((f as CountryFeature).id);
    return {
      cap: (f: object) =>
        visitado(f)
          ? corTerra((f as CountryFeature).lngCentro, paleta.verde, paleta.verde, 0.92)
          : corTerra((f as CountryFeature).lngCentro, paleta.azul, paleta.verde, 0.16),
      lado: (f: object) => (visitado(f) ? 'rgba(31, 191, 106, 0.45)' : 'rgba(0,0,0,0)'),
      contorno: () => paleta.contorno,
      altitude: (f: object) => (visitado(f) ? 0.03 : 0.004),
      rotulo: (f: object) => {
        const pais = f as CountryFeature;
        const total = visitados.get(pais.id);
        const alpha2 = alpha2DoPais(pais);
        const nome = alpha2 ? countryName(alpha2) : pais.properties.name;
        return total
          ? `<div class="globe-tip"><strong>${nome}</strong><span>${total} ${total === 1 ? 'viagem' : 'viagens'}</span></div>`
          : `<div class="globe-tip"><strong>${nome}</strong></div>`;
      },
    };
  }, [visitados, paleta]);

  const aoFicarPronto = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !movimentoReduzido();
    controls.autoRotateSpeed = 0.4;
    const pontos = PAISES.filter((f) => visitados.has(f.id)).map((f) => ({
      lat: 0,
      lng: f.lngCentro,
    }));
    const pov = enquadrar(pontos);
    globe.pointOfView({ lat: 12, lng: pov.lng, altitude: 2.3 }, 0);
  }, [visitados]);

  return (
    <div ref={ref} className="globe-frame" role="img" aria-label="Globo com os países que você já visitou em destaque">
      {width > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={altura}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          atmosphereColor={paleta.atmosfera}
          atmosphereAltitude={0.15}
          polygonsData={PAISES}
          polygonCapColor={acessores.cap}
          polygonSideColor={acessores.lado}
          polygonStrokeColor={acessores.contorno}
          polygonAltitude={acessores.altitude}
          polygonLabel={acessores.rotulo}
          polygonsTransitionDuration={600}
          onGlobeReady={aoFicarPronto}
        />
      )}
    </div>
  );
}
