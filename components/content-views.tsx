'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, BookOpen } from 'lucide-react';
import { useLearning } from './learning-provider';
import { LEVELS, shuffled, translate, type Question } from '../lib/learning';
import { AudioButton } from './word-views';
export function Questions({
  questions,
  onDone,
}: {
  questions: Question[];
  onDone?: (score: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({}),
    [checked, setChecked] = useState(false);
  const score = questions.reduce(
    (s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );
  return (
    <div className="questions">
      <h3>Check your understanding</h3>
      {questions.map((q, i) => (
        <fieldset key={i}>
          <legend>
            {i + 1}. {q.question}
          </legend>
          <div className="answer-grid">
            {q.options.map((o, j) => (
              <button
                key={j}
                disabled={checked}
                className={
                  'answer-option ' +
                  (checked
                    ? j === q.correctIndex
                      ? 'correct'
                      : answers[i] === j
                        ? 'incorrect'
                        : ''
                    : answers[i] === j
                      ? 'chosen'
                      : '')
                }
                onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
              >
                {o}
              </button>
            ))}
          </div>
          {checked && (
            <p className="feedback">
              {answers[i] === q.correctIndex
                ? '✓ Correct.'
                : 'Correct answer: ' + q.options[q.correctIndex]}{' '}
              {q.explanation}
            </p>
          )}
        </fieldset>
      ))}
      {checked ? (
        <div className="notice" role="status">
          {score} of {questions.length} correct.{' '}
          <button
            className="text-button"
            onClick={() => {
              setAnswers({});
              setChecked(false);
            }}
          >
            Practice again
          </button>
        </div>
      ) : (
        <button
          className="primary-button"
          disabled={Object.keys(answers).length < questions.length}
          onClick={() => {
            setChecked(true);
            onDone?.(score);
          }}
        >
          Check answers
          <Check size={18} />
        </button>
      )}
    </div>
  );
}
export function ContentView({
  kind,
}: {
  kind: 'Grammar' | 'Reading' | 'Sentences' | 'Slang' | 'Exam Vocabulary Packs';
}) {
  const { content, level, setLevel, lang } = useLearning();
  const [selected, setSelected] = useState<number | null>(null),
    [search, setSearch] = useState(''),
    [translation, setTranslation] = useState(''),
    [translating, setTranslating] = useState(false);
  useEffect(() => {
    setSelected(null);
    setSearch('');
    setTranslation('');
  }, [kind, level]);
  if (!content) return <div className="panel">Loading lessons…</div>;
  const group =
    kind === 'Grammar'
      ? content.grammar
      : kind === 'Reading'
        ? content.reading
        : kind === 'Sentences'
          ? content.sentences
          : kind === 'Slang'
            ? content.slang
            : content.packs;
  const indexed = group
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !('level' in item) || item.level === level);
  const current = selected === null ? null : group[selected];
  async function showTranslation(text: string) {
    setTranslating(true);
    try {
      setTranslation(await translate(text, lang));
    } catch (e) {
      setTranslation((e as Error).message);
    } finally {
      setTranslating(false);
    }
  }
  return (
    <>
      <div className="filters">
        {current ? (
          <button
            className="outline-button"
            onClick={() => {
              setSelected(null);
              setTranslation('');
            }}
          >
            <ArrowLeft size={17} />
            All {kind.toLowerCase()}
          </button>
        ) : (
          <input
            aria-label="Search lessons"
            placeholder="Search lessons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <select
          aria-label="Study level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          {LEVELS.map(([code, title]) => (
            <option value={code} key={code}>
              {code} · {title}
            </option>
          ))}
        </select>
      </div>
      {!current ? (
        <div className="lesson-grid">
          {indexed
            .filter(({ item }) =>
              ('title' in item ? item.title : 'name' in item ? item.name : '')
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map(({ item, index }) => (
              <button
                className="panel lesson-card"
                key={index}
                onClick={() => setSelected(index)}
              >
                <span className="icon-tile blue">
                  <BookOpen />
                </span>
                <h3>
                  {'title' in item
                    ? item.title
                    : 'name' in item
                      ? item.name
                      : ''}
                </h3>
                <p>
                  {'summary' in item
                    ? item.summary
                    : 'description' in item
                      ? item.description
                      : 'tagline' in item
                        ? item.tagline
                        : 'category' in item
                          ? item.category
                          : 'Explore useful expressions and examples.'}
                </p>
                <span className="text-button">
                  Open lesson
                  <ArrowRight size={16} />
                </span>
              </button>
            ))}
          {!indexed.length && (
            <div className="panel empty">
              <h3>
                No {kind.toLowerCase()} lessons at {level} yet.
              </h3>
              <p>
                Choose another level to explore the app’s available lessons.
              </p>
            </div>
          )}
        </div>
      ) : (
        <article className="panel lesson-detail">
          <h2>
            {'title' in current
              ? current.title
              : 'name' in current
                ? current.name
                : ''}
          </h2>
          {'summary' in current && (
            <>
              <p>{current.summary}</p>
              <h3>The rules</h3>
              <ul>
                {current.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
              <h3>Examples</h3>
              {current.examples.map((e, i) => (
                <div className="example-row" key={i}>
                  <p>{e.sentence}</p>
                  <AudioButton text={e.sentence} />
                </div>
              ))}
              <Questions questions={current.exercises} key={'g' + current.id} />
            </>
          )}
          {'body' in current && (
            <>
              <p className="reading-body">{current.body}</p>
              <AudioButton text={current.body} />
              <Questions questions={current.questions} key={'r' + current.id} />
            </>
          )}
          {'sentences' in current && (
            <div className="sentence-list">
              {current.sentences.map((s, i) => (
                <div className="example-row" key={i}>
                  <div>
                    <strong>{s.english}</strong>
                    <p>{s.context}</p>
                    <button
                      className="text-button"
                      disabled={translating}
                      onClick={() => void showTranslation(s.english)}
                    >
                      Translate
                    </button>
                  </div>
                  <AudioButton text={s.english} />
                </div>
              ))}
              {translation && (
                <div className="translation-float" role="status">
                  {translation}
                  <button
                    aria-label="Close translation"
                    onClick={() => setTranslation('')}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
          {'entries' in current &&
            current.entries.map((e, i) => (
              <div className="slang-entry" key={i}>
                <div className="example-row">
                  <h3>{e.phrase}</h3>
                  <AudioButton text={e.phrase} />
                </div>
                <p>{e.meaning}</p>
                <blockquote>{e.example}</blockquote>
              </div>
            ))}
          {'words' in current &&
            current.words.map((w, i) => (
              <div className="slang-entry" key={i}>
                <div className="example-row">
                  <h3>
                    {w.word} <small>{w.partOfSpeech}</small>
                  </h3>
                  <AudioButton text={w.word} />
                </div>
                <p>{w.definition}</p>
                <blockquote>{w.example}</blockquote>
                {w.tip && <p className="notice">{w.tip}</p>}
              </div>
            ))}
        </article>
      )}
    </>
  );
}
export function PlacementTest() {
  const { content, setLevel, navigate } = useLearning();
  const [questions, setQuestions] = useState<Question[]>([]),
    [done, setDone] = useState(false),
    [score, setScore] = useState(0);
  if (!content)
    return <div className="panel">Loading placement questions…</div>;
  function start() {
    setQuestions(
      LEVELS.flatMap(([level]) =>
        shuffled(content!.tests.filter((q) => q.level === level))
          .slice(0, 3)
          .map((q) => ({ ...q, correctIndex: q.correctAnswer })),
      ),
    );
    setDone(false);
  }
  return (
    <section className="panel lesson-detail">
      <h2>Find your starting point.</h2>
      <p>
        18 questions, from A1 to C2. This short check gives a study suggestion;
        it is not an official CEFR assessment.
      </p>
      {!questions.length ? (
        <button className="primary-button" onClick={start}>
          Start level check
          <ArrowRight size={18} />
        </button>
      ) : (
        <Questions
          key={questions.map((q) => q.question).join('')}
          questions={questions}
          onDone={(s) => {
            setDone(true);
            setScore(s);
          }}
        />
      )}
      {done && (
        <div className="notice">
          <h3>
            Suggested starting level:{' '}
            {LEVELS[Math.min(5, Math.floor(score / 3))][0]}
          </h3>
          <p>
            You answered {score} of 18 correctly. You can change your level at
            any time.
          </p>
          <button
            className="primary-button"
            onClick={() => {
              setLevel(LEVELS[Math.min(5, Math.floor(score / 3))][0]);
              navigate('Settings');
            }}
          >
            Choose this study level
          </button>
        </div>
      )}
    </section>
  );
}
type CrosswordData = {
  name: string;
  clues: {
    number: number;
    answer: string;
    clueText: string;
    level: string;
    translationKa: string;
  }[];
};
export function Crossword() {
  const { content } = useLearning();
  const puzzles =
    (content as unknown as { crosswords: CrosswordData[] })?.crosswords || [];
  const [puzzle, setPuzzle] = useState(0),
    [answers, setAnswers] = useState<Record<number, string>>({}),
    [checked, setChecked] = useState(false);
  const current = puzzles[puzzle];
  if (!current) return <div className="panel">Loading puzzles…</div>;
  return (
    <section className="panel lesson-detail">
      <div className="filters">
        <h2>Word ladder</h2>
        <select
          aria-label="Crossword puzzle"
          value={puzzle}
          onChange={(e) => {
            setPuzzle(Number(e.target.value));
            setAnswers({});
            setChecked(false);
          }}
        >
          {puzzles.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name[0] + p.name.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <p>
        Use each clue to fill its row, just like the app’s word ladder puzzles.
      </p>
      <div className="crossword">
        {current.clues.map((clue, i) => (
          <label
            key={clue.number}
            className={
              checked
                ? answers[i] === clue.answer
                  ? 'solved'
                  : 'unsolved'
                : ''
            }
          >
            <span>
              {i + 1}. {clue.clueText} <small>({clue.answer.length})</small>
            </span>
            <input
              aria-label={clue.clueText}
              autoComplete="off"
              spellCheck={false}
              maxLength={clue.answer.length}
              value={answers[i] || ''}
              onChange={(e) => {
                setChecked(false);
                setAnswers((a) => ({
                  ...a,
                  [i]: e.target.value.toUpperCase().replace(/[^A-Z]/g, ''),
                }));
              }}
              style={{ width: `${clue.answer.length * 2.15}rem` }}
            />
            {checked && (
              <small>
                {answers[i] === clue.answer ? '✓ Correct' : 'Try again'}
              </small>
            )}
          </label>
        ))}
      </div>
      <button className="primary-button" onClick={() => setChecked(true)}>
        Check puzzle
      </button>
      {checked && (
        <p role="status" className="notice">
          {current.clues.filter((c, i) => answers[i] === c.answer).length} of{' '}
          {current.clues.length} words correct.
        </p>
      )}
    </section>
  );
}
