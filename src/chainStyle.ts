/** อ่านค่าสีจริงของโทเคน CSS (ไว้วาดบน canvas ของสลิป) */
export function tokenColor(token: string, fallback: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim() || fallback;
  } catch {
    return fallback;
  }
}
