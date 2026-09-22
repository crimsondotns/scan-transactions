/** สลิปธุรกรรม — เปิดภาพแบบ lightbox (ม่านมืด + ภาพกลาง + ปิดมุมขวาบน) ไม่ใช่ไดอะล็อก; แถบไอคอนใต้ภาพ: คัดลอกลิงก์ / พิมพ์ / คัดลอกเป็นภาพ / ดาวน์โหลด PNG */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { canvasBlob, renderSlip, saveSlip, shareLink, slipCode, type SlipAction, type SlipData, type SlipRecord } from '../slip';
import { Icon } from './Icon';
import { useToast } from './Toast';

export function useSlipLabels() {
  const { t } = useI18n();
  return (d: SlipData) => ({
    title: t('slip.title'),
    on: t('slip.on'),
    action: { download: t('slip.did.download'), copy: t('slip.did.copy'), print: t('slip.did.print'), share: t('slip.did.share'), verify: t('slip.did.verify') },
    wallet: t('tx.col.wallet'),
    from: t('detail.from'),
    to: t('detail.to'),
    hash: t('tx.col.hash'),
    fee: t('detail.networkFee'),
    time: t('tx.col.time'),
    chain: t('tx.col.chain'),
    code: t('slip.code'),
    issued: t('slip.issued'),
    type: t(`tx.type.${d.type}` as 'tx.type.send'),
    status: t('detail.status'),
    statusOk: t('detail.executed'),
    statusFailed: t('tx.failed'),
    success: t('slip.success'),
    failed: t('slip.failedTitle'),
    received: t('slip.received'),
    sent: t('slip.sent'),
    swapCost: t('detail.swapCost'),
    protocol: t('detail.protocol'),
    verifyHint: t('slip.verifyHint'),
  });
}

/** วาดสลิปเป็นภาพ (data URL) — ใช้ทั้งไดอะล็อกสลิปและหน้าตรวจสอบ */
export function useSlipImage(rec: SlipRecord | null, action: SlipAction | null = null) {
  const labels = useSlipLabels();
  const [img, setImg] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  useEffect(() => {
    if (!rec) return setImg(null);
    let alive = true;
    void renderSlip(rec, labels(rec.data), action).then((canvas) => alive && setImg({ canvas, url: canvas.toDataURL('image/png') }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, action]);
  return img;
}

/** lightbox: portal ไป body, z สูงกว่าแผงขวา — Esc / คลิกม่าน ปิด; ล็อกโฟกัสไว้ที่ปุ่มปิด */
export function SlipLightbox({ data, onClose }: { data: SlipData; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rec, setRec] = useState<SlipRecord | null>(null);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void slipCode(data).then((code) => {
      if (!alive) return;
      const r = { code, data };
      saveSlip(r);
      setRec(r);
    });
    return () => {
      alive = false;
    };
  }, [data]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  const img = useSlipImage(rec);
  const labels = useSlipLabels();
  /* ภาพที่ส่งออกถูกวาดใหม่พร้อมตราท้ายสลิปของฟังก์ชันนั้น (Downloaded / Copied / Printed / Shared) */
  const stamped = (action: SlipAction) => renderSlip(rec!, labels(rec!.data), action);

  async function download() {
    if (!img || !rec) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await canvasBlob(await stamped('download')));
    a.download = `xcap-slip-${rec.code}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    toast(t('slip.downloaded'));
  }
  async function copyImage() {
    if (!img) return;
    try {
      const item = new ClipboardItem({ 'image/png': stamped('copy').then(canvasBlob) });
      await navigator.clipboard.write([item]);
      toast(t('slip.imageCopied'));
    } catch {
      await download();
    }
  }
  async function copyLink() {
    if (!rec) return;
    try {
      await navigator.clipboard.writeText(shareLink(rec));
      toast(t('slip.linkCopied'));
    } catch {
      /* clipboard ถูกบล็อก */
    }
  }
  async function print() {
    if (!img) return;
    setPrintUrl((await stamped('print')).toDataURL('image/png'));
    setTimeout(() => {
      window.print();
      setPrintUrl(null);
    }, 50);
  }

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={t('slip.title')}>
      <button type="button" className="lightbox-scrim" aria-label={t('dialog.close')} onClick={onClose} />
      <button type="button" className="btn btn-icon lightbox-close" onClick={onClose} aria-label={t('dialog.close')} autoFocus>
        <Icon name="x" />
      </button>
      <div className="lightbox-body">
        {img ? <img className="lightbox-img" src={img.url} alt={t('slip.title')} width={320} height={img.canvas.height / 2} /> : <span className="spinner" aria-hidden="true" />}
        <div className="lightbox-bar" role="toolbar" aria-label={t('slip.title')}>
          <button type="button" className="btn btn-icon" disabled={!img} onClick={() => void copyLink()} aria-label={t('slip.copyLink')} title={t('slip.copyLink')}>
            <Icon name="link" />
          </button>
          <button type="button" className="btn btn-icon" disabled={!img} onClick={() => void print()} aria-label={t('slip.print')} title={t('slip.print')}>
            <Icon name="printer" />
          </button>
          <button type="button" className="btn btn-icon" disabled={!img} onClick={() => void copyImage()} aria-label={t('slip.copyImage')} title={t('slip.copyImage')}>
            <Icon name="image" />
          </button>
          <button type="button" className="btn btn-icon" disabled={!img} onClick={() => void download()} aria-label={t('slip.download')} title={t('slip.download')}>
            <Icon name="download" />
          </button>
        </div>
      </div>
      {/* พิมพ์: ภาพเดียวบนหน้ากระดาษ ส่วนอื่นของหน้าซ่อนด้วย @media print */}
      {printUrl && <img className="slip-print" src={printUrl} alt={t('slip.title')} />}
    </div>,
    document.body
  );
}
