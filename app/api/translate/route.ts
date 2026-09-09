import { machineTranslation } from '../../../lib/vocabulary-content';
import { LANGUAGES } from '../../../lib/learning';
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams, text = q.get('text')?.trim() || '', lang = q.get('lang') || '';
  if (!text || text.length > 1000 || !LANGUAGES.some(([code]) => code === lang))
    return Response.json({ error: 'Choose a word and language.' }, { status: 400 });
  let apiKey = '';
  try { const { env } = await import('cloudflare:workers'); apiKey = (env as unknown as { GROQ_API_KEY?: string }).GROQ_API_KEY ?? ''; } catch { /* Non-worker runtime. */ }
  apiKey ||= process.env.GROQ_API_KEY ?? '';
  console.log('translate-diag', JSON.stringify({ lang, keyLen: apiKey.length }));
  const translation = await machineTranslation(text, lang, apiKey);
  if (!translation) return Response.json({ error: 'Translation is temporarily unavailable. Please try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ translation }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
