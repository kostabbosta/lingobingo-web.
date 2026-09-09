import seed from '../public/data/vocabulary-hi.json';
import phrases from '../public/data/vocabulary-phrases.json';
import lessonExamples from '../public/data/vocabulary-examples.json';
import { generateExample } from './example-generator';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';
const bundledContent = [...seed, ...phrases];
export type VocabularyContent = {
  english_word: string; language: string; translation: string | null;
  examples: { english: string; translation: string | null }[];
  examplesUnavailable?: boolean;
  generatedExample?: boolean;
  status: 'reviewed' | 'draft' | 'machine' | 'missing';
};
export function cleanTranslation(value: unknown, language: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (language === 'hi' && !/[\u0900-\u097f]/u.test(value)) return null;
  return value.trim();
}
export function normalizeContent(value: unknown, word: string, language: string): VocabularyContent | null {
  const row = value as Partial<VocabularyContent> | null;
  if (!row || typeof row.english_word !== 'string' || row.english_word.trim().toLowerCase() !== word.trim().toLowerCase() || row.language !== language) return null;
  return { english_word: word, language, translation: cleanTranslation(row.translation, language),
    examples: Array.isArray(row.examples) ? row.examples.filter(e => typeof e?.english === 'string' && e.english.trim()).slice(0, 3)
      .map(e => ({ english: e.english, translation: cleanTranslation(e.translation, language) })) : [],
    status: ['reviewed','draft','machine'].includes(row.status || '') ? row.status! : 'missing' };
}
export async function machineTranslation(text: string, language: string): Promise<string | null> {
  try {
    const q = new URLSearchParams({client:'gtx',sl:'en',tl:language,dt:'t',q:text});
    const r = await fetch('https://translate.googleapis.com/translate_a/single?' + q, {signal:AbortSignal.timeout(10000)});
    if (!r.ok) return null;
    const data = await r.json() as unknown[][][];
    return cleanTranslation(data[0]?.map(p => typeof p[0] === 'string' ? p[0] : '').join(''), language);
  } catch { return null; }
}
export async function vocabularyContent(word: string, language: string, generationKey = ''): Promise<VocabularyContent> {
  const key = word.trim().toLowerCase();
  let shared: VocabularyContent | null = null;
  try {
    const q = new URLSearchParams({english_word:'eq.'+key,language:'eq.'+language,select:'english_word,language,translation,examples,status',limit:'1'});
    const r = await fetch(SUPABASE_URL+'/rest/v1/vocabulary_localizations?'+q, {headers:{apikey:SUPABASE_ANON_KEY},signal:AbortSignal.timeout(4000)});
    if (r.ok) { const rows = await r.json() as unknown[]; shared = normalizeContent(rows[0],word,language); if (shared?.examples.length) return shared; }
  } catch { /* Bundled content and machine translations remain available. */ }
  const bundled = normalizeContent(bundledContent.find(row => row.english_word === key && row.language === language),word,language);
  if (bundled) return bundled;
  const translationPromise = shared?.translation ? Promise.resolve(shared.translation) : machineTranslation(word,language);
  // An English example belongs to the word, not to a target language.
  let examples: string[] = bundledContent.find(row => row.english_word === key)?.examples.map(example => example.english)
    ?? (lessonExamples as Record<string, string[]>)[key] ?? [];
  let examplesUnavailable = false;
  let generatedExample = false;
  if (!examples.length && generationKey) {
    const sentence = await generateExample(key, generationKey);
    if (sentence) { examples = [sentence]; generatedExample = true; }
  }
  if (!examples.length) try {
    const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(key), {signal:AbortSignal.timeout(7000)});
    if (r.ok) {
      const entries = await r.json() as {meanings?:{definitions?:{example?:string}[]}[]}[];
      examples = [...new Set(entries.flatMap(e => e.meanings ?? []).flatMap(m => m.definitions ?? []).map(d => d.example).filter((s): s is string => typeof s === 'string' && !!s.trim()))].slice(0,2);
    } else if (r.status !== 404) { examplesUnavailable = true; }
  } catch { examplesUnavailable = true; }
  const translatedExamples = await Promise.all(examples.map(async english => ({english,translation:await machineTranslation(english,language)})));
  const translation = await translationPromise;
  return {english_word:word,language,translation,examples:translatedExamples,status:translation ? 'machine' : 'missing', ...(examplesUnavailable ? {examplesUnavailable:true} : {}), ...(generatedExample ? {generatedExample:true} : {})};
}
