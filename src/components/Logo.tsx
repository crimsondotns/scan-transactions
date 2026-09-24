/**
 * โลโก้โทเคน/เชน — โหลดจาก URL ที่แหล่งข้อมูลให้มา ถ้าไม่มีหรือโหลดไม่ได้
 * ใช้วงกลมตัวอักษรแรกแทน (สีกลางตามธีม ไม่มีสีตกแต่ง)
 */
import { useState } from 'react';

// 1. เพิ่ม Mockup Icon สำหรับ Chain ต่างๆ (คุณสามารถเปลี่ยน URL รูปภาพได้ตามต้องการ)
const CHAIN_MOCKUP_LOGOS: Record<string, string> = {
  'ethereum': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'eth': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'bsc': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'binance': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'polygon': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'matic': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'arbitrum': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  'optimism': 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png',
  'base': 'https://cryptologos.cc/logos/base-base-logo.png',
  'solana': 'https://cryptologos.cc/logos/solana-sol-logo.png',
  'avalanche': 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
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

/** โทเคนซ้อนบนเชน (มุมขวาล่าง) */
export function TokenLogo({ token, tokenName, chain, chainName, size = 28 }: { token: string | null; tokenName: string; chain: string | null; chainName: string; size?: number }) {
  // 2. ถ้าไม่มี chain URL ให้ดึงจาก Mockup ทันที
  const resolvedChainLogo = chain || CHAIN_MOCKUP_LOGOS[chainName.toLowerCase()] || null;

  return (
    <span className="logo-stack" style={{ width: size, height: size }}>
      <Logo src={token} name={tokenName} size={size} />
      <span className="logo-badge">
        {/* 3. ส่ง resolvedChainLogo ไปแสดงผล */}
        <Logo src={resolvedChainLogo} name={chainName} size={Math.round(size * 0.57)} />
      </span>
    </span>
  );
}