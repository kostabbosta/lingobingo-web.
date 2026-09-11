import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../lib/supabase-config';
import { getCatalog } from '../../../lib/catalog';
import { catalogProgress, resolveRepeats } from '../../../lib/word-lists';
import {
  nextProgress,
  latestByWord,
  readAllProgress,
  type Progress,
} from '../../../lib/progress';
export const dynamic = 'force-dynamic';
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
type Session = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; user_metadata?: Record<string, string> };
};
class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function upstream(
  path: string,
  token?: string,
  method = 'GET',
  body?: unknown,
  prefer?: string,
) {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(SUPABASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(18000),
  });
  const raw = await r.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new ApiError(
      'The learning service returned an invalid response.',
      502,
    );
  }
  if (!r.ok) {
    // Never log query strings, credentials, row contents, or upstream messages.
    if (path.startsWith('/rest/')) console.error('Account sync failed', {
      resource: path.split('?')[0], method, status: r.status,
      code: typeof data?.code === 'string' && /^[A-Z0-9_]{1,24}$/.test(data.code) ? data.code : 'unknown',
    });
    if (path.startsWith('/rest/') && r.status === 403 && data?.code === '42501') {
      const item = path.startsWith('/rest/v1/user_settings') ? 'these preferences' : 'this progress';
      throw new ApiError(`Your account does not have permission to save ${item}. The database access rules need to be corrected.`, 403);
    }
    const msg = path.startsWith('/auth/')
      ? data?.msg || data?.error_description || data?.message
      : null;
    throw new ApiError(
      msg ||
        'Could not synchronize with your Android account. Please try again.',
      r.status === 401 ? 401 : 400,
    );
  }
  return data;
}
function readCookies(req: Request) {
  return Object.fromEntries(
    (req.headers.get('cookie') || '').split(';').map((s) => {
      const i = s.indexOf('=');
      return [s.slice(0, i).trim(), decodeURIComponent(s.slice(i + 1))];
    }),
  );
}
function cookie(name: string, value: string, secure: boolean, age = 2592000) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
}
async function session(
  req: Request,
): Promise<{ session: Session; refreshed: boolean }> {
  const c = readCookies(req);
  if (c.lb_signed_out === '1') throw new ApiError('Sign in to continue.', 401);
  if (!c.lb_access && !c.lb_refresh)
    throw new ApiError('Sign in to continue with your Android progress.', 401);
  try {
    // The access cookie expires before the refresh cookie. Never validate the
    // public anon key as a user when only a refresh token remains.
    if (!c.lb_access) throw new ApiError('Please sign in again.', 401);
    const user = await upstream('/auth/v1/user', c.lb_access);
    if (!user.email)
      throw new ApiError('Your account needs a verified email.', 401);
    return {
      session: { access_token: c.lb_access, refresh_token: c.lb_refresh, user },
      refreshed: false,
    };
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401 || !c.lb_refresh) throw e;
    const s = await upstream(
      '/auth/v1/token?grant_type=refresh_token',
      undefined,
      'POST',
      { refresh_token: c.lb_refresh },
    );
    if (!s.user?.email) throw new ApiError('Please sign in again.', 401);
    return { session: s, refreshed: true };
  }
}
function reply(
  data: unknown,
  req: Request,
  s?: Session,
  clear = false,
  status = 200,
  signedIn = false,
) {
  const h = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Cookie',
  });
  const secure = !['localhost', '127.0.0.1'].includes(
    new URL(req.url).hostname,
  );
  if (clear || signedIn) h.append('Set-Cookie', cookie('lb_signed_out', clear ? '1' : '', secure, clear ? 31536000 : 0));
  if (s || clear) {
    h.append(
      'Set-Cookie',
      cookie('lb_access', s?.access_token || '', secure, clear ? 0 : 3600),
    );
    h.append(
      'Set-Cookie',
      cookie('lb_refresh', s?.refresh_token || '', secure, clear ? 0 : 2592000),
    );
  }
  return new Response(JSON.stringify(data), { status, headers: h });
}
function fail(e: unknown, req: Request) {
  return reply(
    {
      error:
        e instanceof ApiError
          ? e.message
          : 'The connection was interrupted. Please try again.',
    },
    req,
    undefined,
    false,
    e instanceof ApiError ? e.status : 503,
  );
}
const filter = (email: string, extra: Record<string, string> = {}) =>
  new URLSearchParams({ user_id: `eq.${email}`, ...extra });
