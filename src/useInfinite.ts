import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * เลื่อนไม่รู้จบแบบ cursor: โชว์ทีละชุด (page) จากรายการที่มีในเครื่อง แล้วเมื่อโชว์หมดค่อยขอชุดถัดไปจากแหล่งข้อมูล
 * - `visible` = จำนวนแถวที่แสดง (cursor ฝั่งจอ = แถวสุดท้ายที่แสดง)
 * - sentinel ท้ายตารางเข้าจอ (~80% ของทางลง) → เพิ่ม visible หรือเรียก `fetchMore()` เมื่อรายการในเครื่องหมดแล้ว
 * - ระหว่างโหลดไม่ยิงซ้ำ; cursor ฝั่งแหล่งข้อมูลอยู่กับผู้เรียก (ต่อกระเป๋า)
 */
export function useInfinite({ total, page, hasMore, loading, fetchMore, resetKey }: { total: number; page: number; hasMore: boolean; loading: boolean; fetchMore?: () => void; resetKey?: string }) {
  const [visible, setVisible] = useState(page);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => setVisible(page), [page, resetKey]);
  useEffect(() => {
    busy.current = loading;
  }, [loading]);

  const more = useCallback(() => {
    if (busy.current) return;
    if (visible < total) setVisible((v) => Math.min(total, v + page));
    else if (hasMore && fetchMore) fetchMore();
  }, [visible, total, page, hasMore, fetchMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) more();
      },
      // 40% ของความสูงจอเป็น margin ล่าง ≈ เริ่มโหลดตอนเลื่อนถึงราว 80% ของทาง
      { rootMargin: '0px 0px 40% 0px' }
    );
    io.observe(el);
    // สำรอง: เช็คตำแหน่ง sentinel ตอนเลื่อน/ปรับขนาด (บางสภาพแวดล้อม IntersectionObserver ไม่ยิง)
    let t = 0;
    const check = () => {
      if (t) return;
      t = window.setTimeout(() => {
        t = 0;
        if (el.getBoundingClientRect().top < window.innerHeight * 1.4) more();
      }, 80);
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
    return () => {
      io.disconnect();
      clearTimeout(t);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [more]);

  return { visible, sentinel, exhausted: visible >= total && !hasMore };
}
