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
  'theme.label': 'ธีม',
  'theme.light': 'สว่าง',
  'theme.dark': 'มืด',
  'nav.settings': 'ตั้งค่าแหล่งข้อมูล',
  'nav.toggleSide': 'ซ่อน/แสดงแผงกระเป๋า',

  'wallets.title': 'กระเป๋า',
  'wallets.count': '{n} กระเป๋า',
  'wallets.col.label': 'ชื่อ',
  'wallets.col.address': 'ที่อยู่',
  'wallets.col.tx': 'ธุรกรรม',
  'wallets.showMore': 'ดูทั้งหมด ({n})',
  'wallets.showLess': 'ย่อ',
  'wallets.import': 'นำเข้าไฟล์',
  'wallets.add': 'เพิ่ม',
  'wallets.clear': 'ล้างทั้งหมด',
  'wallets.clearConfirm': 'ลบกระเป๋าทั้งหมด {n} รายการออกจากเครื่องนี้?',
  'wallets.empty': 'ยังไม่มีกระเป๋า',
  'wallets.remove': 'ลบ {label}',
  'wallets.toggle': 'แสดงธุรกรรมของ {label}',
  'wallets.hide': 'ซ่อนข้อมูลของ {label}',
  'wallets.collapse': 'ย่อแผงกระเป๋า',
  'wallets.expand': 'ขยายแผงกระเป๋า',
  'wallets.show': 'แสดงข้อมูลของ {label}',
  'wallets.state.idle': 'รอ',
  'wallets.state.loading': 'กำลังโหลด…',
  'wallets.state.ok': '{n} รายการ',
  'wallets.state.error': 'ผิดพลาด',
  'wallets.refresh': 'โหลดใหม่',
  'wallets.loadOlder': 'โหลดย้อนหลัง',
  'wallets.loading': 'กำลังโหลด…',

  'add.title': 'เพิ่มกระเป๋า',
  'add.label': 'ป้ายชื่อ',
    'add.address': 'ที่อยู่',
    'add.badAddress': 'ที่อยู่ไม่ถูกต้อง',
  'add.dupe': 'มีกระเป๋านี้อยู่แล้ว',
  'add.submit': 'เพิ่ม',
  'add.done': 'เพิ่มกระเป๋าแล้ว',

  'import.title': 'นำเข้ากระเป๋า',
  'import.file': 'ไฟล์ .csv หรือ .xlsx',
    'import.reading': 'กำลังอ่านไฟล์…',
  'import.noHeader': 'ไฟล์ไม่ถูกต้อง',
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

  'settings.title': 'แหล่งข้อมูล',
    'settings.none': 'ยังไม่มีแหล่งข้อมูล',
  'settings.list': 'รายการแหล่งข้อมูล',
  'settings.enable': 'เปิดใช้ {name}',
  'settings.remove': 'ลบ {name}',
  'settings.add': 'เพิ่มแหล่งข้อมูล',
    'settings.endpoint': 'URL',
      'settings.badUrl': 'URL ไม่ถูกต้อง',
  'settings.addBtn': 'เพิ่ม',
  'settings.added': 'เพิ่มแหล่งข้อมูลแล้ว',
  'settings.pageSize': 'จำนวนต่อหน้า',
  'settings.chainList': 'Chain list URL',
  'settings.chainListSaved': 'บันทึก chain list แล้ว',
  'settings.priceUrl': 'Price URL',
  'settings.priceUrlSaved': 'บันทึก price URL แล้ว',
  'family.evm': 'EVM',
  'family.sol': 'Solana',
  'family.auto': 'ตรวจอัตโนมัติ',
  'settings.family': 'รูปแบบที่อยู่',
  'wallets.state.nosource': 'ไม่มีแหล่งข้อมูล',
  'status.noEndpoint': 'ยังไม่มีแหล่งข้อมูล',
  'status.endpointSet': '{n} แหล่งข้อมูล',
  'wallets.noSource': 'ไม่มีแหล่งข้อมูลสำหรับเชนนี้',

  'recent.title': 'ธุรกรรมล่าสุด',
  'recent.empty': 'เลือกกระเป๋าหรือกดโหลดเพื่อดูธุรกรรมล่าสุด',
  'nav.back': 'กลับ',
  'nav.dashboard': 'แดชบอร์ด',
  'tx.col.from': 'จาก',
  'tx.col.to': 'ถึง',
  'tx.title': 'ธุรกรรม',
  'tx.search': 'ค้นหา…',
  'tx.allWallets': 'ทุกกระเป๋า',
  'tx.allChains': 'ทุกเชน',
  'tx.allTypes': 'ทุกประเภท',
  'tx.hideScam': 'ซ่อนน่าสงสัย',
  'tx.count': '{n} รายการ',
  'tx.col.tx': 'ธุรกรรม',
  'tx.col.submitted': 'ส่งเมื่อ',
  'tx.col.amount': 'จำนวน',
  'tx.col.fee': 'ค่าเครือข่าย',
  'time.justNow': 'เมื่อสักครู่',
  'time.minAgo': '{n} นาทีที่แล้ว',
  'time.hrAgo': '{n} ชม.ที่แล้ว',
  'time.yesterday': '{time}, เมื่อวาน',
  'tx.col.date': 'วันที่',
  'tx.col.value': 'มูลค่า',
  'tx.col.balance': 'ยอด',
  'detail.title': 'รายละเอียดธุรกรรม',
  'detail.executed': 'สำเร็จ',
  'detail.on': 'บน {chain}',
  'detail.from': 'จาก',
  'detail.to': 'ถึง',
  'detail.contract': 'สัญญา',
  'detail.networkFee': 'ค่าเครือข่าย',
  'detail.nonce': 'Nonce',
  'detail.fees': 'ค่าใช้จ่าย',
  'detail.sentValue': 'มูลค่าที่ส่ง',
  'detail.receivedValue': 'มูลค่าที่ได้รับ',
  'detail.swapCost': 'ส่วนต่างสวอป',
  'detail.swapCostHint': 'ค่าธรรมเนียมสวอป · slippage · ราคาขยับ',
  'detail.feePaidBySender': 'ผู้ส่งเป็นคนจ่าย',
  'detail.totalCost': 'รวมค่าใช้จ่าย',
  'detail.method': 'ฟังก์ชัน',
  'detail.status': 'สถานะ',
  'detail.ok': 'สำเร็จ',
  'detail.viewOn': 'ดูบน {name}',
  'detail.noExplorer': 'ไม่มี explorer สำหรับเชนนี้',
  'detail.price': 'ราคา',
  'detail.rate': '1 {symbol}',
  'detail.tokenAddress': 'ที่อยู่โทเคน',
  'detail.explorer': 'เปิด{what}บน explorer',
  'tx.col.time': 'เวลา',
  'tx.col.wallet': 'กระเป๋า',
  'tx.col.chain': 'เชน',
  'tx.col.type': 'ประเภท',
  'tx.col.moves': 'โอน',
  'tx.col.counterparty': 'คู่สัญญา',
  'tx.col.gas': 'ค่าธรรมเนียม',
  'tx.col.hash': 'Hash',
  'tx.type.swap': 'สวอป',
  'tx.type.send': 'ส่ง',
  'tx.type.receive': 'รับ',
  'tx.type.approve': 'อนุมัติ',
  'tx.type.contract': 'สัญญา',
  'tx.failed': 'ล้มเหลว',
  'tx.scam': 'น่าสงสัย',
  'tx.copy': 'คัดลอก {what}',
  'tx.copied': 'คัดลอกแล้ว',
  'tx.emptyEndpoint': 'ยังไม่มีแหล่งข้อมูล',
    'tx.emptyWallets': 'ยังไม่มีกระเป๋า',
  'tx.emptyPick': 'เลือกกระเป๋าเพื่อโหลดธุรกรรม',
    'tx.emptyFiltered': 'ไม่มีรายการที่ตรงตัวกรอง',
  'tx.emptyLoaded': 'ยังไม่มีธุรกรรม — กดโหลดใหม่',
  'tx.error': 'โหลดไม่สำเร็จ: {msg}',
  'tx.errorShape': 'รูปแบบข้อมูลที่ตอบกลับไม่ตรงที่รู้จัก',
  'tx.errorHttp': 'HTTP {status}',
  'tx.errorNet': 'ติดต่อแหล่งข้อมูลไม่ได้',
  'tx.loadAll': 'โหลดทุกกระเป๋า',
  'tx.older': 'โหลดย้อนหลัง',
  'tx.loadingMore': 'กำลังโหลดเพิ่ม…',
  'tx.end': 'ครบแล้ว',
  'tx.reload': 'โหลดใหม่',

  'dialog.cancel': 'ยกเลิก',
  'dialog.close': 'ปิด',
  'dialog.confirm': 'ยืนยัน',
  'confirm.deleteTitle': 'ลบกระเป๋า',
  'confirm.deleteMsg': 'ลบ {label} ออกจากเครื่องนี้? ธุรกรรมที่โหลดไว้จะหายไปด้วย',
  'confirm.clearTitle': 'ล้างกระเป๋าทั้งหมด',
  'foot.local': 'ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์นี้เท่านั้น',
} as const;

