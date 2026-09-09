'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  RotateCcw,
  Search,
  Volume2,
} from 'lucide-react';
import { useLearning } from './learning-provider';
import { shuffled, speak, translate, type Word, LEVELS } from '../lib/learning';
import { wordsForStatistic } from '../lib/word-lists';
import { ParallelVocabulary } from './parallel-vocabulary';
export function AudioButton({ text }: { text: string }) {
  const [error, setError] = useState('');
  return (
    <>
      <button
        className="audio-button"
        aria-label={'Listen to ' + text}
        title="Listen"
        onClick={() => {
          try {
            speak(text);
            setError('');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Volume2 size={20} />
      </button>
      {error && <span role="status">{error}</span>}
    </>
  );
}
export function WordBrowser({
  repeatOnly = false,
  masteredOnly = false,
  practicedOnly = false,
  dueOnly = false,
}: {
  repeatOnly?: boolean;
  masteredOnly?: boolean;
  practicedOnly?: boolean;
  dueOnly?: boolean;
}) {
  const {
    words,
    wordListLevel: level,
    setWordListLevel: setLevel,
    account,
    syncing,
    selectedWord,
    setSelectedWord,
    navigate,
  } = useLearning();
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('All topics'),
    [page, setPage] = useState(0);
  const listWords = useMemo(() => wordsForStatistic(words, account?.progress ?? [], account?.repeat ?? [],
    repeatOnly ? 'repeat' : masteredOnly ? 'mastered' : dueOnly ? 'due' : practicedOnly ? 'practiced' : 'all'),
    [words, account, repeatOnly, masteredOnly, dueOnly, practicedOnly]);
  const categories = useMemo(
    () =>
      Array.from(
        new Set(listWords.filter((w) => level === 'All' || w.level === level).map((w) => w.category)),
      ).sort(),
    [listWords, level],
  );
  const filtered = useMemo(
    () =>
      listWords.filter(
        (w) =>
          (level === 'All' || w.level === level) &&
          (category === 'All topics' || w.category === category) &&
          w.english.toLowerCase().includes(query.toLowerCase()),
      ),
    [listWords, level, query, category],
  );
  useEffect(() => setPage(0), [query, category, level]);
  if (selectedWord) return <WordPractice initial={selectedWord} practiceWords={repeatOnly ? filtered : undefined} />;
  if ((repeatOnly || masteredOnly || practicedOnly || dueOnly) && !account && syncing)
    return <div className="panel empty" role="status">Loading your saved words…</div>;
  if ((repeatOnly || masteredOnly || practicedOnly || dueOnly) && !account)
    return (
      <div className="panel empty">
        <h2>Your words, all together.</h2>
        <p>Sign in to see your Android learning progress.</p>
        <button className="primary-button" onClick={() => navigate('Sign In')}>
          Sign in
        </button>
      </div>
    );
  return (
    <>
      {repeatOnly && account?.repeat.some(r => !r.english_word) && <div className="notice" role="status">{account.repeat.filter(r => !r.english_word).length} saved Android entries still need their word text synced. Open Repeat Words in Android and sync your account to make them available here.</div>}
      <div className="filters">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Search English vocabulary"
            placeholder="Find an English word…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Study level"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setCategory('All topics');
          }}
        >
          <option value="All">All levels</option>
          {LEVELS.map(([code, title]) => (
            <option key={code} value={code}>
              {code} · {title}
            </option>
          ))}
          {listWords.some(w => w.level === 'Other') && <option value="Other">Other saved words</option>}
        </select>
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>All topics</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="section-heading">
        <h2>
          {repeatOnly
            ? 'Your repeat list'
            : masteredOnly
              ? 'Mastered words'
              : dueOnly ? 'Words due for review' : practicedOnly ? 'Words practiced' : category}
        </h2>
        <span>
          {filtered.length.toLocaleString()} words · {level === 'All' ? 'All levels' : level}
        </span>
      </div>
      {!filtered.length ? (
        <div className="panel empty">
          <h3>
            {repeatOnly
              ? 'No repeat words at this level yet.'
              : masteredOnly
                ? 'Keep practicing to master your first words.'
                : 'No words match your search.'}
          </h3>
          <p>Try another level or topic.</p>
        </div>
      ) : (
        <div className="word-list">
          {filtered.slice(page * 24, page * 24 + 24).map((w) => (
            <div className="word-row" key={w.english}>
              <button onClick={() => setSelectedWord(w)}>
                <strong>{w.english}</strong>
                <span>
                  {w.level} · {w.pos} · {w.category}
                  {(masteredOnly || practicedOnly || dueOnly) && (() => {
                    const p = account?.progress.find(p => p.english_word.toLowerCase() === w.english.toLowerCase());
                    return p ? ` · ${Math.round(p.proficiency)}% mastery · ${p.times_viewed} reviews` : '';
                  })()}
                </span>
              </button>
              <AudioButton text={w.english} />
              <button
                className="audio-button"
                aria-label={'Study ' + w.english}
                onClick={() => setSelectedWord(w)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="pagination">
        <button
          className="outline-button"
          disabled={!page}
          onClick={() => setPage((p) => p - 1)}
        >
          <ArrowLeft size={16} />
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 24))}
        </span>
        <button
          className="outline-button"
          disabled={(page + 1) * 24 >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
export function WordPractice({
  initial,
  practiceWords,
  mode = 'Learn Words',
}: {
  initial?: Word;
  practiceWords?: Word[];
  mode?: string;
}) {
  const {
    words,
    level,
    lang,
    account,
    review,
    repeat,
    saveInBackground,
    saves,
    navigate,
    setSelectedWord,
  } = useLearning();
  const [queue, setQueue] = useState<Word[]>([]),
    [index, setIndex] = useState(0),
    [meaning, setMeaning] = useState(''),
    [error, setError] = useState(''),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [answer, setAnswer] = useState(''),
    [choices, setChoices] = useState<string[]>([]),
    [score, setScore] = useState(0),
    [done, setDone] = useState(false),
    [graded, setGraded] = useState(false);
  const started = useRef(0);
  const gradeLock = useRef<number | null>(null);
  const [repeatIntent, setRepeatIntent] = useState<{word: string; saved: boolean} | null>(null);
  const word = queue[index];
  const repeatPending = saves.find(save => save.key === word?.english.toLowerCase());
  const isRepeat = repeatIntent?.word === word?.english && repeatPending && !repeatPending.error
    ? repeatIntent.saved : !!account?.repeat.some(r => r.english_word === word?.english);
  const isQuiz = mode === 'Quiz',
    isWrite = mode === 'Write Practice',
    isGame = mode === 'Word Games',
    isDaily = mode === 'Daily Dose';
  const stage = isDaily ? index % 3 : 0;
  const quiz = isQuiz || (isDaily && stage === 1),
    write = isWrite || isGame || (isDaily && stage === 2);
  const scramble = isGame || (isDaily && stage === 2);
  useEffect(() => {
    const candidates = practiceWords ?? words.filter((w) => w.level === level);
    setQueue(
      initial
        ? [
            initial,
            ...shuffled(candidates.filter((w) => w.id !== initial.id)).slice(
              0,
              9,
            ),
          ]
        : shuffled(candidates).slice(0, isDaily ? 3 : 10),
    );
    setIndex(0);
    setDone(false);
    setScore(0);
  // Keep the current session stable when a review updates the saved list.
  }, [words, level, initial, isDaily]);
  useEffect(() => {
    if (!word) return;
    const ac = new AbortController();
    setMeaning('');
    setError('');
    setRevealed(false);
    setFeedback('');
    setAnswer('');
    setGraded(false);
    started.current = Date.now();
    setChoices(
      shuffled([
        word.english,
        ...shuffled(
          words.filter((w) => w.level === level && w.english !== word.english),
        )
          .slice(0, 3)
          .map((w) => w.english),
      ]),
    );
    translate(word.english, lang, ac.signal)
      .then(setMeaning)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => ac.abort();
  }, [word, lang, words, level]);
  const scrambled = useMemo(
    () => (word ? shuffled(word.english.split('')).join(' ') : ''),
    [word],
  );
  async function grade(correct: boolean, saveForRepeat = false) {
    if (!word || busy || graded || gradeLock.current === word.id) return;
    const responseTime = Math.min(Date.now() - started.current, 86400000);
    setBusy(true);
    setError('');
    try {
      let repeatAdded = false, reviewSaved = false;
      saveInBackground(word, async checkAccount => {
        checkAccount();
        if (saveForRepeat && !correct && !repeatAdded) { await repeat(word, true); repeatAdded = true; }
        checkAccount();
        if (!reviewSaved) { await review(word, correct, responseTime); reviewSaved = true; }
        checkAccount();
        if (correct && practiceWords) await repeat(word, false);
      });
      gradeLock.current = word.id;
      setFeedback(
        correct
          ? practiceWords
            ? 'Well done! You can continue to the next word.'
            : 'Well done! You can continue to the next word.'
          : saveForRepeat
            ? 'Keep practicing! You can continue to the next word.'
            : `Keep practicing. The word is “${word.english}”.`,
      );
      setRevealed(true);
      setGraded(true);
      if (correct) setScore((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (index + 1 >= queue.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  }
  if (!word) return <div className="panel empty">Preparing your words…</div>;
  if (done)
    return (
      <div className="panel completion">
        <span className="icon-tile green">
          <Check />
        </span>
        <h2>{isDaily ? 'Daily Dose complete!' : 'Session complete!'}</h2>
        <p>
          {score} of {queue.length} words recalled correctly.
        </p>
        <p>{saves.length ? 'Your answers are still being saved. Check the saving status above.' : 'Your answers have been saved to your LingoBingo account.'}</p>
        <button
          className="primary-button"
          onClick={() => navigate('My Progress')}
        >
          See my progress
          <ArrowRight size={18} />
        </button>
        <button
          className="text-button"
          onClick={() => {
            setSelectedWord(null);
            navigate(practiceWords ? 'Repeat Words' : 'Dashboard');
          }}
        >
          {practiceWords ? 'Back to repeat words' : 'Back to dashboard'}
        </button>
      </div>
    );
  return (
    <div className={'practice-wrap' + (!quiz && !write ? ' vocabulary-practice' : '')}>
      <div className="practice-toolbar">
        <button
          className="text-button"
          onClick={() => {
            setSelectedWord(null);
            navigate(practiceWords ? 'Repeat Words' : 'Dashboard');
          }}
        >
          <ArrowLeft size={16} />
          {practiceWords ? 'Repeat words' : 'Dashboard'}
        </button>
        <span>
          {level} · {index + 1} / {queue.length}
        </span>
        <button
          className="audio-button"
          disabled={busy || saves.some(save => save.key === word.english.toLowerCase())}
          aria-label="Toggle repeat word"
          aria-pressed={isRepeat}
          onClick={async () => {
            setBusy(true);
            try {
              const saved = !account?.repeat.some(r => r.english_word === word.english);
              saveInBackground(word, async checkAccount => { checkAccount(); await repeat(word, saved); });
              setRepeatIntent({word: word.english, saved});
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Bookmark
            size={20}
            fill={
              isRepeat
                ? 'currentColor'
                : 'none'
            }
          />
        </button>
      </div>
      <div className="progress-track">
        <span style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <section className="flashcard">
        <div className="word-prompt">
        <span className="eyebrow">
          {quiz
            ? 'CHOOSE THE ENGLISH WORD'
            : write
              ? scramble
                ? 'UNSCRAMBLE THE WORD'
                : 'WRITE THE ENGLISH WORD'
              : word.category.toUpperCase()}
        </span>
        <h2>
          {quiz || write ? meaning || 'Loading translation…' : word.english}
        </h2>
        {!quiz && !write && (
          <>
            <p>{word.pos}</p>
            <AudioButton text={word.english} />
          </>
        )}
        {scramble && <div className="scrambled">{scrambled}</div>}
        {!quiz && !write && (
          <div className="meaning">
            {revealed ? (
              <p>{meaning || 'Translation unavailable'}</p>
            ) : (
              <button
                className="outline-button"
                onClick={() => setRevealed(true)}
              >
                Show meaning
              </button>
            )}
          </div>
        )}
        </div>
        {!quiz && !write && <ParallelVocabulary word={word.english} />}
        {quiz && (
          <div className="answer-grid">
            {choices.map((choice) => (
              <button
                key={choice}
                disabled={busy || graded || !meaning}
                className={
                  'answer-option ' +
                  (graded && choice === word.english ? 'correct' : '')
                }
                onClick={() => void grade(choice === word.english)}
              >
                {choice}
              </button>
            ))}
          </div>
        )}
        {write && (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void grade(
                answer.trim().toLowerCase() === word.english.toLowerCase(),
              );
            }}
            className="answer-form"
          >
            <input
              aria-label="Your English answer"
              autoComplete="off"
              spellCheck={false}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={graded || busy}
              placeholder="Type the word…"
            />
            <button
              className="primary-button"
              disabled={busy || graded || !answer.trim() || !meaning}
            >
              {busy ? 'Saving…' : 'Check answer'}
            </button>
            {isWrite && <AudioButton text={word.english} />}
          </form>
        )}
        {feedback && (
          <p className="notice" role="status">
            {feedback} {repeatPending ? (repeatPending.error ? 'Save needs attention—use Retry save above.' : 'Saving in the background…') : 'Saved to your account.'}
          </p>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
            {!meaning && (
              <button
                className="text-button"
                onClick={() => {
                  setError('');
                  translate(word.english, lang)
                    .then(setMeaning)
                    .catch((e) => setError(e.message));
                }}
              >
                Retry translation
              </button>
            )}
          </div>
        )}
      </section>
      <div className="practice-actions">
        {!quiz && !write && !graded ? (
          <>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => void grade(false, true)}
            >
              <RotateCcw size={18} />
              {busy ? 'Saving…' : 'Still learning'}
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void grade(true)}
            >
              <Check size={18} />
              {busy ? 'Saving…' : 'I know this word'}
            </button>
          </>
        ) : graded ? (
          <button className="primary-button" onClick={next}>
            {index + 1 === queue.length ? 'Finish session' : 'Next word'}
            <ArrowRight size={18} />
          </button>
        ) : null}
      </div>
      {!account && (
        <p className="small-note">
          Sign in to save your answers and continue your Android progress.
        </p>
      )}
    </div>
  );
}
