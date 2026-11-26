const LOCALE = 'pt-BR';

/** Converte "AAAA-MM-DD" em Date local, sem o deslocamento de fuso do construtor ISO. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

const fmtDay = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const fmtDayYear = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const fmtWeekday = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const fmtLong = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });

const limpar = (s: string) => s.replace(/\./g, '').replace(/ de /g, ' ');

export function formatDate(iso: string, withYear = false): string {
  return limpar((withYear ? fmtDayYear : fmtDay).format(parseDate(iso)));
}

export function formatLongDate(iso: string): string {
  return fmtLong.format(parseDate(iso));
}

export function formatWeekday(iso: string): string {
  const s = fmtWeekday.format(parseDate(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatRange(inicio: string, fim: string): string {
  if (inicio === fim) return formatDate(inicio, true);
  const a = parseDate(inicio);
  const b = parseDate(fim);
  if (a.getFullYear() === b.getFullYear()) {
    return `${formatDate(inicio)} – ${formatDate(fim, true)}`;
  }
  return `${formatDate(inicio, true)} – ${formatDate(fim, true)}`;
}

export function diffDays(inicio: string, fim: string): number {
  const ms = parseDate(fim).getTime() - parseDate(inicio).getTime();
  return Math.round(ms / 86_400_000);
}

export function tripDays(inicio: string, fim: string): number {
  return diffDays(inicio, fim) + 1;
}

export function daysUntil(iso: string): number {
  return Math.round((parseDate(iso).getTime() - today().getTime()) / 86_400_000);
}

export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

const brl = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: string | number | null | undefined, compact = false): string {
  return (compact ? brlCompact : brl).format(toNumber(value));
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${toNumber(value).toLocaleString(LOCALE, { maximumFractionDigits: 1 })}%`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

export function relativeTime(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'agora';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return limpar(fmtDayYear.format(new Date(iso)));
}

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames([LOCALE], { type: 'region' });
} catch {
  regionNames = null;
}

export function countryName(code: string | null | undefined): string {
  if (!code) return '';
  try {
    return regionNames?.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #0a84ff, #13a9a4)',
  'linear-gradient(135deg, #13a9a4, #1fbf6a)',
  'linear-gradient(135deg, #0071e3, #5e5ce6)',
  'linear-gradient(135deg, #1fbf6a, #8fd14f)',
  'linear-gradient(135deg, #0a84ff, #64d2ff)',
  'linear-gradient(135deg, #0b6e99, #1fbf6a)',
];

export function avatarGradient(seed: number | string): string {
  const n =
    typeof seed === 'number' ? seed : [...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[Math.abs(n) % AVATAR_GRADIENTS.length];
}

/** Converte texto digitado ("1.234,50" ou "1234.5") em decimal com ponto e duas casas. */
export function parseMoneyInput(raw: string): string | null {
  const cleaned = raw.trim().replace(/[R$\s]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}
