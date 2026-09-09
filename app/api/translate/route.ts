export async function GET(req: Request) {
  const q = new URL(req.url).searchParams,
    text = q.get('text') || '',
    lang = q.get('lang') || '';
  if (
    !text ||
    text.length > 1000 ||
    !/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(lang)
  )
    return Response.json(
      { error: 'Choose a word and language.' },
      { status: 400 },
    );
  try {
    const query = new URLSearchParams({
      client: 'gtx',
      sl: 'en',
      tl: lang,
      dt: 't',
      q: text,
    });
    const r = await fetch(
      'https://translate.googleapis.com/translate_a/single?' + query,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw Error();
    const data = (await r.json()) as unknown[][][];
    const translation = data[0]
      ?.map((part: unknown[]) => (typeof part[0] === 'string' ? part[0] : ''))
      .join('');
    if (!translation) throw Error();
    return Response.json(
      { translation },
      { headers: { 'Cache-Control': 'public, max-age=86400' } },
    );
  } catch {
    return Response.json(
      { error: 'Translation is temporarily unavailable. Please try again.' },
      { status: 503 },
    );
  }
}
