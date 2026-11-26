/**
 * Destinos de inspiração para o globo da página inicial.
 *
 * O catálogo do backend é a fonte principal (e o único que pode entrar num
 * roteiro); estes lugares completam o globo para que sempre haja fotos ao
 * girá-lo, mesmo com um catálogo pequeno. Fotos: Unsplash (licença Unsplash).
 */
export interface LugarGlobo {
  chave: string;
  nome: string;
  pais: string;
  lat: number;
  lng: number;
  foto: string;
  /** Presente quando o lugar existe no catálogo do backend. */
  destinoId?: number;
}

export function unsplash(id: string, w = 480, h = 360): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=70&auto=format`;
}

export const LUGARES_INSPIRACAO: LugarGlobo[] = [
  { chave: 'paris', nome: 'Paris', pais: 'FR', lat: 48.8566, lng: 2.3522, foto: unsplash('1502602898657-3e91760cbb34') },
  { chave: 'londres', nome: 'Londres', pais: 'GB', lat: 51.5074, lng: -0.1278, foto: unsplash('1513635269975-59663e0ac1ad') },
  { chave: 'amsterda', nome: 'Amsterdã', pais: 'NL', lat: 52.3676, lng: 4.9041, foto: unsplash('1534351590666-13e3e96b5017') },
  { chave: 'lisboa', nome: 'Lisboa', pais: 'PT', lat: 38.7223, lng: -9.1393, foto: unsplash('1585208798174-6cedd86e019a') },
  { chave: 'madri', nome: 'Madri', pais: 'ES', lat: 40.4168, lng: -3.7038, foto: unsplash('1539037116277-4db20889f2d4') },
  { chave: 'veneza', nome: 'Veneza', pais: 'IT', lat: 45.4408, lng: 12.3155, foto: unsplash('1523906834658-6e24ef2386f9') },
  { chave: 'roma', nome: 'Roma', pais: 'IT', lat: 41.9028, lng: 12.4964, foto: unsplash('1552832230-c0197dd311b5') },
  { chave: 'santorini', nome: 'Santorini', pais: 'GR', lat: 36.3932, lng: 25.4615, foto: unsplash('1570077188670-e3a8d69ac5ff') },
  { chave: 'marrakech', nome: 'Marrakech', pais: 'MA', lat: 31.6295, lng: -7.9811, foto: unsplash('1597212618440-806262de4f6b') },
  { chave: 'cidade-do-cabo', nome: 'Cidade do Cabo', pais: 'ZA', lat: -33.9249, lng: 18.4241, foto: unsplash('1580060839134-75a5edca2e99') },
  { chave: 'dubai', nome: 'Dubai', pais: 'AE', lat: 25.2048, lng: 55.2708, foto: unsplash('1512453979798-5ea266f8880c') },
  { chave: 'agra', nome: 'Agra', pais: 'IN', lat: 27.1751, lng: 78.0421, foto: unsplash('1524492412937-b28074a5d7da') },
  { chave: 'ha-long', nome: 'Baía de Ha Long', pais: 'VN', lat: 20.9101, lng: 107.1839, foto: unsplash('1528127269322-539801943592') },
  { chave: 'bali', nome: 'Bali', pais: 'ID', lat: -8.3405, lng: 115.092, foto: unsplash('1537996194471-e657df975ab4') },
  { chave: 'kyoto', nome: 'Kyoto', pais: 'JP', lat: 35.0116, lng: 135.7681, foto: unsplash('1493976040374-85c8e12f0c0e') },
  { chave: 'toquio', nome: 'Tóquio', pais: 'JP', lat: 35.6762, lng: 139.6503, foto: unsplash('1540959733332-eab4deabeeaf') },
  { chave: 'sydney', nome: 'Sydney', pais: 'AU', lat: -33.8688, lng: 151.2093, foto: unsplash('1506973035872-a4ec16b8e8d9') },
  { chave: 'sao-francisco', nome: 'São Francisco', pais: 'US', lat: 37.7749, lng: -122.4194, foto: unsplash('1501594907352-04cda38ebc29') },
  { chave: 'nova-york', nome: 'Nova York', pais: 'US', lat: 40.7128, lng: -74.006, foto: unsplash('1496442226666-8d4d0e62e6e9') },
  { chave: 'machu-picchu', nome: 'Machu Picchu', pais: 'PE', lat: -13.1631, lng: -72.545, foto: unsplash('1587595431973-160d0d94add1') },
  { chave: 'rio-de-janeiro', nome: 'Rio de Janeiro', pais: 'BR', lat: -22.9068, lng: -43.1729, foto: unsplash('1483729558449-99ef09a8c325') },
];

/** Fotos das seções de apresentação (verificadas manualmente). */
export const FOTOS = {
  individual: unsplash('1501555088652-021faa106b9b', 900, 1100),
  amigos: unsplash('1539635278303-d4002c07eae3', 900, 1100),
  familia: unsplash('1511895426328-dc8714191300', 900, 1100),
  planejamento: unsplash('1488646953014-85cb44e25828', 1400, 900),
  lago: unsplash('1476514525535-07fb3b4ae5f1', 1600, 900),
};

function normalizar(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface DestinoParaGlobo {
  id: number;
  nome: string;
  pais_codigo: string;
  latitude: string | null;
  longitude: string | null;
  foto_url: string | null;
}

/**
 * Junta catálogo e inspiração: destinos do catálogo com coordenadas entram
 * primeiro (clicáveis); lugares de inspiração com o mesmo nome são mesclados,
 * herdando o link do catálogo e mantendo a foto em alta resolução.
 */
export function montarLugaresGlobo(catalogo: DestinoParaGlobo[]): LugarGlobo[] {
  const porNome = new Map<string, LugarGlobo>();
  for (const lugar of LUGARES_INSPIRACAO) porNome.set(normalizar(lugar.nome), { ...lugar });

  for (const destino of catalogo) {
    const lat = Number(destino.latitude);
    const lng = Number(destino.longitude);
    if (destino.latitude === null || destino.longitude === null) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const chave = normalizar(destino.nome);
    const existente = porNome.get(chave);
    if (existente) {
      existente.destinoId = destino.id;
    } else if (destino.foto_url) {
      porNome.set(chave, {
        chave: `catalogo-${destino.id}`,
        nome: destino.nome,
        pais: destino.pais_codigo,
        lat,
        lng,
        foto: destino.foto_url,
        destinoId: destino.id,
      });
    }
  }
  return [...porNome.values()];
}

const FOTO_POR_NOME = new Map(LUGARES_INSPIRACAO.map((l) => [normalizar(l.nome), l.foto]));

/** Foto para um destino do catálogo: a do backend, ou a de inspiração com o mesmo nome. */
export function fotoDoDestino(nome: string, fotoUrl: string | null | undefined): string | null {
  return fotoUrl || FOTO_POR_NOME.get(normalizar(nome)) || null;
}

/**
 * Fotos do Unsplash embutidas em public/fotos/ (licença Unsplash permite).
 * Em algumas redes o navegador não consegue conectar ao CDN do Unsplash; com as
 * cópias locais, o globo e as capas da demonstração não dependem dessa conexão.
 * Nome do arquivo: <id da foto>-mini.jpg (480×360) ou <id>-grande.jpg.
 */
const FOTOS_LOCAIS = new Set([
  '1476514525535-07fb3b4ae5f1-grande.jpg',
  '1483729558449-99ef09a8c325-grande.jpg',
  '1483729558449-99ef09a8c325-mini.jpg',
  '1493976040374-85c8e12f0c0e-grande.jpg',
  '1493976040374-85c8e12f0c0e-mini.jpg',
  '1496442226666-8d4d0e62e6e9-grande.jpg',
  '1496442226666-8d4d0e62e6e9-mini.jpg',
  '1501555088652-021faa106b9b-grande.jpg',
  '1501594907352-04cda38ebc29-mini.jpg',
  '1502602898657-3e91760cbb34-grande.jpg',
  '1502602898657-3e91760cbb34-mini.jpg',
  '1506973035872-a4ec16b8e8d9-mini.jpg',
  '1511895426328-dc8714191300-grande.jpg',
  '1512453979798-5ea266f8880c-mini.jpg',
  '1513635269975-59663e0ac1ad-mini.jpg',
  '1523906834658-6e24ef2386f9-mini.jpg',
  '1524492412937-b28074a5d7da-mini.jpg',
  '1528127269322-539801943592-mini.jpg',
  '1534351590666-13e3e96b5017-grande.jpg',
  '1534351590666-13e3e96b5017-mini.jpg',
  '1537996194471-e657df975ab4-mini.jpg',
  '1539037116277-4db20889f2d4-mini.jpg',
  '1539635278303-d4002c07eae3-grande.jpg',
  '1540959733332-eab4deabeeaf-grande.jpg',
  '1540959733332-eab4deabeeaf-mini.jpg',
  '1552832230-c0197dd311b5-grande.jpg',
  '1552832230-c0197dd311b5-mini.jpg',
  '1570077188670-e3a8d69ac5ff-grande.jpg',
  '1570077188670-e3a8d69ac5ff-mini.jpg',
  '1580060839134-75a5edca2e99-mini.jpg',
  '1585208798174-6cedd86e019a-grande.jpg',
  '1585208798174-6cedd86e019a-mini.jpg',
  '1587595431973-160d0d94add1-mini.jpg',
  '1597212618440-806262de4f6b-mini.jpg',
]);

/** Troca uma URL do Unsplash pela cópia local, quando existe; senão devolve a original. */
export function resolverFoto(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  const achado = url.match(/^https:\/\/images\.unsplash\.com\/photo-([\w-]+)(?:\?(.*))?$/);
  if (!achado) return url;
  const largura = Number(new URLSearchParams(achado[2] ?? '').get('w') ?? 0);
  const ordem = largura > 600 ? ['grande', 'mini'] : ['mini', 'grande'];
  for (const variante of ordem) {
    const nome = `${achado[1]}-${variante}.jpg`;
    if (FOTOS_LOCAIS.has(nome)) return `/fotos/${nome}`;
  }
  return url;
}

/** Versão em alta resolução, quando o destino coincide com um lugar de inspiração. */
export function fotoGrandeDoDestino(nome: string, fotoUrl: string | null | undefined): string | null {
  const inspiracao = FOTO_POR_NOME.get(normalizar(nome));
  if (inspiracao) return inspiracao.replace('w=480&h=360', 'w=1600&h=900');
  return fotoUrl || null;
}
