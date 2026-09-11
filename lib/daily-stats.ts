import type { Progress } from './progress';

// Consecutive days ending today, or ending yesterday while today is still
// open: a learner who has not practised yet this morning has not lost the run.
export function streakDays(rows: Progress[], now = Date.now()) {
  const dayStart = (time: number) => { const d = new Date(time); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const practised = new Set<number>();
  for (const row of rows) if (row.last_reviewed_at) practised.add(dayStart(row.last_reviewed_at));
  const today = dayStart(now);
  const day = 86400000;
  let cursor = practised.has(today) ? today : today - day;
  if (!practised.has(cursor)) return 0;
  let days = 0;
  while (practised.has(cursor)) { days++; cursor -= day; }
  return days;
}
export function dailyStats(rows: Progress[], now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const today = (time: number) => time >= start.getTime() && time < end.getTime();
  return {
    practiced: rows.filter(row => today(row.last_reviewed_at)).length,
    newWords: rows.filter(row => today(row.created_at)).length,
    due: rows.filter(row => !row.next_review_at || row.next_review_at <= now).length,
  };
}
