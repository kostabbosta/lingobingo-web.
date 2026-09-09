import base from '../public/data/words.json';
import snapshot from '../public/data/android-updates.json';
import type { Word } from './learning';
type Addition = { english: string; category?: string; difficulty?: number; partOfSpeech?: string };
export function mergeCatalog(words: Word[], additions: Addition[], deletions: string[]): Word[] {
  const removed = new Set(deletions.map(w => w.trim().toLowerCase()));
  const merged = new Map(words.filter(w => !removed.has(w.english.toLowerCase())).map(w => [w.english.toLowerCase(), w]));
  let nextId = Math.max(0, ...words.map(w => w.id)) + 1;
  // Match Android: apply deletions, then add words that are not already present.
  for (const row of additions) {
    const english = row.english.trim(), key = english.toLowerCase();
    if (!key || merged.has(key)) continue;
    merged.set(key, { id: nextId++, english, category: row.category || 'General', pos: row.partOfSpeech || 'noun', level: ['A1','A2','B1','B2','C1','C2'][(row.difficulty || 1) - 1] || 'A1' });
  }
  return [...merged.values()];
}
let current = mergeCatalog(base, snapshot.additions, snapshot.deletions);
let refreshedAt = 0;
let pending: Promise<Word[]> | null = null;
export async function getCatalog(): Promise<Word[]> {
  if (Date.now() - refreshedAt < 300000) return current;
  if (pending) return pending;
  pending = (async () => {
    try {
      const root = 'https://raw.githubusercontent.com/kostabbosta/ew-word-updates/main/word-updates/';
      const read = async (name: string) => { const r = await fetch(root + name, { signal: AbortSignal.timeout(4000) }); if (!r.ok) throw Error('Catalog update unavailable'); return r.json(); };
      const [additions, deletions] = await Promise.all([read('additions.json'), read('deletions.json')]);
      if (!Array.isArray(additions) || !Array.isArray(deletions) || !additions.every(a => typeof a?.english === 'string') || !deletions.every(d => typeof d === 'string')) throw Error('Invalid catalog update');
      current = mergeCatalog(base, additions, deletions);
    } catch { /* Keep the last complete catalog, including the bundled Android snapshot. */ }
    refreshedAt = Date.now();
    return current;
  })();
  try { return await pending; } finally { pending = null; }
}
