import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/** ปุ่มคัดลอก: กดแล้วไอคอนเปลี่ยนเป็นติ๊กคู่ (เด้งเข้า) ค้าง 2 วินาทีแล้วกลับเป็นไอคอนคัดลอก */
export function CopyButton({ text, label, onCopied }: { text: string; label: string; onCopied?: () => void }) {
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [isCopied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
    } catch {
      /* clipboard ถูกบล็อก */
    }
  }

  return (
    <button type="button" className="btn btn-icon" data-copied={isCopied} onClick={() => void copy()} aria-label={label} title={label}>
      {isCopied ? <Icon name="checkCheck" key="ok" className="pop" /> : <Icon name="copy" key="copy" />}
    </button>
  );
}