export type MessageKey = keyof typeof th;

const en: Record<MessageKey, string> = {
  'app.name': 'XCap',
  'app.sub': 'Scan',
  'nav.skip': 'Skip to main content',
  'nav.lang': 'Switch language',
  'theme.label': 'Theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'nav.settings': 'Data source settings',
  'nav.toggleSide': 'Show or hide wallets panel',

  'wallets.title': 'Wallets',
  'wallets.count': '{n} wallets',
  'wallets.col.label': 'Label',
  'wallets.col.address': 'Address',
  'wallets.col.tx': 'Transactions',
  'wallets.showMore': 'Show all ({n})',
  'wallets.showLess': 'Show less',
  'wallets.import': 'Import file',
  'wallets.add': 'Add',
  'wallets.clear': 'Clear all',
  'wallets.clearConfirm': 'Remove all {n} wallets from this device?',
  'wallets.empty': 'No wallets yet',
  'wallets.remove': 'Remove {label}',
  'wallets.toggle': 'Show transactions of {label}',
  'wallets.hide': 'Hide {label}',
  'wallets.collapse': 'Collapse wallets',
  'wallets.expand': 'Expand wallets',
  'wallets.show': 'Show {label}',
  'wallets.state.idle': 'Idle',
  'wallets.state.loading': 'Loading…',
  'wallets.state.ok': '{n} rows',
  'wallets.state.error': 'Error',
  'wallets.refresh': 'Reload',
  'wallets.loadOlder': 'Load older',
  'wallets.loading': 'Loading…',

  'add.title': 'Add wallet',
  'add.label': 'Label',
    'add.address': 'Address',
    'add.badAddress': 'Invalid address',
  'add.dupe': 'This wallet is already in the list',
  'add.submit': 'Add',
  'add.done': 'Wallet added',

  'import.title': 'Import wallets',
  'import.file': '.csv or .xlsx file',
    'import.reading': 'Reading file…',
  'import.noHeader': 'Invalid file',
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

  'settings.title': 'Data sources',
    'settings.none': 'No sources yet',
  'settings.list': 'Sources',
  'settings.enable': 'Enable {name}',
  'settings.remove': 'Remove {name}',
  'settings.add': 'Add source',
    'settings.endpoint': 'URL',
      'settings.badUrl': 'Invalid URL',
  'settings.addBtn': 'Add',
  'settings.added': 'Source added',
  'settings.pageSize': 'Page size',
  'settings.chainList': 'Chain list URL',
  'settings.chainListSaved': 'Chain list saved',
  'settings.priceUrl': 'Price URL',
  'settings.priceUrlSaved': 'Price URL saved',
  'family.evm': 'EVM',
  'family.sol': 'Solana',
  'family.auto': 'Auto-detect',
  'settings.family': 'Address format',
  'wallets.state.nosource': 'No source',
  'status.noEndpoint': 'No data source',
  'status.endpointSet': '{n} sources',
  'wallets.noSource': 'No source for this chain',

  'recent.title': 'Recent transactions',
  'recent.empty': 'Pick a wallet or load to see recent transactions',
  'nav.back': 'Back',
  'nav.dashboard': 'Dashboard',
  'tx.col.from': 'From',
  'tx.col.to': 'To',
  'tx.title': 'Transactions',
  'tx.search': 'Search…',
  'tx.allWallets': 'All wallets',
  'tx.allChains': 'All chains',
  'tx.allTypes': 'All types',
  'tx.hideScam': 'Hide suspicious',
  'tx.count': '{n} rows',
  'tx.col.tx': 'Transaction',
  'tx.col.submitted': 'Submitted',
  'tx.col.amount': 'Amount',
  'tx.col.fee': 'Network fee',
  'time.justNow': 'just now',
  'time.minAgo': '{n} min ago',
  'time.hrAgo': '{n} hr ago',
  'time.yesterday': '{time}, yesterday',
  'tx.col.date': 'Date',
  'tx.col.value': 'Value',
  'tx.col.balance': 'Balance',
  'detail.title': 'Transaction details',
  'detail.executed': 'Executed',
  'detail.on': 'On {chain}',
  'detail.from': 'From',
  'detail.to': 'To',
  'detail.contract': 'Contract',
  'detail.networkFee': 'Network fee',
  'detail.nonce': 'Nonce',
  'detail.fees': 'Fees',
  'detail.sentValue': 'Sent value',
  'detail.receivedValue': 'Received value',
  'detail.swapCost': 'Swap difference',
  'detail.swapCostHint': 'Swap fee · slippage · price impact',
  'detail.feePaidBySender': 'Paid by sender',
  'detail.totalCost': 'Total cost',
  'detail.method': 'Method',
  'detail.status': 'Status',
  'detail.ok': 'Confirmed',
  'detail.viewOn': 'View on {name}',
  'detail.noExplorer': 'No explorer for this chain',
  'detail.price': 'Price',
  'detail.rate': '1 {symbol}',
  'detail.tokenAddress': 'Token address',
  'detail.explorer': 'View {what} on explorer',
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
  'tx.emptyEndpoint': 'No data source',
    'tx.emptyWallets': 'No wallets yet',
  'tx.emptyPick': 'Pick a wallet to load its transactions',
    'tx.emptyFiltered': 'Nothing matches the current filters',
  'tx.emptyLoaded': 'No transactions yet — press Reload',
  'tx.error': 'Load failed: {msg}',
  'tx.errorShape': 'Response shape not recognised',
  'tx.errorHttp': 'HTTP {status}',
  'tx.errorNet': 'Could not reach the data source',
  'tx.loadAll': 'Load all wallets',
  'tx.older': 'Load older',
  'tx.loadingMore': 'Loading more…',
  'tx.end': 'All loaded',
  'tx.reload': 'Reload',

  'dialog.cancel': 'Cancel',
  'dialog.close': 'Close',
  'dialog.confirm': 'Confirm',
  'confirm.deleteTitle': 'Delete wallet',
  'confirm.deleteMsg': 'Remove {label} from this device? Its loaded transactions go with it.',
  'confirm.clearTitle': 'Clear all wallets',
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
