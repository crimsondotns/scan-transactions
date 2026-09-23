/** คัดลอกลงคลิปบอร์ด + แจ้งเตือนสั้นๆ — ใช้ร่วมกันทุกที่ที่กดแล้วคัดลอก */
import { useCallback } from 'react';
import { useI18n } from './i18n';
import { useToast } from './components/Toast';

export function useCopy(): (value: string) => void {
  const { t } = useI18n();
  const { toast } = useToast();
  return useCallback(
    (value: string) => {
      if (!value) return;
      void navigator.clipboard
        .writeText(value)
        .then(() => toast(t('tx.copied')))
        .catch(() => {
          /* clipboard ถูกบล็อก (http หรือสิทธิ์ถูกปิด) */
        });
    },
    [t, toast]
  );
}
