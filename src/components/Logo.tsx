/**
 * โลโก้โทเคน/เชน — โหลดจาก URL ที่แหล่งข้อมูลให้มา ถ้าไม่มีหรือโหลดไม่ได้
 * ใช้วงกลมตัวอักษรแรกแทน (สีกลางตามธีม ไม่มีสีตกแต่ง)
 */
import { useState } from 'react';

export function Logo({ src, name, size = 20 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  if (src && !broken) {
    return <img className="logo" src={src} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} style={{ width: size, height: size }} />;
  }
  return (
    <span className="logo logo-fallback" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}>
      {letter}
    </span>
  );
}

/** โทเคนซ้อนบนเชน (มุมขวาล่าง) */
export function TokenLogo({ token, tokenName, chain, chainName, size = 28 }: { token: string | null; tokenName: string; chain: string | null; chainName: string; size?: number }) {
  return (
    <span className="logo-stack" style={{ width: size, height: size }}>
      <Logo src={token} name={tokenName} size={size} />
      <span className="logo-badge">
        <Logo src={chain} name={chainName} size={Math.round(size * 0.57)} />
      </span>
    </span>
  );
}
