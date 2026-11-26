#!/usr/bin/env node
/**
 * Prepara a demonstração do frontend a partir do seed do backend, sem alterar
 * nenhum arquivo do backend. Usa só:
 *   - o importador de catálogo do próprio backend (docker compose exec);
 *   - a API pública (login, viagens, roteiro, convites, avaliações);
 *   - o Mailpit, para aceitar os convites pelo link real do email.
 *
 * Resultado para a Ana (criador.demo@example.com):
 *   planejando  → Eurotrip (sozinha), Natal em Nova York (família) e
 *                 roadtrip pela costa leste dos EUA (amigos);
 *   concluídas  → Japão, Buenos Aires, Cancún e Florianópolis, com amigos e
 *                 família vinculados e avaliações publicadas.
 *
 * Pode ser executado de novo: apaga as viagens da Ana e recria tudo.
 * Uso (na raiz do repositório, com o docker compose no ar):
 *   node frontend/demo/preparar-demo.mjs
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.VIAJAJUNTO_API ?? 'http://localhost:8000';
const MAILPIT = process.env.VIAJAJUNTO_MAILPIT ?? 'http://localhost:8025';
const SENHA = 'DemoViaja123!';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API) && !process.argv.includes('--permitir-remoto')) {
  console.error(`Recusado: ${API} não é local. Este script apaga as viagens da conta de demonstração.`);
  process.exit(1);
}

const CONTAS = {
  ana: 'criador.demo@example.com',
  bruno: 'editor.demo@example.com',
  carla: 'visualizador.demo@example.com',
  diego: 'externo.demo@example.com',
};

/* ───────────── Roteiros ───────────── */

