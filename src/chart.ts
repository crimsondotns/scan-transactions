/**
 * เรขาคณิตของกราฟพื้นที่ — ตรรกะล้วน ไม่มี React ไม่มี DOM จึงเทสต์ได้ตรงๆ
 * ไม่มีไลบรารีกราฟในโปรเจกต์นี้: เส้นโค้งกับกริดคำนวณเองทั้งหมด
 */

export interface Pt {
  x: number;
  y: number;
}

/**
 * เส้นโค้งแบบ monotone cubic (Fritsch–Carlson) — โค้งนุ่มเหมือน type="natural"
 * แต่ไม่แกว่งเกินค่าจริง เส้นจึงไม่ห้อยต่ำกว่าศูนย์ในวันที่ยอดเป็นศูนย์
 */
export function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  const [first] = pts;
  if (!first) return '';
  if (pts.length === 1) return `M${first.x} ${first.y}`;
  const n = pts.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const d = b.x - a.x;
    dx.push(d);
    slope.push(d === 0 ? 0 : (b.y - a.y) / d);
  }
  /* ความชันที่จุด: เฉลี่ยของสองช่วงข้างเคียง และเป็นศูนย์เมื่อกลับทิศ (กันเส้นแกว่ง) */
  const m: number[] = new Array(n).fill(0);
  m[0] = slope[0] ?? 0;
  m[n - 1] = slope[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope[i - 1] ?? 0;
    const s1 = slope[i] ?? 0;
    m[i] = s0 * s1 <= 0 ? 0 : (s0 + s1) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const s = slope[i] ?? 0;
    if (s === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = (m[i] ?? 0) / s;
    const b = (m[i + 1] ?? 0) / s;
    const h = Math.hypot(a, b);
    if (h > 3) {
      m[i] = ((3 / h) * a) * s;
      m[i + 1] = ((3 / h) * b) * s;
    }
  }
  let d = `M${round(first.x)} ${round(first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const h = (dx[i] ?? 0) / 3;
    d += ` C${round(a.x + h)} ${round(a.y + (m[i] ?? 0) * h)} ${round(b.x - h)} ${round(b.y - (m[i + 1] ?? 0) * h)} ${round(b.x)} ${round(b.y)}`;
  }
  return d;
}

const round = (v: number): number => Math.round(v * 10) / 10;

/** พื้นที่ใต้เส้น: เส้นโค้ง → ลงไปที่เส้นฐาน → ปิดรูป */
export function areaPath(pts: Pt[], baseline: number): string {
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return '';
  return `${smoothPath(pts)} L${round(last.x)} ${round(baseline)} L${round(first.x)} ${round(baseline)} Z`;
}

/** พื้นที่ระหว่างสองเส้น (ชั้นบนของกราฟซ้อน) — เส้นบนไปขวา แล้วเส้นล่างย้อนกลับมาซ้าย */
export function bandPath(top: Pt[], bottom: Pt[]): string {
  if (!top.length || !bottom.length) return '';
  const back = smoothPath([...bottom].reverse());
  return `${smoothPath(top)} L${back.slice(1)} Z`;
}

/** ค่าที่อ่านง่ายสำหรับเส้นกริด: 1 · 2 · 2.5 · 5 · 10 ของหลักนั้น */
export function niceMax(max: number, steps = 4): number {
  if (!Number.isFinite(max) || max <= 0) return steps;
  const rough = max / steps;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return step * steps;
}

/**
 * ดัชนีของจุดที่ควรมีป้ายวันที่ — เว้นระยะให้ป้ายไม่ชนกัน และจบที่จุดสุดท้ายเสมอ
 * (เทียบเท่า minTickGap ของกราฟสำเร็จรูป)
 */
export function tickIndexes(count: number, width: number, minGap = 64): number[] {
  if (count <= 1) return count === 1 ? [0] : [];
  const step = Math.max(1, Math.ceil(minGap / Math.max(1, width / (count - 1))));
  const out: number[] = [];
  for (let i = count - 1; i >= 0; i -= step) out.unshift(i);
  if (out.length > 1 && (out[1] ?? 0) - (out[0] ?? 0) < step) out.shift();
  return out;
}

/** จุดที่ใกล้ตำแหน่งเมาส์ที่สุด (ตำแหน่งในกราฟ → ดัชนีวัน) */
export function nearestIndex(x: number, left: number, right: number, count: number): number {
  if (count <= 1) return 0;
  const ratio = (x - left) / Math.max(1, right - left);
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}
