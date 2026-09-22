/** สลิปธุรกรรม — เปิดภาพแบบ lightbox (ม่านมืด + ภาพกลาง + ปิดมุมขวาบน) ไม่ใช่ไดอะล็อก ไม่มีแถบปุ่ม — ผู้ใช้คลิกขวา/ลากภาพเซฟเองแบบรูปทั่วไป */
import { useEffect, useRef, useState } from 'react';
import { useModalLayer } from '../modal';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { renderSlip, saveSlip, slipCode, type SlipAction, type SlipData, type SlipRecord } from '../slip';
import { Icon } from './Icon';

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
  });
}

/** วาดสลิปเป็นภาพ (data URL) — ใช้ทั้งไดอะล็อกสลิปและหน้าตรวจสอบ */
export function useSlipImage(rec: SlipRecord | null, action: SlipAction | null = null) {
  const labels = useSlipLabels();
  const { settings } = useStore();
  const [img, setImg] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  useEffect(() => {
    if (!rec) return setImg(null);
    let alive = true;
    void renderSlip(rec, labels(rec.data), action, settings.slipShow).then((canvas) => alive && setImg({ canvas, url: canvas.toDataURL('image/png') }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, action, settings.slipShow]);
  return img;
}

/** lightbox: portal ไป body, z สูงกว่าแผงขวา — Esc / คลิกม่าน ปิด; ล็อกโฟกัสไว้ที่ปุ่มปิด */
export function SlipLightbox({ data, onClose }: { data: SlipData; onClose: () => void }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  useModalLayer(box, true);
  const [rec, setRec] = useState<SlipRecord | null>(null);
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
  return createPortal(
    <div ref={box} className="lightbox" role="dialog" aria-modal="true" aria-label={t('slip.title')}>
      <button type="button" className="lightbox-scrim" aria-label={t('dialog.close')} onClick={onClose} />
      <button type="button" className="btn btn-icon lightbox-close" onClick={onClose} aria-label={t('dialog.close')} autoFocus>
        <Icon name="x" />
      </button>
      <div className="lightbox-body">
        {img ? <img className="lightbox-img" src={img.url} alt={t('slip.title')} width={320} height={img.canvas.height / 2} /> : <span className="spinner" aria-hidden="true" />}
      </div>
    </div>,
    document.body
  );
}
