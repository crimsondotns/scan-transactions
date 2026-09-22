/** ไดอะล็อกบน <dialog> native — portal ไป body, เปิดแล้วทุกอย่างข้างนอก inert (modal.ts); ปิดด้วย Esc / คลิกฉากหลัง */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalLayer } from '../modal';
import { useI18n } from '../i18n';
import { Icon } from './Icon';

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useModalLayer(ref, open);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return createPortal(
    <dialog
      ref={ref}
      className="dlg"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="stack">
          <div className="panel-head">
            <h2>{title}</h2>
            <button type="button" className="btn btn-icon" onClick={onClose} aria-label={t('dialog.close')}>
              <Icon name="x" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>,
    document.body
  );
}
