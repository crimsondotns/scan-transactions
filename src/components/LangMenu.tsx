/** เลือกภาษา — ใช้ Dropdown ตัวเดียวกับทั้งแอป */
import { useI18n, type Lang } from '../i18n';
import { Dropdown } from './Dropdown';

const OPTIONS: Array<{ value: Lang; label: string; meta: string }> = [
  { value: 'th', label: 'ไทย', meta: 'TH' },
  { value: 'en', label: 'English', meta: 'EN' },
];

export function LangMenu() {
  const { t, lang, setLang } = useI18n();
  return <Dropdown value={lang} options={OPTIONS} onChange={setLang} label={t('nav.lang')} display={lang.toUpperCase()} align="right" size="sm" />;
}
