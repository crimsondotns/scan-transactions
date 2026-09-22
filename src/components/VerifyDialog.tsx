/** ตรวจสลิป — วางรหัส (หรือเปิดจากลิงก์แชร์ที่พกข้อมูลมา) → แฮชใหม่เทียบรหัส แล้วโชว์สลิปที่ตรวจแล้ว */
import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { normalizeCode, verifySlip, type SlipData, type SlipRecord, type Verdict } from '../slip';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { useSlipImage } from './SlipView';

export function VerifyDialog({ open, initial, onClose, seen }: { open: boolean; initial: { code: string; data: SlipData | null } | null; onClose: () => void; seen: (hash: string) => boolean }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ verdict: Verdict; rec: SlipRecord | null; stored: boolean } | null>(null);
  const img = useSlipImage(result?.rec ?? null, result?.verdict === 'valid' ? 'verify' : null);

  async function run(c: string, data: SlipData | null) {
    const r = await verifySlip(c, data);
    setResult({ verdict: r.verdict, rec: r.data ? { code: c, data: r.data } : null, stored: r.stored });
  }
  useEffect(() => {
    if (!open) {
      setResult(null);
      setErr(null);
      return;
    }
    if (initial) {
      setCode(initial.code);
      void run(initial.code, initial.data);
    }
  }, [open, initial]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!c) return setErr(t('slip.badCode'));
    setErr(null);
    void run(c, initial?.code === c ? initial.data : null);
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('slip.verify')}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label className="label" htmlFor="slip-code">
            {t('slip.code')}
          </label>
          <div className="inline">
            <input
              id="slip-code"
              name="code"
              type="text"
              className="input mono"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErr(null);
              }}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={err ? 'true' : undefined}
            />
            <button type="submit" className="btn btn-primary" disabled={code.trim() === ''}>
              {t('slip.verifyBtn')}
            </button>
          </div>
          {err && (
            <span className="error" aria-live="polite">
              {err}
            </span>
          )}
        </div>
      </form>
      {result && (
        <div className="stack" aria-live="polite">
          <p className="verdict" data-verdict={result.verdict}>
            <Icon name={result.verdict === 'valid' ? 'shield' : result.verdict === 'tampered' ? 'alert' : 'x'} />
            <span>
              <strong>{t(`slip.verdict.${result.verdict}`)}</strong>
              <span className="hint">
                {result.verdict === 'unknown' ? t('slip.unknownHint') : result.rec && seen(result.rec.data.hash) ? t('slip.seenHint') : result.stored ? t('slip.storedHint') : t('slip.linkHint')}
              </span>
            </span>
          </p>
          {result.rec && (
            <div className="slip-preview" aria-busy={!img}>
              {img ? <img src={img.url} alt={t('slip.title')} width={640} height={img.canvas.height / 2} /> : <span className="spinner" aria-hidden="true" />}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
