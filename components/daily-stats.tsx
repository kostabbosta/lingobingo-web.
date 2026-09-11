'use client';
import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Flame, RotateCcw, Sparkles } from 'lucide-react';
import { dailyStats, streakDays } from '../lib/daily-stats';
import { useLearning } from './learning-provider';

export function DailyStats() {
  const { account, authStatus, navigate } = useLearning();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const stats = dailyStats(account?.progress || [], now ?? 0);
  const streak = streakDays(account?.progress || [], now ?? 0);
  const ready = authStatus === 'signed-in' && account && now;
  return <section className="daily-stats" aria-label="Daily statistics">
    <div className="daily-stats-title"><BarChart3 size={20} /><strong>Today</strong><span>{now ? new Date(now).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span></div>
    {ready && streak > 0 && <div className="streak-badge"><Flame size={18} /><strong>{streak}</strong><span>Day streak</span></div>}
    <div><BookOpen size={18} /><strong>{ready ? stats.practiced : '—'}</strong><span>Words practiced</span></div>
    <div><Sparkles size={18} /><strong>{ready ? stats.newWords : '—'}</strong><span>New words</span></div>
    <button onClick={() => navigate(ready ? 'Due Words' : 'Sign In')}><RotateCcw size={18} /><strong>{ready ? stats.due : '—'}</strong><span>Due for review</span></button>
    <button className="text-button" onClick={() => navigate(authStatus === 'signed-out' ? 'Sign In' : 'My Progress')}>{authStatus === 'signed-out' ? 'Sign in to see stats' : 'View progress →'}</button>
  </section>;
}
