/**
 * Identicon ประจำที่อยู่ — วาดเองจาก hash (FNV-1a) ไม่พึ่งไลบรารี
 * ที่อยู่เดียวกันได้สี+ลายเดิมเสมอ สมมาตรซ้าย-ขวา กล่อง 40–48px มุม 8px
 */
interface Props {
  value: string;
  size?: number;
}

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function identiconHue(value: string): number {
  return hash(value.trim().toLowerCase()) % 360;
}

export function Identicon({ value, size = 40 }: Props) {
  const seed = hash(value.trim().toLowerCase());
  const hue = seed % 360;
  const fg = `hsl(${hue} 60% 58%)`;
  const bg = `hsl(${hue} 35% 18%)`;

  const cells: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < 3; x += 1) {
    for (let y = 0; y < 5; y += 1) {
      if (((seed >> ((x * 5 + y) % 30)) & 1) === 1) {
        cells.push({ x, y });
        if (x < 2) cells.push({ x: 4 - x, y });
      }
    }
  }

  return (
    <svg className="identicon" width={size} height={size} viewBox="0 0 5 5" aria-hidden="true" shapeRendering="crispEdges" style={{ width: size, height: size }}>
      <rect width="5" height="5" fill={bg} />
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill={fg} />
      ))}
    </svg>
  );
}
