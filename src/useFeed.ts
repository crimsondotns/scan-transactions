/**
 * สถานะการโหลดต่อกระเป๋า — แต่ละกระเป๋าถูกยิงไปทุกแหล่งข้อมูลที่เปิดอยู่และตรงตระกูลเชน
 * แถวจากหลายแหล่งรวมกันแล้วตัดซ้ำด้วย key; cursor/error เก็บแยกต่อแหล่ง
 * อยู่ในหน่วยความจำเท่านั้น (รีเฟรชแล้วโหลดใหม่) ไม่มีการจดธุรกรรมลงเครื่อง
 */
import { useCallback, useRef, useState } from 'react';
import { FeedError, fetchPage, type Cursor, type TxRow } from './feed';
import type { Endpoint, Settings, Wallet } from './store';

export interface WalletFeed {
  rows: TxRow[];
  /** cursor ต่อแหล่งข้อมูล; undefined = ยังไม่โหลด, null = หมดแล้ว */
  next: Record<string, Cursor | null | undefined>;
  errors: Record<string, FeedError>;
  loading: boolean;
  loaded: boolean;
}

const EMPTY: WalletFeed = { rows: [], next: {}, errors: {}, loading: false, loaded: false };

export function endpointsFor(w: Wallet, settings: Settings): Endpoint[] {
  return settings.endpoints.filter((e) => e.enabled && e.family === w.family);
}

export function useFeed(settings: Settings) {
  const [feeds, setFeeds] = useState<Record<string, WalletFeed>>({});
  const inflight = useRef(new Set<string>());
  const latest = useRef(feeds);
  latest.current = feeds;

  const load = useCallback(
    async (w: Wallet, mode: 'reset' | 'older') => {
      const eps = endpointsFor(w, settings);
      if (!eps.length || inflight.current.has(w.id)) return;
      inflight.current.add(w.id);
      const cur = latest.current[w.id] ?? EMPTY;
      setFeeds((s) => ({ ...s, [w.id]: { ...(s[w.id] ?? EMPTY), loading: true, errors: {} } }));

      const results = await Promise.all(
        eps.map(async (ep) => {
          const c = mode === 'older' ? cur.next[ep.id] : null;
          if (mode === 'older' && c === null) return { ep, page: null, error: null };
          try {
            return { ep, page: await fetchPage(ep.url, w.id, w.address, c ?? null, settings.pageSize), error: null };
          } catch (e) {
            return { ep, page: null, error: e instanceof FeedError ? e : new FeedError('net') };
          }
        })
      );

      setFeeds((s) => {
        const prev = s[w.id] ?? EMPTY;
        const rows = mode === 'older' ? [...prev.rows] : [];
        const seen = new Set(rows.map((r) => r.key));
        const next: WalletFeed['next'] = mode === 'older' ? { ...prev.next } : {};
        const errors: WalletFeed['errors'] = {};
        for (const r of results) {
          if (r.error) {
            errors[r.ep.id] = r.error;
            continue;
          }
          if (!r.page) continue;
          let grew = false;
          for (const row of r.page.rows) {
            if (seen.has(row.key)) continue;
            seen.add(row.key);
            rows.push(row);
            grew = true;
          }
          next[r.ep.id] = grew && r.page.rows.length >= settings.pageSize ? r.page.next : null;
        }
        return { ...s, [w.id]: { rows, next, errors, loading: false, loaded: true } };
      });
      inflight.current.delete(w.id);
    },
    [settings]
  );

  const loadMany = useCallback(
    (ws: Wallet[], mode: 'reset' | 'older') => {
      // ยิงทีละ 4 กระเป๋า ไม่ให้แหล่งข้อมูลโดนรุมตอนนำเข้ากระเป๋าเป็นร้อย
      let i = 0;
      const worker = async () => {
        while (i < ws.length) {
          const w = ws[i++];
          if (w) await load(w, mode);
        }
      };
      return Promise.all(Array.from({ length: Math.min(4, ws.length) }, worker));
    },
    [load]
  );

  const forget = useCallback((id: string) => {
    setFeeds((s) => {
      const { [id]: _drop, ...rest } = s;
      return rest;
    });
  }, []);

  return { feeds, load, loadMany, forget };
}

export function hasOlder(f: WalletFeed | undefined): boolean {
  return !!f?.loaded && Object.values(f.next).some((c) => c !== null && c !== undefined);
}
