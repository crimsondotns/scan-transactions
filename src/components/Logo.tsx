/**
 * โลโก้โทเคน/เชน — โหลดจาก URL ที่แหล่งข้อมูลให้มา ถ้าไม่มีหรือโหลดไม่ได้
 * ใช้วงกลมตัวอักษรแรกแทน (สีกลางตามธีม ไม่มีสีตกแต่ง)
 */
import { useState } from 'react';

/** Mockup badge สำหรับ EVM Chain (ไม่ใช้ URL ภายนอก — ใช้สีพื้นหลัง + สัญลักษณ์แทน) */
const CHAIN_BADGES: Record<string, { color: string; glyph: string }> = {
  ethereum: { color: '#627EEA', glyph: 'Ξ' },
  eth: { color: '#627EEA', glyph: 'Ξ' },
  bsc: { color: '#F0B90B', glyph: 'B' },
  binance: { color: '#F0B90B', glyph: 'B' },
  polygon: { color: '#8247E5', glyph: 'P' },
  matic: { color: '#8247E5', glyph: 'P' },
  arbitrum: { color: '#28A0F0', glyph: 'A' },
  optimism: { color: '#FF0420', glyph: 'O' },
  base: { color: '#0052FF', glyph: 'B' },
  avalanche: { color: '#E84142', glyph: 'A' },
  avax: { color: '#E84142', glyph: 'A' },
};

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

/** ป้ายเชนแบบ mockup — วงกลมสีแบรนด์ + สัญลักษณ์ ไม่ต้องโหลดจากที่ไหน */
function ChainBadge({ name, size }: { name: string; size: number }) {
  const badge = CHAIN_BADGES[name.toLowerCase()];
  if (!badge) return <Logo src={null} name={name} size={size} />;
  return (
    <span
      className="logo"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: badge.color,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.55),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {badge.glyph}
    </span>
  );
}

/** โทเคนซ้อนบนเชน (มุมขวาล่าง) */
export function TokenLogo({ token, tokenName, chain, chainName, size = 28 }: { token: string | null; tokenName: string; chain: string | null; chainName: string; size?: number }) {
  const badgeSize = Math.round(size * 0.57);
  return (
    <span className="logo-stack" style={{ width: size, height: size }}>
      <Logo src={token} name={tokenName} size={size} />
      <span className="logo-badge">
        {chain ? <Logo src={chain} name={chainName} size={badgeSize} /> : <ChainBadge name={chainName} size={badgeSize} />}
      </span>
    </span>
  );
}