// Deleting an auth user and every row it owns needs more authority than the
// signed-in learner has. The key is server-only and never reaches the browser.
async function serviceRoleKey(): Promise<string> {
  let key = '';
  try { const { env } = await import('cloudflare:workers'); key = (env as unknown as { SUPABASE_SERVICE_ROLE_KEY?: string }).SUPABASE_SERVICE_ROLE_KEY ?? ''; } catch { /* Non-worker runtime. */ }
  return key || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
async function admin(path: string, key: string, method: string) {
  const r = await fetch(SUPABASE_URL + path, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(18000),
  });
  if (!r.ok) {
    console.error('Account deletion failed', { resource: path.split('?')[0], method, status: r.status });
    throw new ApiError('Your account could not be fully deleted. Nothing was removed; please try again.', 502);
  }
}
export async function GET(req: Request) {
  let refreshed: Session | undefined;
  try {
    const { session: s, refreshed: r } = await session(req);
    if (r) refreshed = s;
    const email = s.user.email.toLowerCase().trim();
    const token = s.access_token;
    if (new URL(req.url).searchParams.get('identity') === '1') {
      return reply({ email }, req, refreshed);
    }
    const [progress, settings, repeat, catalog] = await Promise.all([
      readAllProgress(
        (q) => upstream('/rest/v1/user_progress?' + q, token),
        email,
      ),
      upstream('/rest/v1/user_settings?' + filter(email), token),
      upstream(
        '/rest/v1/user_repeat_words?' +
          filter(email, { select: 'word_id,english_word', limit: '10000' }),
        token,
      ),
      getCatalog(),
    ]);
    return reply(
      {
        user: {
          email,
          name:
            settings[0]?.username ||
            s.user.user_metadata?.username ||
            s.user.user_metadata?.full_name ||
            email.split('@')[0],
        },
        progress: catalogProgress(catalog, latestByWord(progress)),
        settings: settings[0] || {},
        repeat: resolveRepeats(repeat, progress),
      },
      req,
      refreshed,
    );
  } catch (e) {
    const response = fail(e, req);
    if (refreshed) {
      const secure = !['localhost', '127.0.0.1'].includes(
        new URL(req.url).hostname,
      );
      response.headers.append(
        'Set-Cookie',
        cookie('lb_access', refreshed.access_token, secure, 3600),
      );
      response.headers.append(
        'Set-Cookie',
        cookie('lb_refresh', refreshed.refresh_token, secure),
      );
    }
    return response;
  }
}
export async function POST(req: Request) {
  let refreshed: Session | undefined;
  try {
    const origin = req.headers.get('origin');
    const allowed = new Set([
      new URL(req.url).origin,
      'https://lingobingo-english.k-lobzhanidze.chatgpt.site',
    ]);
    if (!origin || !allowed.has(origin))
      throw new ApiError('Please submit this request from LingoBingo.', 403);
    if (!req.headers.get('content-type')?.startsWith('application/json'))
      throw new ApiError('JSON is required.');
    const text = await req.text();
    if (text.length > 10000) throw new ApiError('Request is too large.');
    let b;
    try {
      b = JSON.parse(text);
    } catch {
      throw new ApiError('Invalid request.');
    }
    if (
      b.action === 'login' ||
      b.action === 'signup' ||
      b.action === 'recover'
    ) {
      if (
        typeof b.email !== 'string' ||
        b.email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(b.email.trim())
      )
        throw new ApiError('Enter a valid email address.');
      const email = b.email.toLowerCase().trim();
      if (b.action === 'recover') {
        await upstream('/auth/v1/recover', undefined, 'POST', { email });
        return reply(
          { message: 'Check your email for the password reset link.' },
          req,
        );
      }
      if (
        typeof b.password !== 'string' ||
        b.password.length < 6 ||
        b.password.length > 200
      )
        throw new ApiError('Use a password with at least 6 characters.');
      const s = await upstream(
        b.action === 'login'
          ? '/auth/v1/token?grant_type=password'
          : '/auth/v1/signup',
        undefined,
        'POST',
        {
          email,
          password: b.password,
          ...(b.action === 'signup'
            ? {
                data: {
                  username:
                    typeof b.name === 'string'
                      ? b.name.slice(0, 60)
                      : email.split('@')[0],
                },
              }
            : {}),
        },
      );
      return reply(
        {
          message: s.access_token
            ? 'Signed in.'
            : 'Check your email to confirm your account.',
          signedIn: !!s.access_token,
        },
        req,
        s.access_token ? s : undefined,
        false,
        200,
        !!s.access_token,
      );
    }
    if (b.action === 'logout') {
      const token = readCookies(req).lb_access;
      if (token) { try { await upstream('/auth/v1/logout?scope=local', token, 'POST', {}); } catch { /* Always end the browser session, including expired sessions. */ } }
      return reply({ ok: true }, req, undefined, true);
    }
    const { session: s, refreshed: r } = await session(req);
    if (r) refreshed = s;
    const email = s.user.email.toLowerCase().trim(),
      token = s.access_token;
    if (b.action === 'settings') {
      if (
        !levels.includes(b.level) ||
        typeof b.lang !== 'string' ||
        !/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(b.lang) ||
        typeof b.name !== 'string' ||
        b.name.length > 60
      )
        throw new ApiError('Choose a valid level, language, and name.');
      const settings = {
          user_id: email,
          level_code: b.level,
          level_title: b.levelTitle || b.level,
          lang_code: b.lang,
          lang_name: String(b.langName || b.lang).slice(0, 40),
          username: b.name,
          updated_at: Date.now(),
        };
      await upstream(
        '/rest/v1/user_settings?on_conflict=user_id',
        token,
        'POST',
        settings,
        'resolution=merge-duplicates',
      );
      return reply({ ok: true, email, settings }, req, refreshed);
    }
    if (b.action === 'progress' || b.action === 'repeat') {
      if (
        typeof b.word !== 'string' ||
        !b.word.trim() ||
        b.word.length > 120 ||
        !Number.isSafeInteger(b.wordId) ||
        b.wordId < 1
      )
        throw new ApiError('Choose a valid word.');
      const english = b.word.trim();
      if (b.action === 'repeat') {
        if (typeof b.saved !== 'boolean')
          throw new ApiError('Invalid repeat action.');
        if (b.saved) {
          const existing = await upstream(
            '/rest/v1/user_repeat_words?' +
              filter(email, {
                english_word: 'eq.' + english,
                select: 'word_id',
              }),
            token,
          );
          if (!existing.length) {
            const highest = await upstream(
              '/rest/v1/user_repeat_words?' +
                filter(email, {
                  select: 'word_id',
                  order: 'word_id.desc',
                  limit: '1',
                }),
              token,
            );
            const id = Math.max(b.wordId, (highest[0]?.word_id || 0) + 1);
            await upstream('/rest/v1/user_repeat_words', token, 'POST', {
              user_id: email,
              word_id: id,
              english_word: english,
            });
          }
        } else
          await upstream(
            '/rest/v1/user_repeat_words?' +
              filter(email, { english_word: 'eq.' + english }),
            token,
            'DELETE',
          );
        return reply({ ok: true }, req, refreshed);
      }
      if (
        typeof b.correct !== 'boolean' ||
        typeof b.responseTime !== 'number' ||
        !Number.isFinite(b.responseTime) ||
        b.responseTime < 0 ||
        b.responseTime > 86400000
      )
        throw new ApiError('Invalid review.');
      for (let attempt = 0; attempt < 4; attempt++) {
        const matches: Progress[] = await upstream(
          '/rest/v1/user_progress?' +
            filter(email, {
              english_word: 'eq.' + english,
              order: 'updated_at.desc',
            }),
          token,
        );
        const prev = matches[0];
        let id = prev?.word_id;
        if (!id) {
          const top = await upstream(
            '/rest/v1/user_progress?' +
              filter(email, {
                select: 'word_id',
                order: 'word_id.desc',
                limit: '1',
              }),
            token,
          );
          id = Math.max(b.wordId, (top[0]?.word_id || 0) + 1);
        }
        const row = {
          ...nextProgress(prev || {}, b.correct, Math.floor(b.responseTime)),
          word_id: id,
          user_id: email,
          english_word: english,
        };
        const q = prev
          ? filter(email, {
              word_id: 'eq.' + id,
              updated_at:
                prev.updated_at == null ? 'is.null' : 'eq.' + prev.updated_at,
              english_word: 'eq.' + english,
            })
          : new URLSearchParams({ on_conflict: 'user_id,word_id' });
        const saved = await upstream(
          '/rest/v1/user_progress?' + q,
          token,
          prev ? 'PATCH' : 'POST',
          row,
          prev
            ? 'return=representation'
            : 'resolution=ignore-duplicates,return=representation',
        );
        if (saved?.length) return reply({ progress: saved[0] }, req, refreshed);
      }
      throw new ApiError(
        'Your progress changed on another device. Please try this answer again.',
        409,
      );
    }
    if (b.action === 'delete-code') {
      const { session: s, refreshed: r } = await session(req);
      if (r) refreshed = s;
      await upstream('/auth/v1/otp', undefined, 'POST', {
        email: s.user.email.toLowerCase().trim(), create_user: false,
      });
      return reply({ ok: true, message: 'A confirmation code is on its way to your email address.' }, req, refreshed);
    }
    if (b.action === 'delete-account') {
      const { session: s } = await session(req);
      const email = s.user.email.toLowerCase().trim();
      const code = typeof b.code === 'string' ? b.code.trim() : '';
      const typed = typeof b.email === 'string' ? b.email.toLowerCase().trim() : '';
      if (typed !== email) throw new ApiError('Type your account email exactly to confirm deletion.');
      if (!/^\d{6}$/.test(code)) throw new ApiError('Enter the six digit code from your email.');
      const adminKey = await serviceRoleKey();
      if (!adminKey) throw new ApiError('Account deletion is not configured on this server yet.', 503);
      // The code proves control of the mailbox; a stolen session alone is not
      // enough to erase an account.
      await upstream('/auth/v1/verify', undefined, 'POST', { type: 'email', email, token: code });
      for (const table of ['user_progress', 'user_repeat_words', 'user_settings']) {
        await admin(`/rest/v1/${table}?${filter(email)}`, adminKey, 'DELETE');
      }
      await admin(`/auth/v1/admin/users/${encodeURIComponent(s.user.id)}`, adminKey, 'DELETE');
      return reply({ ok: true, message: 'Your account and its learning data have been deleted.' }, req, undefined, true);
    }
    throw new ApiError('Unknown action.');
  } catch (e) {
    const response = fail(e, req);
    if (refreshed) {
      const secure = !['localhost', '127.0.0.1'].includes(
        new URL(req.url).hostname,
      );
      response.headers.append(
        'Set-Cookie',
        cookie('lb_access', refreshed.access_token, secure, 3600),
      );
      response.headers.append(
        'Set-Cookie',
        cookie('lb_refresh', refreshed.refresh_token, secure),
      );
    }
    return response;
  }
}
