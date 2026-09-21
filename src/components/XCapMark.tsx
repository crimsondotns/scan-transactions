/** เครื่องหมายของ XCap — วงกลมสแกนที่มีมุมกำกับสี่มุม ใช้ currentColor ทั้งหมด */
export function XCapMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" opacity="0.35" />
      <rect x="13.2" y="13.2" width="5.6" height="5.6" fill="currentColor" />
      <rect x="8" y="8" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="21" y="8" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="8" y="21" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="21" y="21" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
