/** สลิปธุรกรรม — กดปุ่ม Slip แล้วได้ไฟล์ PNG ทันที (ไม่มีไดอะล็อก); สำเนา + รหัสยืนยันถูกเก็บในเครื่องตอนนั้น */
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { canvasBlob, renderSlip, saveSlip, slipCode, type SlipAction, type SlipData, type SlipRecord } from '../slip';
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

/** ส่งออกสลิปทันที: แฮชรหัส → เก็บสำเนา → วาดพร้อมตรา Downloaded → ดาวน์โหลด PNG → toast */
export function useSlipExport() {
  const { t } = useI18n();
  const { toast } = useToast();
  const labels = useSlipLabels();
  return async (data: SlipData) => {
    const code = await slipCode(data);
    const rec: SlipRecord = { code, data };
    saveSlip(rec);
    const canvas = await renderSlip(rec, labels(data), 'download');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await canvasBlob(canvas));
    a.download = `xcap-slip-${code}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    toast(t('slip.downloaded'));
  };
}
