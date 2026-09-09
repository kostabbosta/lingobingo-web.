import type { Progress } from './progress';

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
