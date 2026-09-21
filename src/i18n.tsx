/**
 * สลับภาษาไทย–อังกฤษ — พจนานุกรมแบนๆ แบบเดียวกับเว็บพอร์ตของ XCap
 * คีย์มาจากภาษาไทย อังกฤษเป็น Record<MessageKey, string> ลืมแปลแล้ว typecheck ฟ้อง
 * ห้ามเขียนข้อความตรงใน JSX — เพิ่มคีย์ที่นี่แล้วเรียก t()
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { setLocale } from './format';

export type Lang = 'th' | 'en';

const STORAGE_KEY = 'xcap.scan.lang';

const th = {
  'app.name': 'XCap',
  'app.sub': 'Scan',
  'nav.skip': 'ข้ามไปเนื้อหาหลัก',
  'nav.lang': 'สลับภาษา',
  'nav.settings': 'ตั้งค่าแหล่งข้อมูล',
  'status.noEndpoint': 'ยังไม่ได้ตั้งแหล่งข้อมูล',
  'status.endpointSet': 'แหล่งข้อมูลพร้อม',

  'wallets.title': 'กระเป๋า',
  'wallets.count': '{n} กระเป๋า',
  'wallets.import': 'นำเข้าไฟล์',
  'wallets.add': 'เพิ่ม',
  'wallets.clear': 'ล้างทั้งหมด',
  'wallets.clearConfirm': 'ลบกระเป๋าทั้งหมด {n} รายการออกจากเครื่องนี้?',
  'wallets.empty': 'ยังไม่มีกระเป๋า — นำเข้าจาก .csv/.xlsx หรือเพิ่มทีละรายการ',
  'wallets.remove': 'ลบ {label}',
  'wallets.toggle': 'แสดงธุรกรรมของ {label}',
  'wallets.state.idle': 'รอ',
  'wallets.state.loading': 'กำลังโหลด…',
  'wallets.state.ok': '{n} รายการ',
  'wallets.state.error': 'ผิดพลาด',
  'wallets.refresh': 'โหลดใหม่',
  'wallets.loadOlder': 'โหลดย้อนหลัง',
  'wallets.loading': 'กำลังโหลด…',

  'add.title': 'เพิ่มกระเป๋า',
  'add.label': 'ป้ายชื่อ',
  'add.labelPh': 'เช่น Main…',
  'add.address': 'ที่อยู่',
  'add.addressPh': '0x…',
  'add.badAddress': 'ที่อยู่ต้องเป็น 0x ตามด้วยเลขฐานสิบหก 40 ตัว',
  'add.dupe': 'มีกระเป๋านี้อยู่แล้ว',
  'add.submit': 'เพิ่ม',
  'add.done': 'เพิ่มกระเป๋าแล้ว',

  'import.title': 'นำเข้ากระเป๋า',
  'import.file': 'ไฟล์ .csv หรือ .xlsx',
  'import.columns': 'ต้องมีคอลัมน์ Label และ Addresses (หัวตารางแถวแรก) ช่องที่อยู่ใส่หลายที่อยู่คั่นด้วยจุลภาคหรือขึ้นบรรทัดใหม่ได้',
  'import.reading': 'กำลังอ่านไฟล์…',
  'import.noHeader': 'ไม่พบคอลัมน์ Label / Addresses ในแถวแรก',
  'import.readFail': 'อ่านไฟล์ไม่ได้',
  'import.preview': 'พบ {ok} รายการที่ใช้ได้ ข้าม {bad} รายการ',
  'import.col.label': 'ป้ายชื่อ',
  'import.col.address': 'ที่อยู่',
  'import.col.status': 'สถานะ',
  'import.row.ok': 'ใช้ได้',
  'import.row.dupe': 'ซ้ำ',
  'import.row.bad': 'ที่อยู่ไม่ถูกต้อง',
  'import.submit': 'นำเข้า {n} รายการ',
  'import.done': 'นำเข้า {n} กระเป๋าแล้ว',

  'settings.title': 'แหล่งข้อมูลประวัติ',
  'settings.endpoint': 'URL แม่แบบ',
  'settings.endpointPh': 'https://…?id={address}&start_time={start}&page_count={count}',
  'settings.help': 'ใส่ URL ของแหล่งประวัติที่คุณใช้เอง ต้องมี {address} และใส่ {start} (เวลาเริ่มย้อนหลัง, หน้าแรกเป็น 0) กับ {count} (จำนวนต่อหน้า) ได้ตามต้องการ แอปไม่มีค่าเริ่มต้น — เก็บไว้ในเบราว์เซอร์นี้เท่านั้น',
  'settings.pageSize': 'จำนวนต่อหน้า',
  'settings.badUrl': 'ต้องเป็น URL แบบ https และมี {address}',
  'settings.save': 'บันทึก',
  'settings.saved': 'บันทึกแหล่งข้อมูลแล้ว',
  'settings.preview': 'ตัวอย่างคำขอ',

  'tx.title': 'ธุรกรรม',
  'tx.search': 'ค้นหา hash / ที่อยู่ / โทเคน…',
  'tx.allWallets': 'ทุกกระเป๋า',
  'tx.allChains': 'ทุกเชน',
  'tx.allTypes': 'ทุกประเภท',
  'tx.count': '{n} รายการ',
  'tx.col.time': 'เวลา',
  'tx.col.wallet': 'กระเป๋า',
  'tx.col.chain': 'เชน',
  'tx.col.type': 'ประเภท',
  'tx.col.moves': 'โอน',
  'tx.col.counterparty': 'คู่สัญญา',
  'tx.col.gas': 'ค่าธรรมเนียม',
  'tx.col.hash': 'Hash',
  'tx.type.swap': 'สลับ',
  'tx.type.send': 'ส่ง',
  'tx.type.receive': 'รับ',
  'tx.type.approve': 'อนุมัติ',
  'tx.type.contract': 'สัญญา',
  'tx.failed': 'ล้มเหลว',
  'tx.scam': 'น่าสงสัย',
  'tx.copy': 'คัดลอก {what}',
  'tx.copied': 'คัดลอกแล้ว',
  'tx.emptyEndpoint': 'ตั้งแหล่งข้อมูลก่อน',
  'tx.emptyEndpointBody': 'แอปนี้ไม่มีแหล่งข้อมูลติดตัว ใส่ URL แม่แบบของประวัติที่คุณใช้ในหน้าตั้งค่า แล้วรายการธุรกรรมจะขึ้นที่นี่',
  'tx.emptyWallets': 'ยังไม่มีกระเป๋า',
  'tx.emptyWalletsBody': 'นำเข้าไฟล์ .csv / .xlsx ที่มีคอลัมน์ Label และ Addresses หรือเพิ่มทีละรายการจากแผงด้านซ้าย',
  'tx.emptyFiltered': 'ไม่มีรายการที่ตรงตัวกรอง',
  'tx.emptyLoaded': 'ยังไม่มีธุรกรรม — กดโหลดใหม่',
  'tx.error': 'โหลดไม่สำเร็จ: {msg}',
  'tx.errorShape': 'รูปแบบข้อมูลที่ตอบกลับไม่ตรงที่รู้จัก',
  'tx.errorHttp': 'HTTP {status}',
  'tx.errorNet': 'ติดต่อแหล่งข้อมูลไม่ได้',
  'tx.loadAll': 'โหลดทุกกระเป๋า',
  'tx.older': 'โหลดย้อนหลังทุกกระเป๋า',

  'dialog.cancel': 'ยกเลิก',
  'dialog.close': 'ปิด',
  'dialog.confirm': 'ยืนยัน',
  'foot.local': 'ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์นี้เท่านั้น',
} as const;

export type MessageKey = keyof typeof th;

const en: Record<MessageKey, string> = {
  'app.name': 'XCap',
  'app.sub': 'Scan',
  'nav.skip': 'Skip to main content',
  'nav.lang': 'Switch language',
  'nav.settings': 'Data source settings',
  'status.noEndpoint': 'No data source set',
  'status.endpointSet': 'Data source ready',

  'wallets.title': 'Wallets',
  'wallets.count': '{n} wallets',
  'wallets.import': 'Import file',
  'wallets.add': 'Add',
  'wallets.clear': 'Clear all',
  'wallets.clearConfirm': 'Remove all {n} wallets from this device?',
  'wallets.empty': 'No wallets yet — import a .csv/.xlsx or add one at a time',
  'wallets.remove': 'Remove {label}',
  'wallets.toggle': 'Show transactions of {label}',
  'wallets.state.idle': 'Idle',
  'wallets.state.loading': 'Loading…',
  'wallets.state.ok': '{n} rows',
  'wallets.state.error': 'Error',
  'wallets.refresh': 'Reload',
  'wallets.loadOlder': 'Load older',
  'wallets.loading': 'Loading…',

  'add.title': 'Add wallet',
  'add.label': 'Label',
  'add.labelPh': 'e.g. Main…',
  'add.address': 'Address',
  'add.addressPh': '0x…',
  'add.badAddress': 'Address must be 0x followed by 40 hex characters',
  'add.dupe': 'This wallet is already in the list',
  'add.submit': 'Add',
  'add.done': 'Wallet added',

  'import.title': 'Import wallets',
  'import.file': '.csv or .xlsx file',
  'import.columns': 'Requires Label and Addresses columns (header in the first row). The address cell may hold several addresses separated by commas or new lines.',
  'import.reading': 'Reading file…',
  'import.noHeader': 'Label / Addresses columns not found in the first row',
  'import.readFail': 'Could not read the file',
  'import.preview': '{ok} usable rows, {bad} skipped',
  'import.col.label': 'Label',
  'import.col.address': 'Address',
  'import.col.status': 'Status',
  'import.row.ok': 'OK',
  'import.row.dupe': 'Duplicate',
  'import.row.bad': 'Invalid address',
  'import.submit': 'Import {n}',
  'import.done': 'Imported {n} wallets',

  'settings.title': 'History source',
  'settings.endpoint': 'URL template',
  'settings.endpointPh': 'https://…?id={address}&start_time={start}&page_count={count}',
  'settings.help': 'Paste the URL of the history source you use. It must contain {address}; {start} (paging cursor, 0 for the first page) and {count} (page size) are optional. The app ships with no default — the value stays in this browser only.',
  'settings.pageSize': 'Page size',
  'settings.badUrl': 'Must be an https URL containing {address}',
  'settings.save': 'Save',
  'settings.saved': 'Data source saved',
  'settings.preview': 'Request preview',

  'tx.title': 'Transactions',
  'tx.search': 'Search hash / address / token…',
  'tx.allWallets': 'All wallets',
  'tx.allChains': 'All chains',
  'tx.allTypes': 'All types',
  'tx.count': '{n} rows',
  'tx.col.time': 'Time',
  'tx.col.wallet': 'Wallet',
  'tx.col.chain': 'Chain',
  'tx.col.type': 'Type',
  'tx.col.moves': 'Transfers',
  'tx.col.counterparty': 'Counterparty',
  'tx.col.gas': 'Fee',
  'tx.col.hash': 'Hash',
  'tx.type.swap': 'Swap',
  'tx.type.send': 'Send',
  'tx.type.receive': 'Receive',
  'tx.type.approve': 'Approve',
  'tx.type.contract': 'Contract',
  'tx.failed': 'Failed',
  'tx.scam': 'Suspicious',
  'tx.copy': 'Copy {what}',
  'tx.copied': 'Copied',
  'tx.emptyEndpoint': 'Set a data source first',
  'tx.emptyEndpointBody': 'This app ships without a data source. Paste the URL template of the history source you use in Settings and transactions will show up here.',
  'tx.emptyWallets': 'No wallets yet',
  'tx.emptyWalletsBody': 'Import a .csv / .xlsx with Label and Addresses columns, or add wallets one by one from the left panel.',
  'tx.emptyFiltered': 'Nothing matches the current filters',
  'tx.emptyLoaded': 'No transactions yet — press Reload',
  'tx.error': 'Load failed: {msg}',
  'tx.errorShape': 'Response shape not recognised',
  'tx.errorHttp': 'HTTP {status}',
  'tx.errorNet': 'Could not reach the data source',
  'tx.loadAll': 'Load all wallets',
  'tx.older': 'Load older for all',

  'dialog.cancel': 'Cancel',
  'dialog.close': 'Close',
  'dialog.confirm': 'Confirm',
  'foot.local': 'Everything stays in this browser',
};

const DICT: Record<Lang, Record<MessageKey, string>> = { th, en };

type Vars = Record<string, string | number>;

function fill(msg: string, vars?: Vars): string {
  if (!vars) return msg;
  return msg.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const Ctx = createContext<I18n | null>(null);

function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'th' || v === 'en') return v;
  } catch {
    /* private mode ฯลฯ */
  }
  return navigator.language.toLowerCase().startsWith('th') ? 'th' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  setLocale(lang);
  document.documentElement.lang = lang;

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: (key, vars) => fill(DICT[lang][key], vars) }),
    [lang, setLang]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}
