/**
 * สถานะการโหลดต่อกระเป๋า — แต่ละกระเป๋าถือหน้าที่โหลดแล้ว, cursor หน้าถัดไป, error ล่าสุด
 * เก็บในหน่วยความจำเท่านั้น (รีเฟรชแล้วโหลดใหม่) ไม่มีการจดข้อมูลธุรกรรมลงเครื่อง
 */
import { useCallback, useRef, useState } from 'react';
import { FeedError, fetchPage, type TxRow } from './feed';
import type { Settings, Wallet } from './store';

export interface WalletFeed {
  rows: TxRow[];
  next: number | null;
  loading: boolean;
  error: FeedError | null;
  loaded: boolean;
}

const EMPTY: WalletFeed = { rows: [], next: null, loading: false, error: null, loaded: false };

export function useFeed(settings: Settings) {
  const [feeds, setFeeds] = useState<Record<string, WalletFeed>>({});
  const inflight = useRef(new Set<string>());

  const patch = useCallback((id: string, p: Partial<WalletFeed>) => {
    setFeeds((s) => ({ ...s, [id]: { ...(s[id] ?? EMPTY), ...p } }));
  }, []);

  const load = useCallback(
    async (w: Wallet, mode: 'reset' | 'older') => {
      if (!settings.endpoint || inflight.current.has(w.id)) return;
      const cur = feeds[w.id] ?? EMPTY;
      const start = mode === 'older' ? cur.next : 0;
      if (mode === 'older' && start === null) return;
      inflight.current.add(w.id);
      patch(w.id, { loading: true, error: null });
      try {
        const page = await fetchPage(settings.endpoint, w.id, w.address, start ?? 0, settings.pageSize);
        setFeeds((s) => {
          const prev = mode === 'older' ? (s[w.id]?.rows ?? []) : [];
          const seen = new Set(prev.map((r) => r.key));
          const merged = [...prev, ...page.rows.filter((r) => !seen.has(r.key))];
          const grew = merged.length > prev.length;
          return { ...s, [w.id]: { rows: merged, next: grew && page.rows.length >= settings.pageSize ? page.next : null, loading: false, error: null, loaded: true } };
        });
      } catch (e) {
        patch(w.id, { loading: false, error: e instanceof FeedError ? e : new FeedError('net'), loaded: true });
      } finally {
        inflight.current.delete(w.id);
      }
    },
    [settings.endpoint, settings.pageSize, feeds, patch]
  );

  const loadMany = useCallback(
    (ws: Wallet[], mode: 'reset' | 'older') => {
      // ยิงทีละ 4 ไม่ให้แหล่งข้อมูลโดนรุมตอนนำเข้ากระเป๋าเป็นร้อย
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

  return { feeds, load, loadMany, forget, EMPTY };
}
