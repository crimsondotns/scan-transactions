/** จัดรูปแบบตัวเลข/เวลา ตามภาษาที่เลือก (I18nProvider ตั้งให้ตอน render) */

const LOCALES = { th: 'th-TH', en: 'en-US' } as const;
let locale: string = LOCALES.en;

export function setLocale(lang: keyof typeof LOCALES): void {
  locale = LOCALES[lang];
}

export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return '—';
  const abs = Math.abs(v);
  const digits = abs < 1 ? 4 : 2;
  return v.toLocaleString(locale, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: digits,
  });
}

export function formatAmount(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e9) return v.toLocaleString(locale, { notation: 'compact', maximumFractionDigits: 2 });
  if (abs >= 1) return v.toLocaleString(locale, { maximumFractionDigits: 4 });
  return v.toLocaleString(locale, { maximumSignificantDigits: 4 });
}

export function formatDate(unixSeconds: number): { date: string; time: string } {
  const d = new Date(unixSeconds * 1000);
  return {
    date: d.toLocaleDateString(locale, { year: '2-digit', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  };
}

export function shortAddr(a: string): string {
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function shortHash(h: string): string {
  return h.length > 14 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h;
}
