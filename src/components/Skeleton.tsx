/**
 * โครงร่างระหว่างโหลด (shimmer) — แถวสูงเท่าแถวจริง แทนที่ด้วยข้อมูลเมื่อโหลดเสร็จ
 * cols = ความกว้างของแท่งในแต่ละคอลัมน์ (px หรือ %) ; ตัวแรกมีวงกลมไอคอนนำหน้า
 */
export function SkeletonRows({ rows = 5, cols, icon = true }: { rows?: number; cols: Array<string | number>; icon?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="sk-row" aria-hidden="true">
          {cols.map((w, j) => (
            <td key={j} className={j > 0 ? 'num' : undefined}>
              <span className="sk-cell">
                {j === 0 && icon && <span className="sk sk-circle" />}
                <span className="sk sk-bar" style={{ width: typeof w === 'number' ? `${w}px` : w }} />
              </span>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonBar({ width = 60 }: { width?: number | string }) {
  return <span className="sk sk-bar" style={{ width: typeof width === 'number' ? `${width}px` : width }} aria-hidden="true" />;
}