const VIAGENS = [
  {
    nome: 'Eurotrip de primavera',
    descricao: 'Viagem solo: quatro capitais europeias de trem, no meu ritmo.',
    inicio: '2027-04-08',
    fim: '2027-04-25',
    status: 'planejando',
    orcamento: '18000.00',
    membros: [],
    paradas: [
      {
        destino: 'Lisboa',
        chegada: '2027-04-08',
        saida: '2027-04-12',
        hospedagem: 'Hostel no Bairro Alto',
        atividades: [
          { nome: 'Torre de Belém', data: '2027-04-09', hora: '10:00', duracao: 90, custo: '65.00' },
          { nome: 'Pastéis de Belém', data: '2027-04-09', hora: '12:00', duracao: 45, custo: '35.00' },
          { nome: 'Elétrico 28', data: '2027-04-10', hora: '09:30', duracao: 60, custo: '20.00' },
        ],
      },
      {
        destino: 'Paris',
        chegada: '2027-04-12',
        saida: '2027-04-16',
        hospedagem: 'Hotel em Saint-Germain',
        atividades: [
          { nome: 'Torre Eiffel', data: '2027-04-13', hora: '18:00', duracao: 120, custo: '210.00', status: 'confirmada' },
          { nome: 'Museu do Louvre', data: '2027-04-14', hora: '09:30', duracao: 240, custo: '130.00', status: 'confirmada' },
        ],
      },
      {
        destino: 'Amsterdã',
        chegada: '2027-04-16',
        saida: '2027-04-20',
        atividades: [
          { nome: 'Museu Van Gogh', data: '2027-04-17', hora: '10:00', duracao: 150, custo: '140.00' },
          { nome: 'Passeio de barco pelos canais', data: '2027-04-18', hora: '16:00', duracao: 75, custo: '110.00' },
        ],
      },
      {
        destino: 'Roma',
        chegada: '2027-04-20',
        saida: '2027-04-25',
        atividades: [{ nome: 'Coliseu', data: '2027-04-21', hora: '09:00', duracao: 180, custo: '120.00' }],
      },
    ],
  },
  {
    nome: 'Natal em família em Nova York',
    descricao: 'Natal em família: árvore do Rockefeller, patinação no Central Park e ceia juntos.',
    inicio: '2026-12-20',
    fim: '2026-12-28',
    status: 'confirmada',
    orcamento: '22000.00',
    membros: [
      { conta: 'bruno', papel: 'editor' },
      { conta: 'carla', papel: 'visualizador' },
    ],
    paradas: [
      {
        destino: 'Nova York',
        chegada: '2026-12-20',
        saida: '2026-12-28',
        hospedagem: 'Apartamento em Midtown',
        notas: 'Combinar a ceia no dia 24 às 20h. Levar casacos para a patinação.',
        atividades: [
          { nome: 'Árvore de Natal do Rockefeller Center', data: '2026-12-21', hora: '18:00', duracao: 60, custo: '0.00', status: 'confirmada' },
          { nome: 'Patinação no Central Park', data: '2026-12-22', hora: '15:00', duracao: 120, custo: '360.00', status: 'confirmada' },
          { nome: 'Musical na Broadway', data: '2026-12-23', hora: '19:30', duracao: 150, custo: '1800.00', status: 'confirmada' },
          { nome: 'Jantar de Natal em Midtown', data: '2026-12-24', hora: '20:00', duracao: 180, custo: '950.00' },
          { nome: 'Estátua da Liberdade', data: '2026-12-26', hora: '09:00', duracao: 240, custo: '420.00' },
        ],
      },
    ],
  },
  {
    nome: 'Roadtrip pela costa leste dos EUA',
    descricao: 'De Boston a Miami de carro, com os amigos, parando nas cidades históricas.',
    inicio: '2027-07-03',
    fim: '2027-07-18',
    status: 'planejando',
    orcamento: '30000.00',
    membros: [
      { conta: 'diego', papel: 'editor' },
      { conta: 'bruno', papel: 'visualizador' },
    ],
    paradas: [
      {
        destino: 'Boston',
        chegada: '2027-07-03',
        saida: '2027-07-06',
        hospedagem: 'Airbnb em Back Bay',
        atividades: [
          { nome: 'Aluguel de carro no aeroporto Logan', data: '2027-07-03', hora: '10:00', duracao: 60, custo: '3200.00', status: 'confirmada' },
          { nome: 'Freedom Trail', data: '2027-07-04', hora: '10:00', duracao: 180, custo: '0.00' },
        ],
      },
      {
        destino: 'Nova York',
        chegada: '2027-07-06',
        saida: '2027-07-09',
        atividades: [{ nome: 'Estátua da Liberdade', data: '2027-07-07', hora: '09:00', duracao: 240, custo: '420.00' }],
      },
      {
        destino: 'Filadélfia',
        chegada: '2027-07-09',
        saida: '2027-07-10',
        atividades: [
          { nome: 'Independence Hall e Sino da Liberdade', data: '2027-07-09', hora: '15:00', duracao: 120, custo: '0.00' },
          { nome: 'Cheesesteak no Reading Terminal Market', data: '2027-07-09', hora: '19:00', duracao: 60, custo: '90.00' },
        ],
      },
      {
        destino: 'Washington',
        chegada: '2027-07-10',
        saida: '2027-07-13',
        atividades: [
          { nome: 'Capitólio dos Estados Unidos', data: '2027-07-11', hora: '10:00', duracao: 120, custo: '0.00' },
          { nome: 'Museus Smithsonian', data: '2027-07-12', hora: '10:00', duracao: 300, custo: '0.00' },
        ],
      },
      {
        destino: 'Miami',
        chegada: '2027-07-13',
        saida: '2027-07-18',
        atividades: [{ nome: 'South Beach', data: '2027-07-14', hora: '10:00', duracao: 180, custo: '0.00' }],
      },
    ],
  },
  {
    nome: 'Primavera no Japão',
    descricao: 'Viagem com os amigos para ver as cerejeiras em Tóquio e Kyoto.',
    inicio: '2026-03-28',
    fim: '2026-04-08',
    status: 'concluida',
    orcamento: '35000.00',
    membros: [
      { conta: 'bruno', papel: 'editor' },
      { conta: 'diego', papel: 'visualizador' },
    ],
    paradas: [
      {
        destino: 'Tóquio',
        chegada: '2026-03-28',
        saida: '2026-04-03',
        hospedagem: 'Hotel em Shinjuku',
        atividades: [
          { nome: 'Cruzamento de Shibuya', data: '2026-03-29', hora: '19:00', duracao: 90, custo: '0.00', status: 'concluida' },
          { nome: 'Templo Senso-ji', data: '2026-03-30', hora: '09:00', duracao: 120, custo: '0.00', status: 'concluida' },
          { nome: 'Mercado externo de Tsukiji', data: '2026-03-31', hora: '08:00', duracao: 90, custo: '180.00', status: 'concluida' },
          { nome: 'Trem-bala para Kyoto', data: '2026-04-03', hora: '10:00', duracao: 140, custo: '760.00', status: 'concluida' },
        ],
      },
      {
        destino: 'Kyoto',
        chegada: '2026-04-03',
        saida: '2026-04-08',
        hospedagem: 'Ryokan em Higashiyama',
        atividades: [
          { nome: 'Fushimi Inari-taisha', data: '2026-04-04', hora: '07:30', duracao: 180, custo: '0.00', status: 'concluida' },
          { nome: 'Caminhada por Higashiyama e Gion', data: '2026-04-05', hora: '16:00', duracao: 150, custo: '0.00', status: 'concluida' },
          { nome: 'Floresta de bambu de Arashiyama', data: '2026-04-06', hora: '08:00', duracao: 120, custo: '0.00', status: 'concluida' },
        ],
      },
    ],
    avaliacoes: [
      { conta: 'ana', atividade: 'Fushimi Inari-taisha', nota: 5, comentario: 'Chegue cedo: os portões vazios ao amanhecer valem a viagem.' },
      { conta: 'ana', atividade: 'Cruzamento de Shibuya', nota: 4, comentario: 'Caótico e divertido. A vista do Shibuya Sky é a melhor.' },
      { conta: 'bruno', atividade: 'Fushimi Inari-taisha', nota: 5, comentario: 'Subimos até o topo, cansa mas compensa.' },
      { conta: 'bruno', atividade: 'Mercado externo de Tsukiji', nota: 5, comentario: 'Melhor café da manhã da viagem.' },
      { conta: 'diego', atividade: 'Floresta de bambu de Arashiyama', nota: 4, comentario: 'Linda, mas lota depois das 9h.' },
    ],
  },
  {
    nome: 'Cancún em família',
    descricao: 'Uma semana de praia e ruínas maias com a família.',
    inicio: '2026-01-10',
    fim: '2026-01-17',
    status: 'concluida',
    orcamento: '24000.00',
    membros: [
      { conta: 'bruno', papel: 'editor' },
      { conta: 'carla', papel: 'visualizador' },
    ],
    paradas: [
      {
        destino: 'Cancún',
        chegada: '2026-01-10',
        saida: '2026-01-17',
        hospedagem: 'Resort na Zona Hoteleira',
        atividades: [
          { nome: 'Ruínas de Chichén Itzá', data: '2026-01-12', hora: '07:00', duracao: 600, custo: '780.00', status: 'concluida' },
          { nome: 'Mergulho em Isla Mujeres', data: '2026-01-13', hora: '09:00', duracao: 360, custo: '620.00', status: 'concluida' },
          { nome: 'Praia de Playa Delfines', data: '2026-01-14', hora: '10:00', duracao: 240, custo: '0.00', status: 'concluida' },
          { nome: 'Jantar de frutos do mar na lagoa', data: '2026-01-15', hora: '20:00', duracao: 120, custo: '540.00', status: 'concluida' },
        ],
      },
    ],
    avaliacoes: [
      { conta: 'ana', atividade: 'Ruínas de Chichén Itzá', nota: 5, comentario: 'Dia longo, mas as crianças adoraram.' },
      { conta: 'carla', atividade: 'Mergulho em Isla Mujeres', nota: 5, comentario: 'Água cristalina e muitas tartarugas.' },
      { conta: 'bruno', atividade: 'Praia de Playa Delfines', nota: 4, comentario: 'Mar forte, mas a vista é incrível.' },
    ],
  },
  {
    nome: 'Carnaval em Florianópolis',
    descricao: 'Feriado de Carnaval com os amigos na ilha.',
    inicio: '2026-02-13',
    fim: '2026-02-18',
    status: 'concluida',
    orcamento: '6000.00',
    membros: [
      { conta: 'diego', papel: 'editor' },
      { conta: 'carla', papel: 'visualizador' },
    ],
    paradas: [
      {
        destino: 'Florianópolis',
        chegada: '2026-02-13',
        saida: '2026-02-18',
        hospedagem: 'Casa alugada na Lagoa da Conceição',
        atividades: [
          { nome: 'Praia da Joaquina', data: '2026-02-14', hora: '10:00', duracao: 300, custo: '0.00', status: 'concluida' },
          { nome: 'Lagoa da Conceição', data: '2026-02-15', hora: '16:00', duracao: 180, custo: '0.00', status: 'concluida' },
          { nome: 'Ostras no Ribeirão da Ilha', data: '2026-02-16', hora: '13:00', duracao: 120, custo: '320.00', status: 'concluida' },
          { nome: 'Ponte Hercílio Luz', data: '2026-02-17', hora: '18:00', duracao: 60, custo: '0.00', status: 'concluida' },
        ],
      },
    ],
    avaliacoes: [
      { conta: 'ana', atividade: 'Ostras no Ribeirão da Ilha', nota: 5, comentario: 'As melhores ostras que já comi.' },
      { conta: 'diego', atividade: 'Praia da Joaquina', nota: 4, comentario: 'Ótima para surfe; vá cedo para estacionar.' },
    ],
  },
  {
    nome: 'Fim de semana em Buenos Aires',
    descricao: 'Tango, parrilla e museus com a Carla.',
    inicio: '2026-07-09',
    fim: '2026-07-13',
    status: 'concluida',
    orcamento: '7000.00',
    membros: [{ conta: 'carla', papel: 'editor' }],
    paradas: [
      {
        destino: 'Buenos Aires',
        chegada: '2026-07-09',
        saida: '2026-07-13',
        hospedagem: 'Hotel em Palermo Soho',
        atividades: [
          { nome: 'Caminito, em La Boca', data: '2026-07-10', hora: '10:00', duracao: 120, custo: '0.00', status: 'concluida' },
          { nome: 'Teatro Colón', data: '2026-07-10', hora: '15:00', duracao: 90, custo: '160.00', status: 'concluida' },
          { nome: 'Show de tango em San Telmo', data: '2026-07-11', hora: '21:00', duracao: 150, custo: '450.00', status: 'concluida' },
          { nome: 'Parrilla em Palermo', data: '2026-07-12', hora: '20:30', duracao: 120, custo: '280.00', status: 'concluida' },
        ],
      },
    ],
    avaliacoes: [
      { conta: 'ana', atividade: 'Show de tango em San Telmo', nota: 5, comentario: 'Imperdível. Reserve com antecedência.' },
      { conta: 'carla', atividade: 'Parrilla em Palermo', nota: 5, comentario: 'Bife de chorizo perfeito.' },
      { conta: 'carla', atividade: 'Caminito, em La Boca', nota: 4, comentario: 'Colorido e cheio de vida; bom para fotos.' },
    ],
  },
];

