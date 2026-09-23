/**
 * ตัวตน (Google) + โปรไฟล์ — เท่าที่เว็บ static ทำได้จริง
 *
 * ได้อะไร : ชื่อ/อีเมล/รูป/รหัสบัญชี (sub) จาก ID token ของ Google Identity Services — ไม่ต้องมี client secret
 * ไม่ได้อะไร: ฐานข้อมูล, ที่เก็บข้อมูลบนเซิร์ฟเวอร์, การต่ออายุเงียบๆ, การตรวจโทเคนฝั่งเซิร์ฟเวอร์, สิทธิ์
 *
 * เพราะไม่มีเซิร์ฟเวอร์ไว้ตรวจลายเซ็นของโทเคน การล็อกอินที่นี่จึงเป็น "ป้ายชื่อบนเครื่องนี้" เท่านั้น
 * ไม่ใช่ประตูกั้นข้อมูล — ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์และเปิดดูได้อยู่แล้วโดยไม่ต้องล็อกอิน
 * เก็บเฉพาะข้อมูลที่ไม่อ่อนไหว (ชื่อ/อีเมล/รูป/sub/เวลาหมดอายุ) — ตัว ID token ดิบไม่ถูกเก็บ
 */
import { useCallback, useEffect, useState } from 'react';
import { getLocal, setLocal, delLocal } from './local';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

export interface Identity {
  provider: 'google';
  providerUserId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  signedInAt: string;
  expiresAt: string;
}

