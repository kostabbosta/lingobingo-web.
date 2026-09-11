export type Word = {
  id: number;
  english: string;
  category: string;
  pos: string;
  level: string;
};
export type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};
export type Content = {
  sentences: {
    level: string;
    title: string;
    description: string;
    sentences: { english: string; context: string }[];
  }[];
  slang: {
    name: string;
    entries: { phrase: string; meaning: string; example: string }[];
  }[];
  grammar: {
    id: number;
    title: string;
    level: string;
    summary: string;
    rules: string[];
    examples: { sentence: string }[];
    exercises: Question[];
  }[];
  reading: {
    id: number;
    title: string;
    category: string;
    level: string;
    body: string;
    questions: Question[];
  }[];
  packs: {
    id: string;
    name: string;
    tagline: string;
    words: {
      word: string;
      definition: string;
      example: string;
      tip: string;
      partOfSpeech: string;
    }[];
  }[];
  tests: {
    id: number;
    level: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
};
export const LEVELS = [
  ['A1', 'Starter'],
  ['A2', 'Elementary'],
  ['B1', 'Pre-Intermediate'],
  ['B2', 'Upper Intermediate'],
  ['C1', 'Advanced'],
  ['C2', 'Proficiency'],
];
export const LANGUAGES = [
  ['ka', 'Georgian'],
  ['ru', 'Russian'],
  ['uk', 'Ukrainian'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['tr', 'Turkish'],
  ['ar', 'Arabic'],
  ['zh-CN', 'Chinese'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['pl', 'Polish'],
  ['hi', 'Hindi'],
  ['vi', 'Vietnamese'],
  ['th', 'Thai'],
  ['id', 'Indonesian'],
];
// The caller holds this promise as the live sync, so a request that never
// settles leaves the account updating forever. Give up instead.
export const REQUEST_TIMEOUT = 25000;
export async function api<T = { ok?: boolean; message: string; signedIn?: boolean }>(body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch('/api/app', {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch (e) {
    throw Object.assign(
      Error((e as Error)?.name === 'TimeoutError'
        ? 'Your account took too long to answer. Please try again.'
        : 'The connection was interrupted. Please try again.'),
      { status: 0 },
    );
  }
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok)
    throw Object.assign(Error(d.error || 'Unable to connect.'), {
      status: r.status,
    });
  return d;
}
export function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function speak(text: string) {
  if (!('speechSynthesis' in window))
    throw Error('Audio is not supported in this browser.');
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = 'en-US';
  speech.rate = 0.85;
  window.speechSynthesis.speak(speech);
}
export async function translate(
  text: string,
  lang: string,
  signal?: AbortSignal,
) {
  const q = new URLSearchParams({ text, lang });
  const r = await fetch('/api/translate?' + q, { signal });
  const d = (await r.json()) as { error?: string; translation: string };
  if (!r.ok) throw Error(d.error || 'Translation is unavailable.');
  return d.translation as string;
}
