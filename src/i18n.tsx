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
  'add.badAddress': 'ต้องเป็นที่อยู่ EVM (0x…) หรือ Solana (base58)',
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
  'settings.help': 'แอปไม่มีแหล่งข้อมูลติดตัว — วาง URL ของแหล่งประวัติที่คุณใช้เอง เพิ่มได้หลายแหล่ง กระเป๋าแต่ละใบจะถูกถามทุกแหล่งที่เปิดอยู่และตรงตระกูลเชน ค่าเก็บในเบราว์เซอร์นี้เท่านั้น',
  'settings.none': 'ยังไม่มีแหล่งข้อมูล',
  'settings.list': 'รายการแหล่งข้อมูล',
  'settings.enable': 'เปิดใช้ {name}',
  'settings.remove': 'ลบ {name}',
  'settings.add': 'เพิ่มแหล่งข้อมูล',
  'settings.name': 'ชื่อ',
  'settings.namePh': 'เช่น หลัก…',
  'settings.family': 'ตระกูลเชน',
  'settings.endpoint': 'URL แม่แบบ',
  'settings.endpointPh': 'https://…?address={address}&start={start}&limit={count}',
  'settings.placeholders': 'ต้องมี {address}; {start} (เวลาของแถวเก่าสุด หน้าแรกเป็น 0), {cursor} (hash/signature ของแถวเก่าสุด) และ {count} (จำนวนต่อหน้า) ใส่ได้ตามที่แหล่งข้อมูลรองรับ',
  'settings.badUrl': 'ต้องเป็น URL แบบ https และมี {address}',
  'settings.addBtn': 'เพิ่ม',
  'settings.added': 'เพิ่มแหล่งข้อมูลแล้ว',
  'settings.pageSize': 'จำนวนต่อหน้า',
  'family.evm': 'EVM',
  'family.sol': 'Solana',
  'status.noEndpoint': 'ยังไม่มีแหล่งข้อมูล',
  'status.endpointSet': '{n} แหล่งข้อมูล',
  'wallets.noSource': 'ไม่มีแหล่งข้อมูลสำหรับเชนนี้',

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
  'tx.emptyEndpointBody': 'แอปนี้ไม่มีแหล่งข้อมูลติดตัว วาง URL ของแหล่งประวัติที่คุณใช้ (EVM และ/หรือ Solana) ในหน้าตั้งค่า แล้วรายการธุรกรรมจะขึ้นที่นี่',
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
  'add.badAddress': 'Must be an EVM (0x…) or Solana (base58) address',
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

  'settings.title': 'History sources',
  'settings.help': 'The app ships with no data source. Paste the URLs of the history sources you use; add as many as you like. Each wallet is queried against every enabled source of its chain family. Stored in this browser only.',
  'settings.none': 'No sources yet',
  'settings.list': 'Sources',
  'settings.enable': 'Enable {name}',
  'settings.remove': 'Remove {name}',
  'settings.add': 'Add source',
  'settings.name': 'Name',
  'settings.namePh': 'e.g. Primary…',
  'settings.family': 'Chain family',
  'settings.endpoint': 'URL template',
  'settings.endpointPh': 'https://…?address={address}&start={start}&limit={count}',
  'settings.placeholders': 'Must contain {address}; {start} (oldest row time, 0 on the first page), {cursor} (oldest row hash/signature) and {count} (page size) are optional, whichever the source supports.',
  'settings.badUrl': 'Must be an https URL containing {address}',
  'settings.addBtn': 'Add',
  'settings.added': 'Source added',
  'settings.pageSize': 'Page size',
  'family.evm': 'EVM',
  'family.sol': 'Solana',
  'status.noEndpoint': 'No data source',
  'status.endpointSet': '{n} sources',
  'wallets.noSource': 'No source for this chain',

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
  'tx.emptyEndpointBody': 'This app ships without a data source. Paste the URLs of the history sources you use (EVM and/or Solana) in Settings and transactions will show up here.',
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
