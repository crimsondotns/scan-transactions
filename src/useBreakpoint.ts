import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const QUERIES: Array<[Breakpoint, string]> = [
  ['mobile', '(max-width: 639px)'],
  ['tablet', '(min-width: 640px) and (max-width: 1024px)'],
];

function current(): Breakpoint {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  for (const [bp, q] of QUERIES) if (window.matchMedia(q).matches) return bp;
  return 'desktop';
}

/** ช่วงจอตามสเปก: มือถือ <640 · แท็บเล็ต 640–1024 · เดสก์ท็อป >1024 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(current);
  useEffect(() => {
    const lists = QUERIES.map(([, q]) => window.matchMedia(q));
    const on = () => setBp(current());
    lists.forEach((l) => l.addEventListener('change', on));
    return () => lists.forEach((l) => l.removeEventListener('change', on));
  }, []);
  return bp;
}
