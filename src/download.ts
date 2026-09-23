/** บันทึกข้อความเป็นไฟล์ในเครื่อง — ไม่มีเซิร์ฟเวอร์ ไฟล์จึงสร้างในเบราว์เซอร์แล้วให้ดาวน์โหลดเลย */
export function downloadText(name: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
