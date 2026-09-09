export type Progress = {
  word_id: number;
  user_id: string;
  english_word: string;
  updated_at: number;
  created_at: number;
  times_viewed: number;
  times_correct: number;
  times_incorrect: number;
  proficiency: number;
  repetition_number: number;
  easiness_factor: number;
  interval_days: number;
  next_review_at: number;
  last_reviewed_at: number;
  last_response_time_ms: number;
  average_response_time_ms: number;
  fast_correct_count: number;
};

// Android treats English text as identity and resolves equal timestamps deterministically.
export function latestByWord(rows: Progress[]): Progress[] {
  const keys: (keyof Progress)[] = ['updated_at', 'proficiency', 'times_viewed', 'times_correct', 'times_incorrect', 'last_reviewed_at', 'next_review_at', 'repetition_number', 'interval_days', 'easiness_factor', 'last_response_time_ms', 'average_response_time_ms', 'fast_correct_count', 'created_at'];
  const latest = new Map<string, Progress>();
  for (const row of rows) {
    const word = row.english_word?.trim().toLowerCase();
    if (!word) continue;
    const previous = latest.get(word);
    if (!previous) { latest.set(word, row); continue; }
    const difference = keys.map(key => (Number(row[key]) || 0) - (Number(previous[key]) || 0)).map((n, i) => i === 1 ? -n : n).find(n => n !== 0) || 0;
    if (difference > 0) latest.set(word, row);
  }
  return [...latest.values()];
}
export function nextProgress(
  previous: Partial<Progress>,
  correct: boolean,
  responseTime: number,
  now = Date.now(),
): Partial<Progress> {
  const viewed = (previous.times_viewed || 0) + 1,
    rights = (previous.times_correct || 0) + (correct ? 1 : 0);
  const q =
    responseTime > 0
      ? correct
        ? responseTime < 3000
          ? 5
          : responseTime < 6000
            ? 4
            : 3
        : responseTime < 5000
          ? 1
          : 2
      : correct
        ? 4
        : 1;
  const ease = Math.max(
    1.3,
    (previous.easiness_factor ?? 2.5) +
      (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );
  const rep = correct ? (previous.repetition_number || 0) + 1 : 0;
  const interval = correct
    ? rep === 1
      ? 1
      : rep === 2
        ? 3
        : rep === 3
          ? 7
          : Math.round((previous.interval_days || 0) * ease)
    : 1;
  return {
    ...previous,
    times_viewed: viewed,
    times_correct: rights,
    times_incorrect: (previous.times_incorrect || 0) + (correct ? 0 : 1),
    proficiency: (rights / viewed) * 100,
    repetition_number: rep,
    easiness_factor: ease,
    interval_days: interval,
    next_review_at: now + interval * 86400000,
    last_reviewed_at: now,
    created_at: previous.created_at || now,
    updated_at: Math.max(now, (previous.updated_at || 0) + 1),
    last_response_time_ms: responseTime || previous.last_response_time_ms || 0,
    average_response_time_ms:
      responseTime > 0
        ? Math.floor(
            ((previous.average_response_time_ms || 0) * (viewed - 1) +
              responseTime) /
              (previous.average_response_time_ms ? viewed : 1),
          )
        : previous.average_response_time_ms || 0,
    fast_correct_count:
      (previous.fast_correct_count || 0) +
      (correct && responseTime > 0 && responseTime < 3000 ? 1 : 0),
  };
}

export async function readAllProgress(
  read: (query: URLSearchParams) => Promise<Progress[]>,
  email: string,
) {
  const rows: Progress[] = [];
  let after: number | undefined;
  for (;;) {
    const q = new URLSearchParams({
      select: '*',
      user_id: `eq.${email}`,
      order: 'word_id.asc',
      limit: '1000',
    });
    if (after !== undefined) q.set('word_id', `gt.${after}`);
    const page = await read(q);
    if (!Array.isArray(page)) throw Error('Invalid progress response');
    if (!page.length) return rows;
    const last = page.at(-1)!.word_id;
    if (!Number.isSafeInteger(last) || (after !== undefined && last <= after))
      throw Error('Invalid progress page');
    rows.push(...page);
    after = last;
  }
}
