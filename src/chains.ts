/**
 * รายชื่อเชน (ชื่อ/โลโก้/explorer) — จาก URL ที่ผู้ใช้วางใน Settings ก่อน แล้ว fallback เป็น
 * `<origin>/v1/chain/list` ของแหล่งประวัติแต่ละแหล่ง ไม่มี host ใดฝังในโค้ด; ล้มเหลวก็แค่ใช้ตัวอักษรแทน
 * cache ใน localStorage 24 ชม. ต่อ origin
 */
import { useEffect, useState } from 'react';
import type { Settings } from './store';

export interface ChainInfo {
  id: string;
  name: string;
  logo: string | null;
  explorer: string | null;
  symbol: string | null;
}

const KEY = 'xcap.scan.chains.v1';
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
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(String(res.status));
  const chains = normalize(await res.json());
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
    ...(/^https:\/\//i.test(settings.chainListUrl) ? [settings.chainListUrl] : []),
    ...new Set(
      settings.endpoints
        .filter((e) => e.enabled)
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
      for (const list of lists) for (const c of list) if (!m.has(c.id)) m.set(c.id, c);
      setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [urls]);

  return map;
}
