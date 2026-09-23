/**
 * รายชื่อเชน (ชื่อ/โลโก้/explorer) — จาก URL ที่ผู้ใช้วางใน Settings ก่อน แล้ว fallback เป็น
 * `<origin>/v1/chain/list` ของแหล่งประวัติแต่ละแหล่ง ไม่มี host ใดฝังในโค้ด; ล้มเหลวก็แค่ใช้ตัวอักษรแทน
 * cache ใน localStorage 24 ชม. ต่อ origin
 */
import { useEffect, useState } from 'react';
import { requestUrl, usableUrl } from './proxy';
import { limitedFetch } from './limiter';
import type { Settings } from './store';

/** หา chain โดยไม่สนตัวพิมพ์ (แหล่งบางแห่งส่ง 'Sol'/'SOL') */
export function chainOf(map: ChainMap, id: string): ChainInfo | undefined {
  return map.get(id) ?? map.get(id.toLowerCase());
}

export interface ChainInfo {
  id: string;
  name: string;
  logo: string | null;
  explorer: string | null;
  symbol: string | null;
}

const KEY = 'xcap.scan.chains.v1';
const FAIL_KEY = 'xcap.scan.chains.fail';
const FAIL_TTL = 60 * 60 * 1000;
const TTL = 24 * 3600 * 1000;
const PATH = '/v1/chain/list';

type Dict = Record<string, unknown>;
const isObj = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const https = (v: unknown): string | null => (typeof v === 'string' && /^https:\/\//i.test(v) ? v : null);

function normalize(body: unknown): ChainInfo[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.data) ? body.data : isObj(body) && isObj(body.data) && Array.isArray(body.data.chains) ? body.data.chains : [];
  const out: ChainInfo[] = [];
  for (const c of list) {
    if (!isObj(c)) continue;
    const id = str(c.id);
    if (!id) continue;
    out.push({ id, name: str(c.name) ?? id, logo: https(c.logo_url), explorer: https(c.explorer_host), symbol: str(c.token_symbol) });
  }
  return out;
}

interface Cache {
  [origin: string]: { at: number; chains: ChainInfo[] };
}

function readCache(): Cache {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Cache) ?? {};
  } catch {
    return {};
  }
}

async function fetchList(url: string): Promise<ChainInfo[]> {
  const cache = readCache();
  const hit = cache[url];
  if (hit && Date.now() - hit.at < TTL && hit.chains.length) return hit.chains;
  // เคยล้มเหลวภายใน 1 ชม. (CORS/404) → ไม่ยิงซ้ำทุกครั้งที่เปิดหน้า
  let fails: Record<string, number> = {};
  try {
    fails = (JSON.parse(localStorage.getItem(FAIL_KEY) ?? '{}') as Record<string, number>) ?? {};
  } catch {
    /* ไม่มี storage */
  }
  if (!hit?.chains.length && fails[url] && Date.now() - fails[url] < FAIL_TTL) return [];
  let chains: ChainInfo[] = [];
  try {
    const res = await limitedFetch(requestUrl(url), { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    chains = normalize(await res.json());
  } catch (e) {
    // โหลดใหม่ไม่ได้ (หมดอายุ 24 ชม. แล้วแหล่งตอบ error/CORS) → ใช้ของเก่าที่เคยได้ต่อไป ดีกว่าหายไปทั้งชื่อ/โลโก้/explorer
    if (hit?.chains.length) return hit.chains;
    try {
      localStorage.setItem(FAIL_KEY, JSON.stringify({ ...fails, [url]: Date.now() }));
    } catch {
      /* ignore */
    }
    throw e;
  }
  if (!chains.length && hit?.chains.length) return hit.chains;
  if (chains.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...cache, [url]: { at: Date.now(), chains } }));
    } catch {
      /* ignore */
    }
  }
  return chains;
}

export type ChainMap = Map<string, ChainInfo>;

/** URL ที่ผู้ใช้วางมาก่อน แล้วค่อย <origin>/v1/chain/list ของแต่ละแหล่ง */
export function useChains(settings: Settings): ChainMap {
  const [map, setMap] = useState<ChainMap>(new Map());
  const urls = [
    ...(usableUrl(settings.chainListUrl) ? [settings.chainListUrl] : []),
    ...new Set(
      settings.endpoints
        // fallback <origin>/v1/chain/list มีเฉพาะแหล่งตระกูล ERC-20 — แหล่ง Solana ไม่มี path นี้ ยิงไปก็โดน CORS/404 ในคอนโซลเปล่าๆ
        .filter((e) => e.enabled && e.family === 'erc20')
        .flatMap((e) => {
          try {
            return [new URL(e.url).origin + PATH];
          } catch {
            return [];
          }
        })
    ),
  ].join('|');

  useEffect(() => {
    let alive = true;
    if (!urls) {
      setMap(new Map());
      return;
    }
    void Promise.all(urls.split('|').map((u) => fetchList(u).catch(() => [] as ChainInfo[]))).then((lists) => {
      if (!alive) return;
      const m: ChainMap = new Map();
      for (const list of lists) for (const c of list) if (!m.has(c.id.toLowerCase())) m.set(c.id.toLowerCase(), { ...c, id: c.id.toLowerCase() });
      setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [urls]);

  // เชนที่ผู้ใช้กำหนดเอง ทับ/เติมของที่ได้จาก chain list
  const overrides = JSON.stringify(settings.chains);
  const [merged, setMerged] = useState<ChainMap>(map);
  useEffect(() => {
    const m: ChainMap = new Map(map);
    for (const o of settings.chains) {
      const base = m.get(o.id);
      m.set(o.id, { id: o.id, name: o.name || base?.name || o.id, logo: https(o.logo) ?? base?.logo ?? null, explorer: https(o.explorer) ?? base?.explorer ?? null, symbol: base?.symbol ?? null });
    }
    setMerged(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, overrides]);

  return merged;
}