/*
 * Viagens já feitas por Bruno, Carla e Diego pelos destinos populares da página
 * inicial. Existem para que esses destinos tenham avaliações reais na API.
 * Cada atividade com `nota` é avaliada pelo dono da viagem.
 */
const av = (nota, comentario = null) => ({ nota, comentario });

const VIAGENS_VIAJANTES = [
  {
    dono: 'bruno',
    nome: 'Volta ao mundo em 2025',
    descricao: 'Cinco semanas de mochilão por três continentes.',
    inicio: '2025-04-01',
    fim: '2025-05-06',
    status: 'concluida',
    paradas: [
      ['Nova York', '2025-04-01', '2025-04-05', [['Estátua da Liberdade', av(5, 'Vá na primeira balsa do dia.')], ['Musical na Broadway', av(5)]]],
      ['Londres', '2025-04-05', '2025-04-09', [['Museu Britânico', av(5, 'Dá para passar o dia inteiro.')], ['London Eye', av(4)]]],
      ['Paris', '2025-04-09', '2025-04-13', [['Torre Eiffel', av(5)], ['Museu do Louvre', av(4, 'Lotado, mas imperdível.')]]],
      ['Istambul', '2025-04-13', '2025-04-17', [['Santa Sofia', av(5, 'Impressionante por dentro.')], ['Cruzeiro pelo Bósforo', av(5)]]],
      ['Antalya', '2025-04-17', '2025-04-20', [['Kaleiçi, a cidade velha', av(4)], ['Praia de Konyaaltı', av(5, 'Mar azul com as montanhas atrás.')]]],
      ['Dubai', '2025-04-20', '2025-04-23', [['Burj Khalifa', av(5, 'Reserve o horário do pôr do sol.')], ['Safári no deserto', av(4)]]],
      ['Bangkok', '2025-04-23', '2025-04-27', [['Wat Arun', av(5)], ['Comida de rua em Yaowarat', av(5, 'A melhor comida da viagem.')]]],
      ['Kuala Lumpur', '2025-04-27', '2025-04-30', [['Batu Caves', av(4, 'Muitos degraus, cuidado com os macacos.')], ['Torres Petronas', av(4)]]],
      ['Hong Kong', '2025-04-30', '2025-05-04', [['Victoria Peak', av(5, 'Suba no fim da tarde e fique para a noite.')], ['Star Ferry pela baía', av(4)]]],
      ['Macau', '2025-05-04', '2025-05-06', [['Ruínas de São Paulo', av(4)], ['Largo do Senado', av(4)]]],
    ],
  },
  {
    dono: 'carla',
    nome: 'Europa e Oriente Médio',
    descricao: 'Férias de setembro entre Londres, Paris, Turquia e Dubai.',
    inicio: '2025-09-05',
    fim: '2025-09-25',
    status: 'concluida',
    paradas: [
      ['Londres', '2025-09-05', '2025-09-09', [['Museu Britânico', av(5)], ['London Eye', av(5, 'Vista linda do Parlamento.')]]],
      ['Paris', '2025-09-09', '2025-09-13', [['Torre Eiffel', av(5, 'Subimos à noite, mágico.')], ['Museu do Louvre', av(5)]]],
      ['Istambul', '2025-09-13', '2025-09-17', [['Santa Sofia', av(5)], ['Cruzeiro pelo Bósforo', av(5, 'Melhor jeito de ver a cidade.')]]],
      ['Antalya', '2025-09-17', '2025-09-21', [['Kaleiçi, a cidade velha', av(5, 'Ruelas charmosas e ótimos restaurantes.')], ['Praia de Konyaaltı', av(4)]]],
      ['Dubai', '2025-09-21', '2025-09-25', [['Burj Khalifa', av(4)], ['Safári no deserto', av(4, 'Divertido, mas muito quente em setembro.')]]],
    ],
  },
  {
    dono: 'diego',
    nome: 'Ásia e Nova York',
    descricao: 'Viagem a trabalho que virou férias.',
    inicio: '2025-11-01',
    fim: '2025-11-22',
    status: 'concluida',
    paradas: [
      ['Nova York', '2025-11-01', '2025-11-05', [['Estátua da Liberdade', av(4)], ['Musical na Broadway', av(5, 'Vale cada centavo.')]]],
      ['Bangkok', '2025-11-05', '2025-11-10', [['Wat Arun', av(5, 'Lindo ao entardecer, visto do outro lado do rio.')], ['Comida de rua em Yaowarat', av(4)]]],
      ['Kuala Lumpur', '2025-11-10', '2025-11-14', [['Batu Caves', av(5)], ['Torres Petronas', av(4)]]],
      ['Hong Kong', '2025-11-14', '2025-11-19', [['Victoria Peak', av(5)], ['Star Ferry pela baía', av(5, 'Barato e com a melhor vista.')]]],
      ['Macau', '2025-11-19', '2025-11-22', [['Ruínas de São Paulo', av(5, 'Fácil de visitar a pé desde o Largo do Senado.')], ['Largo do Senado', av(4)]]],
    ],
  },
];

