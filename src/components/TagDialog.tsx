/**
 * แท็กของกระเป๋า — ใส่ได้หลายอันต่อหนึ่งกระเป๋า
 * พิมพ์ชื่อแล้วกด Enter เพื่อเพิ่ม, กดแท็กที่เคยใช้เพื่อสลับใส่/เอาออก, กดกากบาทบนเม็ดเพื่อถอด
 * บันทึกทันทีที่แก้ ไม่ต้องกดยืนยัน (เหมือนสวิตช์อื่นๆ ในแอป) ปิดด้วย Esc หรือปุ่มปิด
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { cleanTags, useStore, type Wallet } from '../store';
import { tagsOf } from '../groups';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

const MAX_LEN = 32;

export function TagDialog({ open, wallet, onClose }: { open: boolean; wallet: Wallet; onClose: () => void }) {
  const { t } = useI18n();
  const { wallets, setWalletTags } = useStore();
  const [draft, setDraft] = useState('');
  const tags = useMemo(() => wallet.tags ?? [], [wallet.tags]);
  /* แท็กที่กระเป๋าใบอื่นใช้อยู่ — กดใส่ได้เลย จะได้ไม่พิมพ์ผิดจนกลายเป็นคนละกลุ่ม */
  const known = useMemo(() => tagsOf(wallets).filter((x) => !tags.includes(x)), [wallets, tags]);

  useEffect(() => {
    if (open) setDraft('');
  }, [open]);

  const set = (next: string[]) => setWalletTags(wallet.id, cleanTags(next));

  function add(e: FormEvent) {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    set([...tags, v]);
    setDraft('');
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('tags.title', { label: wallet.label })}>
      <div className="stack-tight">
        <div className="field">
          <span className="label">{t('tags.current')}</span>
          {tags.length === 0 ? (
            <p className="hint">{t('wallets.noTag')}</p>
          ) : (
            <div className="tag-list">
              {tags.map((tag) => (
                <span key={tag} className="tag tag-removable">
                  {tag}
                  <button type="button" className="tag-x" onClick={() => set(tags.filter((x) => x !== tag))} aria-label={t('tags.remove', { tag })} title={t('tags.remove', { tag })}>
                    <Icon name="x" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <form className="field" onSubmit={add}>
          <label className="label" htmlFor="tag-new">
            {t('tags.add')}
          </label>
          <div className="inline">
            <input id="tag-new" name="tag" className="input" value={draft} placeholder={t('tags.placeholder')} onChange={(e) => setDraft(e.target.value)} autoComplete="off" maxLength={MAX_LEN} />
            <button type="submit" className="btn" disabled={draft.trim() === '' || tags.includes(draft.trim())}>
              <Icon name="plus" />
              {t('tags.addBtn')}
            </button>
          </div>
          <span className="hint">{t('wallets.tagHint')}</span>
        </form>

        {known.length > 0 && (
          <div className="field">
            <span className="label">{t('tags.known')}</span>
            <div className="tag-list">
              {known.map((tag) => (
                <button key={tag} type="button" className="tag tag-pick" onClick={() => set([...tags, tag])}>
                  <Icon name="plus" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="dlg-actions">
        <button type="button" className="btn" onClick={onClose}>
          {t('dialog.close')}
        </button>
      </div>
    </Dialog>
  );
}
