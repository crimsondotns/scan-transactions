/** สลิปธุรกรรม — พรีวิวภาพ แล้วดาวน์โหลด PNG / คัดลอกเป็นภาพ / พิมพ์ (บันทึกเป็น PDF ได้จากหน้าพิมพ์) / คัดลอกลิงก์ตรวจสอบ */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { canvasBlob, renderSlip, saveSlip, shareLink, slipCode, type SlipAction, type SlipData, type SlipRecord } from '../slip';
import { Dialog } from './Dialog';
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
    status: d.status === 'failed' ? t('tx.failed') : t('detail.executed'),
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

export function SlipDialog({ data, onClose }: { data: SlipData | null; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rec, setRec] = useState<SlipRecord | null>(null);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!data) return setRec(null);
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
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  async function print() {
    if (!img) return;
    setPrintUrl((await stamped('print')).toDataURL('image/png'));
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
  }

  return (
    <>
      <Dialog open={data !== null} onClose={onClose} title={t('slip.title')}>
        <div className="slip-preview" aria-busy={!img}>
          {img ? <img src={img.url} alt={t('slip.title')} width={640} height={img.canvas.height / 2} /> : <span className="spinner" aria-hidden="true" />}
        </div>
        {rec && (
          <p className="hint">
            {t('slip.code')} · <span className="mono">{rec.code}</span>
          </p>
        )}
        <div className="dlg-actions slip-actions">
          <button type="button" className="btn" data-fn="share" disabled={!img} onClick={() => void copyLink()}>
            <Icon name="link" />
            {t('slip.copyLink')}
          </button>
          <button type="button" className="btn" data-fn="print" disabled={!img} onClick={() => void print()}>
            <Icon name="printer" />
            {t('slip.print')}
          </button>
          <button type="button" className="btn" data-fn="copy" disabled={!img} onClick={() => void copyImage()}>
            <Icon name="image" />
            {t('slip.copyImage')}
          </button>
          <button type="button" className="btn" data-fn="download" disabled={!img} onClick={() => void download()}>
            <Icon name="download" />
            {t('slip.download')}
          </button>
        </div>
      </Dialog>
      {/* พิมพ์: ภาพเดียวบนหน้ากระดาษ ส่วนอื่นของหน้าซ่อนด้วย @media print */}
      {printing && printUrl && createPortal(<img className="slip-print" src={printUrl} alt={t('slip.title')} />, document.body)}
    </>
  );
}