/* ───────────── Infraestrutura ───────────── */

const log = (...m) => console.log('·', ...m);
const enc = encodeURIComponent;

async function api(method, caminho, token, body) {
  const res = await fetch(API + caminho, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await res.text();
  const dados = texto ? JSON.parse(texto) : undefined;
  if (!res.ok) {
    const detalhe = typeof dados?.detail === 'string' ? dados.detail : JSON.stringify(dados?.detail);
    throw new Error(`${method} ${caminho} → ${res.status}: ${detalhe}`);
  }
  return dados;
}

async function entrar(email) {
  const { access_token: token } = await api('POST', '/auth/login', undefined, { email, senha: SENHA });
  const eu = await api('GET', '/usuarios/me', token);
  return { token, id: eu.id, nome: eu.nome, email };
}

async function todasAsViagens(token) {
  const viagens = [];
  for (let pagina = 1; ; pagina++) {
    const r = await api('GET', `/viagens?pagina=${pagina}&tamanho_pagina=100`, token);
    viagens.push(...r.itens);
    if (!r.tem_proxima) return viagens;
  }
}

function importarCatalogo(arquivo) {
  const json = readFileSync(path.join(AQUI, arquivo));
  const r = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'api', 'python', '-m', 'app.adapters.inbound.cli.importar_catalogo'],
    { cwd: RAIZ, input: json },
  );
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  if (r.status !== 0) throw new Error(`Falha ao importar o catálogo: ${saida || r.error}`);
  log(saida);
}

