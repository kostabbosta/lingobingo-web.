'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { api, type Content, type Word } from '../lib/learning';
import { latestByWord, type Progress } from '../lib/progress';
import { readMastered, writeMastered } from '../lib/stat-cache';
import { requireLoadedAccount } from '../lib/account-readiness';
import { BackgroundSaves, type SaveState } from '../lib/background-saves';
import { reconcilePreferences, type Preferences } from '../lib/settings-sync';
import { readAccountCache, writeAccountCache, clearLearningStorage } from '../lib/account-cache';
type Account = {
  user: { email: string; name: string };
  settings: Preferences;
  progress: Progress[];
  repeat: { word_id: number; english_word: string }[];
};
function useLearningState() {
  const [saves, setSaves] = useState<SaveState[]>([]);
  const saveQueue = useRef<BackgroundSaves | null>(null);
  if (!saveQueue.current) saveQueue.current = new BackgroundSaves(setSaves);
  const [view, setView] = useState('Dashboard'),
    [words, setWords] = useState<Word[]>([]),
    [content, setContent] = useState<Content | null>(null),
    [account, setAccount] = useState<Account | null>(null),
    [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out' | 'unavailable'>('checking'),
    [cachedMastered, setCachedMastered] = useState<number | null>(null),
    [level, setLevel] = useState('A1'),
    [wordListLevel, setWordListLevel] = useState('All'),
    [lang, setLang] = useState('ka'),
    [message, setMessage] = useState(''),
    [syncing, setSyncing] = useState(false),
    [loading, setLoading] = useState(true),
    [dataError, setDataError] = useState(''),
    [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const generation = useRef(0),
    accountRef = useRef<Account | null>(null),
    signedOut = useRef(false),
    lastRefresh = useRef(0),
    reviewsDuringRefresh = useRef<Progress[]>([]),
    repeatsDuringRefresh = useRef<{ email: string; word: Word; saved: boolean }[]>([]),
    settingsDuringRefresh = useRef<{email: string; settings: Account['settings']} | null>(null),
    refreshPromise = useRef<Promise<void> | null>(null);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveQueue.current?.size) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const saveInBackground = (word: Word, task: (checkAccount: () => void) => Promise<void>) => {
    if (signedOut.current) { navigate('Sign In'); throw Error('Sign in to save your words.'); }
    const g = generation.current;
    let email = accountRef.current?.user.email;
    const checkAccount = () => {
      if (g !== generation.current || (email && accountRef.current?.user.email !== email)) throw Error('Your account changed. This save has been paused.');
    };
    saveQueue.current!.add(word.english.toLowerCase(), word.english, async () => {
      checkAccount();
      const loaded = await requireAccount();
      email ??= loaded.user.email;
      checkAccount();
      await task(checkAccount);
    });
  };
  useEffect(() => {
    accountRef.current = account;
    if (!account || signedOut.current) return;
    const count = account.progress.filter(p => p.proficiency >= 80).length;
    setCachedMastered(count);
    try { writeMastered(window.localStorage, account.user.email, count); } catch { /* Optional cache. */ }
    const g = generation.current;
    const timer = window.setTimeout(() => { if (g !== generation.current || signedOut.current) return; try { writeAccountCache(window.localStorage, account); } catch {} }, 250);
    return () => window.clearTimeout(timer);
  }, [account]);
  const navigate = useCallback((next: string) => {
    setWordListLevel('All');
    setView(next);
    window.location.hash = encodeURIComponent(next);
    setMessage('');
    setSelectedWord(null);
    window.scrollTo({ top: 0 });
    window.speechSynthesis?.cancel();
  }, []);
  const refresh = useCallback(async (afterSignIn = false) => {
    if (afterSignIn) { signedOut.current = false; generation.current++; refreshPromise.current = null; }
    if (signedOut.current) return;
    if (refreshPromise.current) return refreshPromise.current;
    const g = generation.current;
    reviewsDuringRefresh.current = [];
    repeatsDuringRefresh.current = [];
    const task = (async () => {
      setSyncing(true);
      try {
        // Verify the session before displaying an account-specific cached count.
        const identityResponse = await fetch('/api/app?identity=1', { cache: 'no-store' });
        const identity = await identityResponse.json() as { email?: string; error?: string };
        if (!identityResponse.ok) throw Object.assign(new Error(identity.error || 'Could not check your account.'), { status: identityResponse.status });
        if (typeof identity.email !== 'string') throw Error('Could not check your account.');
        if (g !== generation.current) return;
        signedOut.current = false;
        setAuthStatus('signed-in');
        if (accountRef.current?.user.email !== identity.email) accountRef.current = null;
        if (!accountRef.current) {
          try { accountRef.current = readAccountCache(window.localStorage, identity.email); } catch {}
          if (accountRef.current?.settings.updated_at) settingsDuringRefresh.current = {email: identity.email, settings: accountRef.current.settings};
          if (accountRef.current?.settings.lang_code) setLang(accountRef.current.settings.lang_code);
          if (accountRef.current?.settings.level_code) setLevel(accountRef.current.settings.level_code);
        }
        setAccount(accountRef.current);
        try { setCachedMastered(readMastered(window.localStorage, identity.email)); } catch { setCachedMastered(null); }
        const data = await api<Account>();
        if (g !== generation.current) return;
        if (data.user.email !== identity.email) { setCachedMastered(null); }
        const loaded = { ...data, progress: latestByWord([...data.progress, ...reviewsDuringRefresh.current.filter(p => p.user_id === data.user.email)]) };
        loaded.settings = reconcilePreferences(data.settings, settingsDuringRefresh.current, data.user.email);
        loaded.user = {...loaded.user, name: loaded.settings.username ?? loaded.user.name};
        for (const change of repeatsDuringRefresh.current) {
          if (change.email !== data.user.email) continue;
          loaded.repeat = loaded.repeat.filter(r => r.english_word !== change.word.english);
          if (change.saved) loaded.repeat.push({ word_id: change.word.id, english_word: change.word.english });
        }
        accountRef.current = loaded;
        setAccount(loaded);
        lastRefresh.current = Date.now();
        setMessage('');
        if (loaded.settings.level_code) setLevel(loaded.settings.level_code);
        if (loaded.settings.lang_code) setLang(loaded.settings.lang_code);
      } catch (e) {
        if (g !== generation.current) return;
        if ((e as { status?: number }).status === 401) {
          signedOut.current = true;
          setAuthStatus('signed-out');
          accountRef.current = null;
          setAccount(null);
          setCachedMastered(null);
        } else {
          setAuthStatus(current => current === 'checking' ? 'unavailable' : current);
          setMessage((e as Error).message);
        }
      } finally {
        if (g === generation.current) setSyncing(false);
      }
    })();
    refreshPromise.current = task;
    try {
      await task;
    } finally {
      if (refreshPromise.current === task) refreshPromise.current = null;
    }
  }, []);
  useEffect(() => {
    const ac = new AbortController();
    Promise.all(
      ['/data/words.json', '/data/content.json'].map(async (url) => {
        const r = await fetch(url, { signal: ac.signal });
        if (!r.ok)
          throw Error(
            'Learning materials could not load. Please reload the page.',
          );
        return r.json();
      }),
    )
      .then(([w, c]) => {
        setWords(w as Word[]);
        setContent(c as Content);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setDataError(e.message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    void refresh();
    const hash = () => {
      const next = decodeURIComponent(window.location.hash.slice(1));
      if (next) setView(next);
    };
    hash();
    window.addEventListener('hashchange', hash);
    const focus = () => {
      if (Date.now() - lastRefresh.current > 300000) void refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      ac.abort();
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('focus', focus);
    };
  }, [refresh]);
  const requireAccount = async () => {
    const g = generation.current;
    try {
      const loaded = await requireLoadedAccount(() => accountRef.current, refresh, () => signedOut.current);
      if (g !== generation.current) throw Error('Your account changed. Please try again.');
      return loaded;
    } catch (error) {
      if ((error as { status?: number }).status === 401) navigate('Sign In');
      throw error;
    }
  };
  const review = async (word: Word, correct: boolean, responseTime: number) => {
    const email = (await requireAccount()).user.email;
    const data = await api<{progress: Progress}>({
      action: 'progress',
      word: word.english,
      wordId: word.id,
      correct,
      responseTime,
    });
    if (refreshPromise.current) reviewsDuringRefresh.current.push(data.progress);
    setAccount((current) =>
      current?.user.email === email
        ? {
            ...current,
            progress: [
              ...current.progress.filter(
                (p) =>
                  p.english_word.toLowerCase() !== word.english.toLowerCase(),
              ),
              data.progress,
            ],
          }
        : current,
    );
    return data.progress as Progress;
  };
  const repeat = async (word: Word, save?: boolean) => {
    const current = await requireAccount();
    const email = current.user.email,
      saved = save ?? !current.repeat.some((r) => r.english_word === word.english);
    await api({ action: 'repeat', word: word.english, wordId: word.id, saved });
    if (refreshPromise.current) repeatsDuringRefresh.current.push({ email, word, saved });
    setAccount((a) =>
      a?.user.email === email
        ? {
            ...a,
            repeat: saved
              ? [...a.repeat.filter((r) => r.english_word !== word.english), { word_id: word.id, english_word: word.english }]
              : a.repeat.filter((r) => r.english_word !== word.english),
          }
        : a,
    );
  };
  const logout = async () => {
    if (saveQueue.current?.size) throw Error('Please finish or retry your pending word saves before signing out.');
    generation.current++;
    accountRef.current = null;
    signedOut.current = true;
    setAuthStatus('signed-out');
    settingsDuringRefresh.current = null;
    reviewsDuringRefresh.current = [];
    repeatsDuringRefresh.current = [];
    try { clearLearningStorage(window.localStorage); clearLearningStorage(window.sessionStorage); } catch {}
    setAccount(null);
    setCachedMastered(null);
    lastRefresh.current = 0;
    setLevel('A1');
    setLang('ka');
    setSyncing(false);
    navigate('Dashboard');
    await api({ action: 'logout' });
  };
  const applySavedPreferences = (email: string, settings: Account['settings']) => {
    if (signedOut.current) return;
    const current = accountRef.current;
    if (current && current.user.email !== email) return;
    settingsDuringRefresh.current = {email, settings};
    if (!current) {
      if (settings.level_code) setLevel(settings.level_code);
      if (settings.lang_code) setLang(settings.lang_code);
      return;
    }
    const updated = {...current, settings: {...current.settings, ...settings}, user: {...current.user, name: settings.username ?? current.user.name}};
    accountRef.current = updated;
    setAccount(updated);
    if (settings.level_code) setLevel(settings.level_code);
    if (settings.lang_code) setLang(settings.lang_code);
  };
  return {
    view,
    navigate,
    words,
    content,
    account,
    authStatus,
    cachedMastered,
    level,
    wordListLevel,
    setWordListLevel,
    setLevel,
    lang,
    setLang,
    message,
    setMessage,
    syncing,
    loading,
    dataError,
    refresh,
    review,
    repeat,
    applySavedPreferences,
    saves,
    saveInBackground,
    retrySave: (key: string) => { void saveQueue.current!.run(key); },
    logout,
    selectedWord,
    setSelectedWord,
  };
}
const LearningContext = createContext<ReturnType<
  typeof useLearningState
> | null>(null);
export function LearningProvider({ children }: { children: ReactNode }) {
  const value = useLearningState();
  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
}
export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw Error('LearningProvider is missing');
  return context;
}
