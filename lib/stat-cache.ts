const prefix = 'lingobingo:mastered:v2:';
export function readMastered(storage: Pick<Storage, 'getItem'>, email: string): number | null {
  try {
    const value = JSON.parse(storage.getItem(prefix + email) || 'null');
    return Number.isSafeInteger(value?.count) && value.count >= 0 ? value.count : null;
  } catch { return null; }
}
export function writeMastered(storage: Pick<Storage, 'setItem'>, email: string, count: number) {
  try { storage.setItem(prefix + email, JSON.stringify({ count })); } catch { /* Storage is optional. */ }
}
