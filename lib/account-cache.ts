import type { Progress } from './progress';
import type { Preferences } from './settings-sync';
export type AccountSnapshot = {
  user: {email: string; name: string}; settings: Preferences;
  progress: Progress[]; repeat: {word_id: number; english_word: string}[];
};
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
const key = (email: string) => 'lingobingo:account:v1:' + email.trim().toLowerCase();
export function readAccountCache(storage: Storage, email: string, now = Date.now()): AccountSnapshot | null {
  try {
    const raw = storage.getItem(key(email));
    if (!raw || raw.length > 8_000_000) return null;
    const {savedAt, account} = JSON.parse(raw);
    if (!Number.isFinite(savedAt) || now - savedAt > 86400000 || savedAt > now
      || account?.user?.email !== email || typeof account.user.name !== 'string'
      || !account.settings || typeof account.settings !== 'object'
      || !Array.isArray(account.progress) || !Array.isArray(account.repeat)) return null;
    if (!account.progress.every((p: Progress) => p && typeof p.english_word === 'string' && Number.isFinite(p.proficiency) && Number.isFinite(p.times_viewed))
      || !account.repeat.every((r: {english_word: string; word_id: number}) => r && typeof r.english_word === 'string' && Number.isSafeInteger(r.word_id))) return null;
    return account;
  } catch { return null; }
}
export function writeAccountCache(storage: Storage, account: AccountSnapshot, now = Date.now()) {
  try {
    const raw = JSON.stringify({savedAt: now, account: {user: account.user, settings: account.settings, progress: account.progress, repeat: account.repeat}});
    if (raw.length <= 8_000_000) storage.setItem(key(account.user.email), raw);
  } catch { /* Cache quota/storage failures must never prevent learning. */ }
}
export function clearAccountCache(storage: Storage, email: string) {
  try { storage.removeItem(key(email)); } catch { /* Optional cache. */ }
}
export function clearLearningStorage(storage: Pick<globalThis.Storage, 'length' | 'key' | 'removeItem'>) {
  for (let i = storage.length - 1; i >= 0; i--) {
    const name = storage.key(i);
    if (name?.startsWith('lingobingo:')) storage.removeItem(name);
  }
}
