'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Cloud, LogOut, RefreshCw } from 'lucide-react';
import { useLearning } from './learning-provider';
import { api, LEVELS, LANGUAGES } from '../lib/learning';
import type { Preferences } from '../lib/settings-sync';
export function SignIn() {
  const { refresh, navigate } = useLearning();
  const [mode, setMode] = useState('login'),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('');
  useEffect(()=>{
    const url=new URL(window.location.href),reason=url.searchParams.get('auth_error');
    if(!reason)return;
    const errors:Record<string,string>={google_disabled:'Google sign-in is not available yet. Please use email sign-in or try again later.',google_unavailable:'Google sign-in could not connect. Please try again.',google_cancelled:'Google sign-in was cancelled. You can try again when you’re ready.',google_expired:'Your Google sign-in expired. Please start again in this browser.',google_failed:'Google sign-in could not finish. Please try again.'};
    setFeedback(errors[reason]||'Sign-in could not finish. Please try again.');
    url.searchParams.delete('auth_error');window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  },[]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setFeedback('');
    try {
      const d = await api({
        action: mode,
        email: f.get('email'),
        password: f.get('password'),
        name: f.get('name'),
      });
      if (d.signedIn) {
        navigate('Dashboard');
        void refresh(true);
      } else setFeedback(d.message);
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-card panel">
      <span className="icon-tile blue">
        <Cloud />
      </span>
      <h2>
        {mode === 'login'
          ? 'Pick up where you left off.'
          : mode === 'signup'
            ? 'Your English journey starts here.'
            : 'Reset your password'}
      </h2>
      <p>
        Use the same Google account or email as LingoBingo on Android. Your word progress and
        repeat list follow you here.
      </p>
      {mode!=='recover'&&<><a className="google-signin" href="/api/auth/google" target="_top"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.61 20.46H42V20H24v8h11.3A12 12 0 1 1 32.5 15.5l5.66-5.66A20 20 0 1 0 44 24c0-1.19-.13-2.36-.39-3.54Z"/><path fill="#34A853" d="M6.3 35.2A20 20 0 0 0 38 39.3l-6.2-5.2A12 12 0 0 1 13.7 30Z"/><path fill="#FBBC05" d="M6.3 12.8a20 20 0 0 0 0 22.4l7.4-5.2a12 12 0 0 1 0-12Z"/><path fill="#EA4335" d="M24 4A20 20 0 0 0 6.3 12.8l7.4 5.2A12 12 0 0 1 32.5 15.5l5.66-5.66A19.94 19.94 0 0 0 24 4Z"/></svg>Continue with Google</a><div className="auth-divider"><span>or continue with email</span></div></>}
      <form onSubmit={submit}>
        {mode === 'signup' && (
          <label>
            Your name
            <input name="name" maxLength={60} required autoComplete="name" />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        {mode !== 'recover' && (
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              maxLength={200}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
            />
          </label>
        )}
        <button className="primary-button" disabled={busy}>
          {busy
            ? 'Connecting…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create account'
                : 'Send reset link'}
          <ArrowRight size={18} />
        </button>
      </form>
      {feedback && (
        <p role="status" className="notice">
          {feedback}
        </p>
      )}
      <div className="account-links">
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setFeedback('');
          }}
        >
          {mode === 'login' ? 'Create an account' : 'Back to sign in'}
        </button>
        {mode === 'login' && (
          <button
            onClick={() => {
              setMode('recover');
              setFeedback('');
            }}
          >
            Forgot password?
          </button>
        )}
      </div>
      <p className="small-note">
        Use the same email you use in the Android app.
      </p>
    </section>
  );
}
function DeleteAccount({ email }: { email: string }) {
  const { logout } = useLearning();
  const [confirming, setConfirming] = useState(false),
    [typed, setTyped] = useState(''),
    [busy, setBusy] = useState(false), [note, setNote] = useState(''), [error, setError] = useState('');
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  async function destroy(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setNote('');
    try {
      const r = await api<{ message: string }>({ action: 'delete-account', email: typed });
      setNote(r.message);
      setConfirming(false);
      await logout();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="danger-zone">
      <h3>Delete your account</h3>
      <p>
        This permanently removes your LingoBingo account and everything stored with it: your saved
        words and proficiency, your repeat list, and your study preferences. It affects the Android
        app too, because both share one account. It cannot be undone.
      </p>
      {!confirming && (
        <button type="button" className="danger-button" onClick={() => { setConfirming(true); setError(''); setNote(''); }}>
          Delete account
        </button>
      )}
      {confirming && (
        <form className="danger-confirm" onSubmit={destroy}>
          <p><strong>This cannot be undone.</strong> Confirm by typing your account email below.</p>
          <label>
            Type <strong>{email}</strong> to confirm
            <input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required aria-invalid={typed.length > 0 && !matches} />
          </label>
          <div className="danger-actions">
            <button className="danger-button" disabled={busy || !matches}>
              {busy ? 'Deleting…' : 'Delete my account permanently'}
            </button>
            <button type="button" className="text-button" disabled={busy} onClick={() => { setConfirming(false); setTyped(''); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}
      {note && <p className="notice" role="status">{note}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
    </div>
  );
}
export function SettingsView() {
  const { account, authStatus, level: savedLevel, lang: savedLang, refresh, logout, navigate, applySavedPreferences } =
    useLearning();
  const [level, setLevel] = useState(savedLevel), [lang, setLang] = useState(savedLang),
    [preferencesEdited, setPreferencesEdited] = useState(false);
  useEffect(() => { if (!preferencesEdited) { setLevel(savedLevel); setLang(savedLang); } }, [savedLevel, savedLang, preferencesEdited]);
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    if (authStatus === 'signed-out') {
      navigate('Sign In');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      const saved = await api<{ok: boolean; email: string; settings: Preferences}>({
        action: 'settings',
        level,
        levelTitle: LEVELS.find((l) => l[0] === level)?.[1],
        lang,
        langName: LANGUAGES.find((l) => l[0] === lang)?.[1],
      });
      applySavedPreferences(saved.email, saved.settings);
      setFeedback('Your preferences are saved to your LingoBingo account.');
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel settings-panel">
      <h2>Your classroom, your pace.</h2>
      <p>Select your study level and native language.</p>
      <form onSubmit={save}>
        {/* Assigned when the account was created, and the same name the Android
            app and the leaderboard use, so it is shown rather than edited. */}
        <div className="readonly-field">
          <span>Username</span>
          <strong>{account?.user.name || '—'}</strong>
        </div>
        <label>
          Native language
          <select value={lang} onChange={(e) => { setLang(e.target.value); setPreferencesEdited(true); }}>
            {LANGUAGES.map(([code, name]) => (
              <option value={code} key={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>Study level</label>
        <div className="level-options">
          {LEVELS.map(([code, title]) => (
            <button
              type="button"
              className={
                code === level ? 'level-option selected' : 'level-option'
              }
              key={code}
              onClick={() => { setLevel(code); setPreferencesEdited(true); }}
            >
              <strong>{code}</strong>
              <span>{title}</span>
              {code === level && <b>✓</b>}
            </button>
          ))}
        </div>
        <button disabled={busy || authStatus === 'checking'} className="primary-button">
          {busy
            ? 'Saving…'
            : authStatus === 'checking' ? 'Checking sign-in…'
            : authStatus === 'signed-out' ? 'Sign in to save preferences'
            : 'Save preferences'}
        </button>
      </form>
      {feedback && (
        <p className="notice" role="status">
          {feedback}
        </p>
      )}
      {authStatus === 'signed-in' && <DeleteAccount email={account?.user.email || ''} />}
      {authStatus === 'signed-in' && (
        <div className="account-links">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw size={16} />
            Sync now
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await logout();
              } catch (e) {
                setFeedback((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </section>
  );
}
