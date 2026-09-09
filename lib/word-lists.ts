import type { Word } from './learning';
import type { Progress } from './progress';
export type WordListKind = 'all' | 'mastered' | 'practiced' | 'due' | 'repeat';
const key = (text: string) => text.trim().toLowerCase();
export function resolveRepeats(rows: {word_id: number; english_word?: string | null}[], progress: Progress[]) {
  const byId = new Map(progress.filter(p => p.english_word?.trim() && !/^Word #\d+$/i.test(p.english_word)).map(p => [p.word_id, p.english_word.trim()]));
  const result = new Map<string, {word_id: number; english_word: string}>();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.word_id)) continue;
    const english = row.english_word?.trim() || byId.get(row.word_id) || '';
    result.set(english ? key(english) : `id:${row.word_id}`, {word_id:row.word_id, english_word:english});
  }
  return [...result.values()];
}
export function catalogProgress(words: Word[], progress: Progress[]) {
  const available = new Set(words.map(w => key(w.english)));
  return progress.filter(p => p.english_word && available.has(key(p.english_word)));
}
export function wordsForStatistic(words: Word[], progress: Progress[], repeats: { word_id: number; english_word: string }[], kind: WordListKind, now = Date.now()): Word[] {
  if (kind === 'all') return words;
  const vocabulary = new Map(words.map(word => [key(word.english), word]));
  const rows = kind === 'repeat' ? repeats : progress.filter(p =>
    kind === 'mastered' ? p.proficiency >= 80 : kind === 'due' ? !p.next_review_at || p.next_review_at <= now : true);
  const result = new Map<string, Word>();
  for (const row of rows) {
    const english = row.english_word?.trim();
    if (!english) continue;
    result.set(key(english), vocabulary.get(key(english)) ?? {
      id: row.word_id, english, level: 'Other', pos: '', category: 'Saved on Android',
    });
  }
  return [...result.values()];
}
