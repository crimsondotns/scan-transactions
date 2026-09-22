/**
 * ชั้นโมดัล (ไดอะล็อก / แผงขวา / lightbox) — ตอนเปิด ทุกอย่างนอกชั้นบนสุดต้อง "ตาย": คลิกไม่ได้ แท็บไม่ถึง อ่านด้วย screen reader ไม่เจอ
 * ทำด้วย inert บนลูกของ body ทุกตัวยกเว้นชั้นบนสุด (ทุกชั้น portal ไป body จึงเป็นพี่น้องกัน) + ล็อกสกรอลล์ body
 * ซ้อนกันได้ (แผงขวา → lightbox): ชั้นล่างถูก inert ด้วย ปิดชั้นบนแล้วคืนให้ชั้นถัดไป
 */
import { useEffect, type RefObject } from 'react';

const stack: HTMLElement[] = [];

function apply(): void {
  const top = stack[stack.length - 1] ?? null;
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.classList.contains('toasts')) continue; // แจ้งเตือนอ่านได้เสมอ
    if (!top || el === top) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }
  document.body.style.overflow = top ? 'hidden' : '';
}

export function pushModal(el: HTMLElement): () => void {
  stack.push(el);
  apply();
  return () => {
    const i = stack.lastIndexOf(el);
    if (i >= 0) stack.splice(i, 1);
    apply();
  };
}

/** ใช้ในคอมโพเนนต์ที่ portal ไป body: active → ชั้นนี้เป็นชั้นบนสุด */
export function useModalLayer(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    return pushModal(el);
  }, [ref, active]);
}
