/**
 * สถานะการโหลดต่อกระเป๋า — แต่ละกระเป๋าถูกยิงไปทุกแหล่งข้อมูลที่เปิดอยู่และตรงตระกูลเชน
 * แถวจากหลายแหล่งรวมกันแล้วตัดซ้ำด้วย key; cursor/error เก็บแยกต่อแหล่ง
 * อยู่ในหน่วยความจำเท่านั้น (รีเฟรชแล้วโหลดใหม่) ไม่มีการจดธุรกรรมลงเครื่อง
 * โหลดแบบขี้เกียจ: ไม่ยิงตอนเปิดหน้า ยิงเฉพาะเมื่อผู้ใช้เลือกกระเป๋า และกระเป๋าที่โหลดแล้วใช้แคชในหน่วยความจำ
 */
import { useCallback, useRef, useState } from 'react';

export interface Progress {
  done: number;
  total: number;
  running: boolean;
  stopped: 'rate' | 'cancel' | null;
  /** โดนจำกัดคำขอ → อีกกี่วินาทีถึงลองใหม่ได้ (ตามที่คิวคำขอกำลังพักอยู่) */
  retryIn: number;
}

/* โหลดทีละ 3 กระเป๋าต่อชุด เว้น 3 วิระหว่างชุด — คิวคำขอ (limiter) เป็นคนคุมความถี่จริง
   ตรงนี้แค่ไม่ปล่อยงานเข้าคิวทีเดียวเป็นร้อย เพื่อให้กดยกเลิกแล้วหยุดได้จริง */
