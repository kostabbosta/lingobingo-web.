import { vocabularyContent } from '../../../lib/vocabulary-content';
import { LANGUAGES } from '../../../lib/learning';
import words from '../../../public/data/words.json';
const knownWords = new Set(words.map(word => word.english.toLowerCase()));
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams, word = q.get('word')?.trim() ?? '', language = q.get('lang') ?? 'hi';
  if (!word || word.length > 120 || !LANGUAGES.some(([code]) => code === language)) return Response.json({error:'Choose a vocabulary word and supported language.'},{status:400});
  let generationKey = '';
  if (knownWords.has(word.toLowerCase())) {
    try { const {env} = await import('cloudflare:workers'); generationKey = (env as unknown as {GROQ_API_KEY?: string}).GROQ_API_KEY ?? ''; } catch { /* Non-worker runtime. */ }
    generationKey ||= process.env.GROQ_API_KEY ?? '';
  }
  const content = await vocabularyContent(word,language,generationKey);
  const complete = !!content.translation && content.examples.length > 0 && content.examples.every(e => e.translation);
  return Response.json(content,{headers:{'Cache-Control': complete ? 'public, max-age=3600' : 'no-store'}});
}