export interface UserProfile {
  id: string;
  provider: 'google' | 'local';
  providerUserId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------- username ----------------------------- */
/** กติกาเดียวกับฝั่ง Keepit (a–z 0–9 _ . - ยาว 3–20 ขึ้น/ลงท้ายด้วยตัวอักษรหรือตัวเลข) แต่ที่นี่ "จองไม่ได้" เพราะไม่มีทะเบียนกลาง */
export const USERNAME_RE = /^(?=.{3,20}$)[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const RESERVED = new Set(['login', 'api', 'auth', 'u', 'me', 'admin', 'shared', 'settings', 'account', 'xcap', 's', 'v', 'w']);

export function normalizeUsername(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

export type UsernameProblem = 'length' | 'chars' | 'reserved';
/** null = ใช้ได้ */
export function checkUsername(raw: string): UsernameProblem | null {
  const u = normalizeUsername(raw);
  if (u.length < 3 || u.length > 20) return 'length';
  if (!USERNAME_RE.test(u)) return 'chars';
  if (RESERVED.has(u)) return 'reserved';
  return null;
}

/* ----------------------------- ID token ----------------------------- */
interface Claims {
  sub?: unknown;
  email?: unknown;
  name?: unknown;
  picture?: unknown;
  exp?: unknown;
}

/**
 * อ่านเนื้อใน ID token — **ไม่ใช่การตรวจสอบ**
 * ลายเซ็นตรวจได้เฉพาะฝั่งเซิร์ฟเวอร์ ที่นี่จึงเชื่อถือได้แค่ในฐานะ "ชื่อที่ผู้ใช้เครื่องนี้เลือกใส่"
 */
export function readIdToken(token: string, now = Date.now()): Identity | null {
  const part = token.split('.')[1];
  if (!part) return null;
  let claims: Claims;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    claims = JSON.parse(decodeURIComponent(escape(json))) as Claims;
  } catch {
    return null;
  }
  const sub = typeof claims.sub === 'string' ? claims.sub : null;
  const exp = typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  if (!sub || !exp) return null;
  return {
    provider: 'google',
    providerUserId: sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    name: typeof claims.name === 'string' ? claims.name : null,
    picture: typeof claims.picture === 'string' && /^https:\/\//.test(claims.picture) ? claims.picture : null,
    signedInAt: new Date(now).toISOString(),
    expiresAt: new Date(exp).toISOString(),
  };
}

export function identityExpired(id: Identity | null, now = Date.now()): boolean {
  return !!id && Date.parse(id.expiresAt) <= now;
}

/* ----------------------------- โปรไฟล์ ----------------------------- */
export function profileFromIdentity(id: Identity, existing: UserProfile | null, now = new Date()): UserProfile {
  return {
    id: existing?.id ?? `google:${id.providerUserId}`,
    provider: 'google',
    providerUserId: id.providerUserId,
    username: existing?.username ?? null,
    displayName: existing?.displayName ?? id.name,
    avatarUrl: existing?.avatarUrl ?? id.picture,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/* ----------------------------- Google Identity Services ----------------------------- */
interface Gsi {
  accounts: {
    id: {
      initialize(o: { client_id: string; callback: (r: { credential?: string }) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean }): void;
      renderButton(el: HTMLElement, o: Record<string, unknown>): void;
      disableAutoSelect(): void;
    };
  };
}

let gsiLoad: Promise<Gsi | null> | null = null;
function loadGsi(): Promise<Gsi | null> {
  if (gsiLoad) return gsiLoad;
  gsiLoad = new Promise((resolve) => {
    const w = window as unknown as { google?: Gsi };
    if (w.google?.accounts?.id) return resolve(w.google);
    const el = document.createElement('script');
    el.src = GSI_SRC;
    el.async = true;
    el.onload = () => resolve((window as unknown as { google?: Gsi }).google ?? null);
    el.onerror = () => resolve(null);
    document.head.appendChild(el);
  });
  return gsiLoad;
}

const env = (import.meta as unknown as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env;
const CLIENT_ID_KEY = 'xcap.google.clientId';

/** client id ของ Google เป็นค่าสาธารณะ (ไม่ใช่ความลับ): มาจากตอน build หรือผู้ใช้วางเองในตั้งค่า */
export function googleClientId(): string {
  try {
    const local = localStorage.getItem(CLIENT_ID_KEY);
    if (local && local.trim()) return local.trim();
  } catch {
    /* ไม่มี storage */
  }
  return (env?.VITE_GOOGLE_CLIENT_ID ?? '').trim();
}

export function setGoogleClientId(v: string): void {
  try {
    if (v.trim()) localStorage.setItem(CLIENT_ID_KEY, v.trim());
    else localStorage.removeItem(CLIENT_ID_KEY);
  } catch {
    /* ไม่มี storage */
  }
}

export type AccountState = 'loading' | 'signedOut' | 'expired' | 'ready';

/** สถานะบัญชีของเครื่องนี้ — ไม่มีการเรียกเซิร์ฟเวอร์ใดๆ นอกจากตัว Google เองตอนกดล็อกอิน */
export function useAccount() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<AccountState>('loading');

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [id, pf] = await Promise.all([getLocal<Identity>('identity', 'current'), getLocal<UserProfile>('profile', 'me')]);
      if (!alive) return;
      setIdentity(id);
      setProfile(pf);
      setState(!id ? 'signedOut' : identityExpired(id) ? 'expired' : 'ready');
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** วาดปุ่มของ Google ลงในกล่องที่ให้มา — ต้องใช้ปุ่มของเขาเอง (ข้อกำหนดของ Google) */
  const mountButton = useCallback(async (host: HTMLElement): Promise<boolean> => {
    const clientId = googleClientId();
    if (!clientId) return false;
    const gsi = await loadGsi();
    if (!gsi) return false;
    gsi.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (r) => {
        const next = r.credential ? readIdToken(r.credential) : null;
        if (!next) return;
        void (async () => {
          const existing = await getLocal<UserProfile>('profile', 'me');
          const pf = profileFromIdentity(next, existing);
          await setLocal('identity', 'current', next);
          await setLocal('profile', 'me', pf);
          setIdentity(next);
          setProfile(pf);
          setState('ready');
        })();
      },
    });
    host.replaceChildren();
    gsi.accounts.id.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with' });
    return true;
  }, []);

  const signOut = useCallback(async () => {
    const gsi = await loadGsi();
    gsi?.accounts.id.disableAutoSelect();
    await delLocal('identity', 'current');
    setIdentity(null);
    setState('signedOut');
  }, []);

  /** แก้โปรไฟล์ (ชื่อที่ใช้แสดง / ชื่อย่อ) — อยู่ในเครื่องนี้เท่านั้น */
  const saveProfile = useCallback(async (patch: Partial<Pick<UserProfile, 'username' | 'displayName' | 'avatarUrl'>>) => {
    const now = new Date().toISOString();
    const base: UserProfile = profile ?? { id: 'local', provider: 'local', providerUserId: null, username: null, displayName: null, avatarUrl: null, createdAt: now, updatedAt: now };
    const next: UserProfile = { ...base, ...patch, updatedAt: now };
    await setLocal('profile', 'me', next);
    setProfile(next);
  }, [profile]);

  /** ลบตัวตนและโปรไฟล์ออกจากเครื่องนี้ (ข้อมูลกระเป๋าไม่ถูกแตะ) */
  const forgetAccount = useCallback(async () => {
    await delLocal('identity', 'current');
    await delLocal('profile', 'me');
    setIdentity(null);
    setProfile(null);
    setState('signedOut');
  }, []);

  return { state, identity, profile, mountButton, signOut, saveProfile, forgetAccount, clientId: googleClientId() };
}
