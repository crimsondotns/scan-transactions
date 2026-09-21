/** ไดอะล็อกยืนยัน — ใช้กับ action ที่ย้อนกลับไม่ได้ (ลบกระเป๋า / ล้างทั้งหมด) */
import { useI18n } from '../i18n';
import { Dialog } from './Dialog';

export interface ConfirmState {
  type: 'deleteWallet' | 'clearAll';
  title: string;
  message: string;
  walletId: string | null;
}

export function ConfirmDialog({ state, onConfirm, onCancel }: { state: ConfirmState | null; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={state !== null} onClose={onCancel} title={state?.title ?? ''}>
      <div className="stack">
        <p className="confirm-msg">{state?.message}</p>
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={onCancel}>
            {t('dialog.cancel')}
          </button>
          <button type="button" className="btn btn-primary btn-danger" onClick={onConfirm} autoFocus>
            {t('dialog.confirm')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