const BATCH = 3;
const BATCH_GAP_MS = 3000;
import { FeedError, applyTokenMeta, fetchPage, unknownTokens, type Cursor, type TokenMeta, type TxRow } from './feed';
import { ensureTokenMeta } from './tokens';
import { pausedFor } from './limiter';
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

  /**
   * เติมชื่อ/สัญลักษณ์/โลโก้ของโทเคนที่ยังไม่รู้จักในแถวที่โหลดมาแล้ว
   * เรียกซ้ำได้: ที่อยู่ที่เคยขอสำเร็จอยู่ในแคช จึงไม่ยิงซ้ำ ที่ยังไม่สำเร็จเท่านั้นที่ยิงใหม่
   */
  const fillMeta = useCallback(
    async (w: Wallet, tries = 3, delay = 1200): Promise<void> => {
      const eps = endpointsFor(w, settings).filter((e) => e.metaUrl);
      if (!eps.length) return;
      for (let i = 0; i < tries; i++) {
        const ids = unknownTokens(latest.current[w.id]?.rows ?? []);
        if (!ids.length) return;
        const meta = new Map<string, TokenMeta>();
        for (const ep of eps) for (const [k, v] of await ensureTokenMeta(ep, ids)) meta.set(k, v);
        if (meta.size) {
          setFeeds((s) => {
            const f = s[w.id];
            if (!f) return s;
            const rows = applyTokenMeta(f.rows, meta);
            return rows === f.rows ? s : { ...s, [w.id]: { ...f, rows } };
          });
          return;
        }
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    },
    [settings]
  );

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
            const page = await fetchPage(ep.url, w.id, w.address, c ?? null, settings.pageSize, { family: ep.family, authHeader: ep.authHeader, apiKey: ep.apiKey });
            // แหล่งที่ตั้ง URL metadata ไว้ → เติมชื่อ/สัญลักษณ์/โลโก้ของโทเคนที่ยังไม่รู้ก่อนแสดง
            const ids = ep.metaUrl ? unknownTokens(page.rows) : [];
            return { ep, page: ids.length ? { ...page, rows: applyTokenMeta(page.rows, await ensureTokenMeta(ep, ids)) } : page, error: null };
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
          // offset สะสมข้ามหน้า (หน้า 2 = offset ของหน้า 1 + จำนวนที่ได้) — start/cursor ใช้ของหน้าล่าสุด
          const before = mode === 'older' ? prev.next[r.ep.id] : null;
          next[r.ep.id] = grew && r.page.rows.length >= settings.pageSize && r.page.next ? { ...r.page.next, offset: (before?.offset ?? 0) + r.page.next.offset } : (grew && r.page.next?.next ? r.page.next : null);
        }
        return { ...s, [w.id]: { rows, next, errors, loading: false, loaded: true } };
      });
      inflight.current.delete(w.id);
      
      // 👇👇👇 แก้ไขตรงนี้: คอมเมนต์บรรทัดนี้ทิ้ง เพื่อไม่ให้ Fetch อัตโนมัติ 👇👇👇
      // void fillMeta(w); 
      // 👆👆👆 แก้ไขตรงนี้ 👆👆👆
    },
    [settings, fillMeta]
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

  /* โหลดแบบเว้นจังหวะ: ทีละ 5 กระเป๋าพร้อมกัน เว้น 2 วิ แล้วชุดถัดไป — เหมือนคนกดทีละอัน กัน rate limit
     หยุดเองเมื่อเจอ 429 และผู้ใช้ยกเลิกได้ */
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0, running: false, stopped: null, retryIn: 0 });
  const cancelRef = useRef(false);
  const loadStaggered = useCallback(
    async (ws: Wallet[]) => {
      const todo = ws.filter((w) => !latest.current[w.id]?.loaded && endpointsFor(w, settings).length);
      if (!todo.length) return;
      cancelRef.current = false;
      setProgress({ done: 0, total: todo.length, running: true, stopped: null, retryIn: 0 });
      for (let i = 0; i < todo.length; i += BATCH) {
        if (cancelRef.current) {
          setProgress((p) => ({ ...p, running: false, stopped: 'cancel' }));
          return;
        }
        const batch = todo.slice(i, i + BATCH);
        await Promise.all(batch.map((w) => load(w, 'reset')));
        setProgress((p) => ({ ...p, done: Math.min(todo.length, i + batch.length) }));
        const limited = batch.some((w) => Object.values(latest.current[w.id]?.errors ?? {}).some((e) => e.kind === 'http' && e.status === 429));
        if (limited) {
          // แหล่งข้อมูลกันไว้แล้ว — ยิงต่อมีแต่จะต่ออายุแบน หยุดตรงนี้และบอกผู้ใช้ว่าอีกนานแค่ไหนถึงลองใหม่ได้
          setProgress((p) => ({ ...p, running: false, stopped: 'rate', retryIn: Math.ceil(pausedFor() / 1000) }));
          return;
        }
        if (i + BATCH < todo.length) {
          // คิวถูกพักอยู่ (เพิ่งเจอ 429 ระหว่างทาง) → รอให้ครบก่อนค่อยส่งชุดถัดไป
          await new Promise((r) => setTimeout(r, Math.max(BATCH_GAP_MS, pausedFor())));
        }
      }
      setProgress((p) => ({ ...p, running: false }));
    },
    [load, settings]
  );
  const cancelStaggered = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /** โหลดถ้ายังไม่มีในแคช (เคยโหลดสำเร็จหรือกำลังโหลด → ไม่ยิงซ้ำ) */
  const ensure = useCallback(
    (w: Wallet) => {
      const f = latest.current[w.id];
      if (f?.loaded || f?.loading) return Promise.resolve();
      return load(w, 'reset');
    },
    [load]
  );

  /** ล้างแคชทั้งหมด (แหล่งข้อมูลเปลี่ยน) — ไม่โหลดใหม่เอง รอผู้ใช้เลือกกระเป๋า */
  const reset = useCallback(() => setFeeds({}), []);

  const forget = useCallback((id: string) => {
    setFeeds((s) => {
      const { [id]: _drop, ...rest } = s;
      return rest;
    });
  }, []);

  // 👇👇👇 แก้ไขตรงนี้: เพิ่ม fillMeta เข้าไปใน return 👇👇👇
  return { feeds, load, loadMany, loadStaggered, cancelStaggered, progress, ensure, reset, forget, fillMeta };
  // 👆👆👆 แก้ไขตรงนี้ 👆👆👆
}

export function hasOlder(f: WalletFeed | undefined): boolean {
  return !!f?.loaded && Object.values(f.next).some((c) => c !== null && c !== undefined);
}