// O importador recusa repetir `id_externo`; cada arquivo é importado uma única vez.
const CATALOGOS = [
  { arquivo: 'catalogo-demo.json', marcador: 'Tóquio' },
  { arquivo: 'catalogo-populares.json', marcador: 'Bangkok' },
];

async function garantirCatalogo() {
  for (const { arquivo, marcador } of CATALOGOS) {
    const r = await api('GET', `/catalogo/destinos?nome=${enc(marcador)}`);
    if (r.itens.some((d) => d.nome === marcador)) log(`${arquivo}: já importado.`);
    else importarCatalogo(arquivo);
  }
}

const cacheDestinos = new Map();
async function destinoDoCatalogo(nome) {
  if (!cacheDestinos.has(nome)) {
    const r = await api('GET', `/catalogo/destinos?nome=${enc(nome)}&tamanho_pagina=100`);
    const destino = r.itens.find((d) => d.nome === nome);
    if (!destino) throw new Error(`Destino “${nome}” não está no catálogo.`);
    const atividades = await api(
      'GET',
      `/catalogo/atividades?destino_catalogo_id=${destino.id}&tamanho_pagina=100`,
    );
    cacheDestinos.set(nome, { id: destino.id, atividades: new Map(atividades.itens.map((a) => [a.nome, a.id])) });
  }
  return cacheDestinos.get(nome);
}

