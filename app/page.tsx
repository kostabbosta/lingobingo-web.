'use client';
import { useEffect } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Layers,
  BarChart3,
  Settings,
  Search,
  ArrowRight,
  Trophy,
  RotateCcw,
  Lightbulb,
  Target,
  GraduationCap,
  FolderOpen,
  MessageCircle,
  Pencil,
  Gamepad2,
  Puzzle,
  BookText,
  Award,
  Cloud,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { LearningProvider, useLearning } from '../components/learning-provider';
import { SignIn, SettingsView } from '../components/account-views';
import { WordBrowser, WordPractice } from '../components/word-views';
import {
  ContentView,
  PlacementTest,
  Crossword,
} from '../components/content-views';
import { LEVELS, LANGUAGES } from '../lib/learning';
import { DailyStats } from '../components/daily-stats';
import { AdBanner } from '../components/ad-banner';
import { PLAY_STORE_URL } from '../lib/site';
const moduleColors: Record<string, string> = {
  'Learn Words': '#2196F3', Quiz: '#9C27B0', Grammar: '#4CAF50', Categories: '#FF9800',
  Sentences: '#3F51B5', 'Write Practice': '#FF5722', 'Word Games': '#FFA000', Reading: '#009688',
  Slang: '#E91E63', Crossword: '#673AB7', 'Exam Vocabulary Packs': '#4527A0', Achievements: '#F9A825',
  'Level Test': '#00BCD4', 'Daily Dose': '#1565C0',
};
const modes = [
  ['Learn Words', 'Learn new words, one by one.', BookOpen, 'blue'],
  ['Quiz', 'Put your vocabulary to the test.', GraduationCap, 'purple'],
  ['Grammar', 'English rules, made clear.', BookText, 'green'],
  ['Categories', 'Explore words by topic.', FolderOpen, 'orange'],
  ['Sentences', 'Everyday English in context.', MessageCircle, 'indigo'],
  ['Write Practice', 'Build confidence in your spelling.', Pencil, 'red'],
  ['Word Games', 'Unscramble, play, and learn.', Gamepad2, 'orange'],
  ['Reading', 'Read stories. Understand more.', BookOpen, 'teal'],
  ['Slang', 'Speak a little more naturally.', MessageCircle, 'pink'],
  ['Crossword', 'A fresh challenge for your words.', Puzzle, 'purple'],
  [
    'Exam Vocabulary Packs',
    'IELTS, TOEFL, business, and academic.',
    Target,
    'indigo',
  ],
  ['Achievements', 'Your learning milestones.', Award, 'orange'],
] as const;
const nav = [
  ['Dashboard', LayoutDashboard],
  ['Learn Words', BookOpen],
  ['Categories', Layers],
  ['Repeat Words', RotateCcw],
  ['My Progress', BarChart3],
] as const;
export default function Home() {
  return (
    <LearningProvider>
      <Classroom />
    </LearningProvider>
  );
}
function Classroom() {
  const {
    view,
    navigate,
    words,
    account,
    authStatus,
    level,
    lang,
    message,
    setMessage,
    loading,
    dataError,
    syncing,
    cachedMastered,
    saves,
    retrySave,
    refresh,
    selectedWord,
  } = useLearning();
  const progress = account?.progress || [],
    mastered = progress.filter((p) => p.proficiency >= 80).length,
    reviews = progress.reduce((n, p) => n + p.times_viewed, 0),
    // Sign In stays ad-free: AdSense treats a bare authentication screen as a page without content.
    showAds = !loading && !dataError && !selectedWord && view !== 'Sign In';
  useEffect(() => {
    const registry = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!registry?.registerTool) return;
    const lifecycle = new AbortController();
    const available = [
      'Dashboard',
      'Sign In',
      'Settings',
      'Level Test',
      'Daily Dose',
      'My Progress',
      'Repeat Words',
      ...modes.map((m) => m[0]),
    ];
    Promise.resolve(
      registry.registerTool(
        {
          name: 'start_learning_mode',
          description:
            'Open a LingoBingo learning mode. This starts a view; it does not complete a lesson or change saved progress.',
          inputSchema: {
            type: 'object',
            properties: { mode: { type: 'string', enum: available } },
            required: ['mode'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input: unknown) => {
            const mode = (input as { mode?: unknown })?.mode;
            if (typeof mode !== 'string' || !available.includes(mode))
              throw Error('Unknown learning mode');
            navigate(mode);
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
            return { mode, status: 'opened' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [navigate]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          <img src="/brand-logo.svg" alt="" />
          <span>
            Lingo<b>Bingo</b>
            <small>ENGLISH</small>
          </span>
        </a>
        <div className="nav-caption">YOUR LEARNING SPACE</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={view === name ? 'nav-item active' : 'nav-item'}
              aria-current={view === name ? 'page' : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={20} />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="learning-note">
            <BookOpen size={22} />
            <strong>A little every day.</strong>
            <p>Make room for your next new word.</p>
          </div>
          <button className="nav-item" onClick={() => navigate('Settings')}>
            <Settings size={20} />
            Settings
          </button>
          <button
            className="profile"
            onClick={() => navigate(authStatus === 'signed-out' ? 'Sign In' : 'Settings')}
          >
            <div className="avatar">
              {(account?.user.name || account?.user.email)?.[0]?.toUpperCase() || 'L'}
            </div>
            <div>
              {/* The name is the one chosen at registration, or kept in Settings. */}
              <strong>{account ? `Welcome, ${account.user.name || account.user.email}` : 'Welcome, learner'}</strong>
              <small>
                {authStatus === 'signed-in' ? 'Your LingoBingo account'
                  : authStatus === 'signed-out' ? 'Sign in to sync progress' : 'Checking your account…'}
              </small>
            </div>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Your classroom <span>/</span> <strong>{view}</strong>
          </span>
          <div className="top-actions">
            <a className="android-download" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Download LingoBingo for Android on Google Play (opens in a new tab)">
              <img src="/android.svg" width="24" height="24" alt="" />
              <span>Get the Android app</span>
            </a>
            <button
              className="search-button"
              onClick={() => navigate('Categories')}
            >
              <Search size={18} />
              Search words
            </button>
            <button
              className="language-button"
              onClick={() => navigate('Settings')}
            >
              {LANGUAGES.find((l) => l[0] === lang)?.[1] || lang}
            </button>
            <button
              className="level-badge"
              onClick={() => navigate('Settings')}
            >
              {level} ⌄
            </button>
            <button
              className="sync-button"
              disabled={syncing && authStatus !== 'signed-out'}
              onClick={() => (authStatus === 'signed-out' ? navigate('Sign In') : void refresh())}
            >
              {account ? <Cloud size={18} /> : null}
              {/* Being signed out is settled news; a sync still in flight is not. */}
              {authStatus === 'signed-out' ? 'Sign in'
                : syncing ? (account || cachedMastered !== null ? 'Updating progress…' : 'Loading progress…')
                : 'Sync'}
            </button>
          </div>
        </header>
        {showAds && <AdBanner placement="top" />}
        <div className="classroom-row">
        {showAds && <AdBanner placement="left" />}
        <main style={{ '--module-accent': moduleColors[view] || '#2196F3' } as React.CSSProperties}>
          <DailyStats />
          <div className="page-heading">
            <div>
              <div className="eyebrow">LET’S KEEP LEARNING</div>
              <h1>
                {view === 'Dashboard' ? 'Learn English, one word at a time.' : view}
              </h1>
              <p>
                {view === 'Dashboard'
                  ? 'Build your English vocabulary with flashcards, grammar lessons, quizzes, and daily practice from A1 to C2.'
                  : view === 'Sign In'
                    ? 'One account. Your progress, wherever you learn.'
                    : `${level} · ${LEVELS.find((l) => l[0] === level)?.[1] || 'English learning'}`}
              </p>
            </div>
            {view === 'Dashboard' ? (
              <button
                className="outline-button"
                onClick={() => navigate('Level Test')}
              >
                <Target size={17} />
                Find my level
              </button>
            ) : (
              <button
                className="outline-button"
                onClick={() => navigate('Dashboard')}
              >
                Dashboard
              </button>
            )}
          </div>
          {saves.length > 0 && <div className="notice" role="status">
            <div>
              {saves.some(save => !save.error) && <p>Saving {saves.filter(save => !save.error).length} word action(s) in the background. You can keep learning; keep this tab open.</p>}
              {saves.filter(save => save.error).map(save => <p key={save.key}>
                Could not finish saving “{save.label}”: {save.error} <button className="text-button" onClick={() => retrySave(save.key)}>Retry save</button>
              </p>)}
            </div>
          </div>}
          {message && (
            <div className="notice error" role="alert">
              {message}
              <button
                aria-label="Dismiss message"
                onClick={() => setMessage('')}
              >
                ×
              </button>
            </div>
          )}
          {dataError ? (
            <div className="panel empty" role="alert">
              {dataError}
              <button
                className="primary-button"
                onClick={() => location.reload()}
              >
                Reload lessons
              </button>
            </div>
          ) : loading ? (
            <div className="panel empty" role="status">
              Opening your classroom…
            </div>
          ) : (
            <>
              {view === 'Dashboard' && (
                <>
                  <div className="stats-row">
                    {([
                      [
                        BookOpen,
                        words.length.toLocaleString(),
                        'Words to explore',
                        'blue',
                      ],
                      [
                        Trophy,
                        account ? mastered : cachedMastered ?? '—',
                        syncing && cachedMastered !== null ? 'Words mastered · updating' : 'Words mastered',
                        'orange',
                      ],
                      [
                        RotateCcw,
                        account ? account.repeat.length : '—',
                        'Words to repeat',
                        'purple',
                      ],
                      [
                        CheckCircle,
                        account ? reviews : '—',
                        'Reviews completed',
                        'green',
                      ],
                    ] as const).map(([Icon, num, label, color], index) => (
                      <button className="stat stat-link" key={color}
                        onClick={() => navigate(['Categories', 'Mastered Words', 'Repeat Words', 'Practiced Words'][index])}>
                        <span className={`icon-tile ${color}`}>
                          <Icon size={22} />
                        </span>
                        <div>
                          <strong>{String(num)}</strong>
                          <span>{String(label)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <Dashboard />
                </>
              )}
              {view === 'Sign In' && <SignIn />}
              {view === 'Settings' && <SettingsView />}
              {view === 'Categories' && <WordBrowser />}
              {view === 'Repeat Words' && <WordBrowser repeatOnly />}
              {view === 'Mastered Words' && <WordBrowser masteredOnly />}
              {view === 'Practiced Words' && <WordBrowser practicedOnly />}
              {view === 'Due Words' && <WordBrowser dueOnly />}
              {[
                'Learn Words',
                'Quiz',
                'Write Practice',
                'Word Games',
                'Daily Dose',
              ].includes(view) && <WordPractice key={view} mode={view} />}{' '}
              {(
                [
                  'Grammar',
                  'Reading',
                  'Sentences',
                  'Slang',
                  'Exam Vocabulary Packs',
                ] as const
              ).map((kind) =>
                view === kind ? <ContentView key={kind} kind={kind} /> : null,
              )}
              {view === 'Level Test' && <PlacementTest />}
              {view === 'Crossword' && <Crossword />}
              {view === 'My Progress' && <ProgressView />}
              {view === 'Achievements' && <ProgressView achievements />}
            </>
          )}
          {showAds && <AdBanner placement="bottom" />}
        </main>
        {showAds && <AdBanner placement="right" />}
        </div>
        <footer>
          <span>LingoBingo English · Vocabulary, grammar & daily practice</span>
          <a href="/privacy">Privacy Policy</a>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Download on Google Play ↗</a>
        </footer>
      </div>
    </div>
  );
}
function Dashboard() {
  const { navigate, account, level, words, setWordListLevel } = useLearning();
  const levelWords = words.filter((w) => w.level === level),
    mastered = levelWords.filter((w) =>
      account?.progress.some(
        (p) =>
          p.english_word.toLowerCase() === w.english.toLowerCase() &&
          p.proficiency >= 80,
      ),
    ).length;
  return (
    <div className="dashboard-columns">
      <section>
        <div className="daily-dose">
          <div>
            <span className="daily-tag">
              <Lightbulb size={15} />
              YOUR DAILY DOSE
            </span>
            <h2>Five minutes. A little further.</h2>
            <p>A new word, a quick quiz, and a word scramble.</p>
            <button onClick={() => navigate('Daily Dose')}>
              Start today’s dose <ArrowRight size={18} />
            </button>
          </div>
          <Lightbulb className="daily-symbol" size={90} strokeWidth={1.5} />
        </div>
        <div className="section-heading">
          <h2>Choose a learning mode</h2>
          <span>Learn your way</span>
        </div>
        <div className="mode-grid">
          {modes.map(([title, desc, Icon, color]) => (
            <button
              className="mode-card"
              style={{ '--module-accent': moduleColors[title] } as React.CSSProperties}
              key={title}
              onClick={() => navigate(title)}
            >
              <span className={`icon-tile ${color}`}>
                <Icon size={23} />
              </span>
              <ArrowRight className="mode-arrow" size={17} />
              <h3>{title}</h3>
              <p>{desc}</p>
            </button>
          ))}
        </div>
      </section>
      <aside className="right-rail">
        <div className="panel">
          <div className="section-heading">
            <h3>
              {account ? 'Your progress travels.' : 'Continue from the app.'}
            </h3>
            <Cloud size={20} />
          </div>
          <p>
            {account
              ? 'Your word progress and repeat list use the same LingoBingo account as Android.'
              : 'Sign in with your Android account to bring your learned words and repeat list with you.'}
          </p>
          <button
            className="text-button"
            onClick={() => navigate(account ? 'My Progress' : 'Sign In')}
          >
            {account ? 'See your progress' : 'Connect your account'}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="panel">
          <span className="eyebrow">YOUR CURRENT LEVEL</span>
          <div className="level-title">
            <span>{level}</span>
            <div>
              <h3>{LEVELS.find((l) => l[0] === level)?.[1]}</h3>
              <button className="text-button" onClick={() => { navigate('Categories'); setWordListLevel(level); }}>
                {levelWords.length.toLocaleString()} words to explore
              </button>
            </div>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${levelWords.length ? (mastered / levelWords.length) * 100 : 0}%`,
              }}
            />
          </div>
          <button className="text-button" onClick={() => { navigate('Mastered Words'); setWordListLevel(level); }}>
            {account
              ? `${mastered} words mastered at this level.`
              : 'Every word brings you closer.'}
          </button>
          <button className="text-button" onClick={() => navigate('Settings')}>
            Explore study levels
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="panel tip-panel">
          <Lightbulb size={23} />
          <h3>Say it out loud.</h3>
          <p>
            Listen to a word, then repeat it. Hearing your own voice helps make
            it stick.
          </p>
        </div>
      </aside>
    </div>
  );
}
function ProgressView({ achievements = false }: { achievements?: boolean }) {
  const { account, words, navigate, refresh, syncing, setWordListLevel, authStatus } = useLearning();
  if (!account && syncing && authStatus !== 'signed-out') return <section className="panel empty" role="status">Loading your progress…</section>;
  if (!account)
    return (
      <section className="panel empty">
        <h2>Bring your progress with you.</h2>
        <p>
          Sign in with your Android account to see your learned words and
          achievements.
        </p>
        <button className="primary-button" onClick={() => navigate('Sign In')}>
          Sign in
        </button>
      </section>
    );
  const rows = account.progress,
    mastered = rows.filter((p) => p.proficiency >= 80).length,
    due = rows.filter(
      (p) => !p.next_review_at || p.next_review_at <= Date.now(),
    ).length;
  return (
    <>
      <div className="section-heading">
        <h2>
          {achievements
            ? 'Your learning milestones'
            : 'Your vocabulary journey'}
        </h2>
        <button
          className="outline-button"
          disabled={syncing}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} />
          {syncing ? 'Syncing…' : 'Refresh progress'}
        </button>
      </div>
      {achievements ? (
        <div className="lesson-grid">
          {[
            [1, 'First word'],
            [10, 'Getting started'],
            [50, 'Word explorer'],
            [100, 'A hundred strong'],
            [500, 'Vocabulary builder'],
            [1000, 'Word master'],
          ].map(([goal, title]) => (
            <button className="panel milestone detail-link" key={goal} onClick={() => navigate('Mastered Words')}>
              <span
                className={
                  'icon-tile ' + (mastered >= Number(goal) ? 'orange' : 'blue')
                }
              >
                <Trophy />
              </span>
              <h3>{title}</h3>
              <p>
                {Math.min(mastered, Number(goal))} / {goal} words mastered
              </p>
              <span>
                {mastered >= Number(goal) ? '✓ Reached' : 'Keep learning'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="summary-grid">
            {[
              [rows.length, 'Words practiced'],
              [mastered, 'Words mastered'],
              [due, 'Due for review'],
              [rows.reduce((n, p) => n + p.times_viewed, 0), 'Total reviews'],
            ].map(([value, label], index) => (
              <button className="panel detail-link" key={label} onClick={() => navigate(['Practiced Words', 'Mastered Words', 'Due Words', 'Practiced Words'][index])}>
                <strong>{value}</strong>
                <p>{label}</p>
              </button>
            ))}
          </div>
          <section className="panel">
            <h2>Progress by level</h2>
            <p>Select a level to see the words you’ve mastered.</p>
            {LEVELS.map(([code, title]) => {
              const ids = new Set(
                  words
                    .filter((w) => w.level === code)
                    .map((w) => w.english.toLowerCase()),
                ),
                count = rows.filter(
                  (p) =>
                    ids.has(p.english_word.toLowerCase()) &&
                    p.proficiency >= 80,
                ).length;
              return (
                <button className="level-progress detail-link" key={code}
                  aria-label={`View ${count} mastered words at ${code} level`}
                  onClick={() => { navigate('Mastered Words'); setWordListLevel(code); }}>
                  <div>
                    <strong>
                      {code} · {title}
                    </strong>
                    <span>
                      {count} / {ids.size}
                    </span>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${ids.size ? (count / ids.size) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
            <button
              className="text-button"
              onClick={() => navigate('Mastered Words')}
            >
              Browse mastered words
              <ArrowRight size={16} />
            </button>
          </section>
        </>
      )}
    </>
  );
}