async function idsNoMailpit(email) {
  const r = await fetch(`${MAILPIT}/api/v1/messages?limit=500`).then((x) => x.json());
  return new Set(
    (r.messages ?? []).filter((m) => m.To?.some((t) => t.Address === email)).map((m) => m.ID),
  );
}

async function tokenDoConvite(email, antes) {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const r = await fetch(`${MAILPIT}/api/v1/messages?limit=50`).then((x) => x.json());
    const nova = (r.messages ?? []).find(
      (m) => !antes.has(m.ID) && m.To?.some((t) => t.Address === email),
    );
    if (nova) {
      const corpo = await fetch(`${MAILPIT}/api/v1/message/${nova.ID}`).then((x) => x.json());
      const achado = `${corpo.Text ?? ''} ${corpo.HTML ?? ''}`.match(/convite\?token=([\w\-%.~]+)/);
      if (achado) return decodeURIComponent(achado[1]);
    }
    await new Promise((ok) => setTimeout(ok, 300));
  }
  throw new Error(`O email de convite para ${email} não chegou ao Mailpit.`);
}

/* ───────────── Execução ───────────── */

async function main() {
  log(`API ${API} · Mailpit ${MAILPIT}`);
  await garantirCatalogo();

  const contas = {};
  for (const [chave, email] of Object.entries(CONTAS)) contas[chave] = await entrar(email);
  const ana = contas.ana;
  const porId = new Map(Object.values(contas).map((c) => [c.id, c]));

  // 1. Limpa: apaga as viagens da Ana e a tira das viagens de outras pessoas.
  for (const v of await todasAsViagens(ana.token)) {
    if (v.papel_usuario === 'criador') {
      await api('DELETE', `/viagens/${v.id}`, ana.token);
      log(`Apagada: ${v.nome}`);
    } else {
      const dono = porId.get(v.criador_id);
      if (!dono) {
        log(`Mantida (dono fora das contas de demonstração): ${v.nome}`);
        continue;
      }
      await api('DELETE', `/viagens/${v.id}/membros/${ana.id}`, dono.token);
      log(`Ana saiu de “${v.nome}” (de ${dono.nome})`);
    }
  }

  // 2. Recria os roteiros.
  for (const spec of VIAGENS) {
    const viagem = await api('POST', '/viagens', ana.token, {
      nome: spec.nome,
      descricao: spec.descricao,
      data_inicio: spec.inicio,
      data_fim: spec.fim,
    });
    const ocorrencias = new Map();

    for (const p of spec.paradas) {
      const catalogo = await destinoDoCatalogo(p.destino);
      const parada = await api('POST', `/viagens/${viagem.id}/destinos`, ana.token, {
        destino_catalogo_id: catalogo.id,
        data_chegada: p.chegada,
        data_saida: p.saida,
        hospedagem: p.hospedagem ?? null,
        descricao: p.notas ?? null,
      });
      for (const a of p.atividades) {
        const catalogoAtividade = catalogo.atividades.get(a.nome);
        if (!catalogoAtividade) throw new Error(`Atividade “${a.nome}” não existe em ${p.destino}.`);
        const criada = await api('POST', `/viagens/${viagem.id}/destinos/${parada.id}/atividades`, ana.token, {
          catalogo_atividade_id: catalogoAtividade,
          data: a.data,
          hora_inicio: a.hora ?? null,
          duracao_minutos: a.duracao ?? null,
          custo_previsto: a.custo ?? '0.00',
          status: a.status ?? 'pendente',
        });
        ocorrencias.set(a.nome, { parada: parada.id, atividade: criada.id });
      }
    }

    if (spec.orcamento) {
      await api('PUT', `/viagens/${viagem.id}/orcamento`, ana.token, { valor_total: spec.orcamento });
    }

    for (const m of spec.membros) {
      const pessoa = contas[m.conta];
      const antes = await idsNoMailpit(pessoa.email);
      await api('POST', `/viagens/${viagem.id}/convites`, ana.token, { email: pessoa.email });
      const token = await tokenDoConvite(pessoa.email, antes);
      await api('POST', '/viagens/convites/aceitar', pessoa.token, { token });
      if (m.papel === 'editor') {
        await api('PATCH', `/viagens/${viagem.id}/membros/${pessoa.id}`, ana.token, { papel: 'editor' });
      }
    }

    for (const av of spec.avaliacoes ?? []) {
      const o = ocorrencias.get(av.atividade);
      await api(
        'PUT',
        `/viagens/${viagem.id}/destinos/${o.parada}/atividades/${o.atividade}/avaliacao`,
        contas[av.conta].token,
        { nota: av.nota, comentario: av.comentario },
      );
    }

    if (spec.status !== 'planejando') {
      await api('PATCH', `/viagens/${viagem.id}`, ana.token, { status: spec.status });
    }

    const quem = spec.membros.map((m) => `${contas[m.conta].nome.split(' ')[0]} (${m.papel})`).join(', ');
    log(`Criada: ${spec.nome} [${spec.status}]${quem ? ` com ${quem}` : ' — sozinha'}`);
  }

  // 3. Viagens já feitas pelos amigos nos destinos populares, com avaliações.
  const nomesViajantes = new Set(VIAGENS_VIAJANTES.map((v) => v.nome));
  for (const conta of new Set(VIAGENS_VIAJANTES.map((v) => v.dono))) {
    const dono = contas[conta];
    for (const v of await todasAsViagens(dono.token)) {
      if (v.papel_usuario === 'criador' && nomesViajantes.has(v.nome)) {
        await api('DELETE', `/viagens/${v.id}`, dono.token);
      }
    }
  }
  for (const spec of VIAGENS_VIAJANTES) {
    const dono = contas[spec.dono];
    const viagem = await api('POST', '/viagens', dono.token, {
      nome: spec.nome,
      descricao: spec.descricao,
      data_inicio: spec.inicio,
      data_fim: spec.fim,
    });
    let avaliacoes = 0;
    for (const [nomeDestino, chegada, saida, atividades] of spec.paradas) {
      const catalogo = await destinoDoCatalogo(nomeDestino);
      const parada = await api('POST', `/viagens/${viagem.id}/destinos`, dono.token, {
        destino_catalogo_id: catalogo.id,
        data_chegada: chegada,
        data_saida: saida,
      });
      for (const [nomeAtividade, avaliacao] of atividades) {
        const catalogoAtividade = catalogo.atividades.get(nomeAtividade);
        if (!catalogoAtividade) throw new Error(`Atividade “${nomeAtividade}” não existe em ${nomeDestino}.`);
        const criada = await api('POST', `/viagens/${viagem.id}/destinos/${parada.id}/atividades`, dono.token, {
          catalogo_atividade_id: catalogoAtividade,
          data: chegada,
          status: 'concluida',
        });
        await api(
          'PUT',
          `/viagens/${viagem.id}/destinos/${parada.id}/atividades/${criada.id}/avaliacao`,
          dono.token,
          avaliacao,
        );
        avaliacoes += 1;
      }
    }
    await api('PATCH', `/viagens/${viagem.id}`, dono.token, { status: spec.status });
    log(`Criada: ${spec.nome} [${dono.nome.split(' ')[0]}] — ${avaliacoes} avaliações`);
  }

  // 4. Começa a demonstração sem uma pilha de avisos gerados pela própria carga.
  for (const c of Object.values(contas)) await api('POST', '/notificacoes/marcar-todas-lidas', c.token);

  const paises = await api('GET', '/usuarios/me/paises-visitados', ana.token);
  log(`Pronto. Países visitados pela Ana: ${paises.paises.map((p) => p.pais_codigo).join(', ')}`);
}

main().catch((erro) => {
  console.error('\nFalhou:', erro.message);
  process.exit(1);
});
