'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Flame, Gauge, Star, Trophy, Zap } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

import { ModuleCard } from '@/components/ModuleCard';
import { Navbar } from '@/components/Navbar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { api, AnalyticsOverview, ModuleItem } from '@/services/api';

const iconMap: Record<string, string> = {
  'Group Discussion': '👥',
  Debate: '⚖️',
  Presentation: '🎤',
  JAM: '⏱️',
  Interview: '💼',
};

const levelNames: Record<number, string> = {
  1: 'Beginner', 2: 'Rising', 3: 'Intermediate',
  4: 'Advanced', 5: 'Expert', 6: 'Master', 7: 'Pro',
};

export default function DashboardPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome back');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('acc_token');
    if (!token) { router.push('/auth'); return; }

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    Promise.all([api.modules(), api.analytics()])
      .then(([moduleData, analyticsData]) => {
        setModules(moduleData);
        setAnalytics(analyticsData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const trendData = useMemo(
    () => (analytics?.score_trend || []).map((value, index) => ({
      label: `Session ${index + 1}`,
      score: Math.round(value * 10) / 10,
    })),
    [analytics]
  );

  const level = analytics?.level ?? 1;
  const levelName = levelNames[Math.min(level, 7)] || 'Legend';
  const xpProgress = ((analytics?.xp ?? 0) % 200) / 200 * 100;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        {/* Header */}
        <section className="animate-fade-in-up">
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>
            {greeting} <span className="inline-block animate-float" aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1" style={{ color: 'var(--ink-secondary)' }}>
            Track your progress and launch practice modules below.
          </p>
        </section>

        {error && (
          <div className="mt-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }} role="alert">
            {error}
          </div>
        )}

        {/* Skeleton loading state */}
        {loading && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl p-5">
                  <div className="skeleton h-4 w-24 mb-3" />
                  <div className="skeleton h-8 w-16" />
                </div>
              ))}
            </section>
            <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="glass rounded-2xl p-6"><div className="skeleton h-4 w-32 mb-4" /><div className="skeleton h-64 w-full" /></div>
              <div className="glass rounded-2xl p-6"><div className="skeleton h-4 w-20 mb-4 mx-auto" /><div className="skeleton h-32 w-32 mx-auto rounded-full" /></div>
            </section>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl p-6">
                  <div className="skeleton h-10 w-10 mb-4" /><div className="skeleton h-6 w-40 mb-2" /><div className="skeleton h-4 w-full mb-2" /><div className="skeleton h-4 w-3/4" />
                </div>
              ))}
            </section>
          </>
        )}

        {/* Stats row */}
        {!loading && (
        <>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 stagger-children" aria-label="Performance statistics">
          <StatCard icon={<Gauge className="h-4 w-4" />} label="Average Score" value={analytics?.average_score?.toFixed(1) ?? '—'} subtitle={analytics && analytics.average_score > 0 ? '/ 100' : undefined} />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Streak" value={`${analytics?.streak_days ?? 0}`} subtitle="days" trend={analytics && analytics.streak_days > 3 ? 'up' : 'neutral'} />
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Sessions" value={analytics?.sessions_completed ?? 0} />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Rank" value={`#${analytics?.leaderboard_rank_hint ?? '—'}`} subtitle="global" />
        </section>

        {/* Charts + Progress */}
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px] animate-fade-in-up" style={{ animationDelay: '0.2s' }} aria-label="Score trends and level progress">
          {/* Score Trend Chart */}
          <div className="glass rounded-2xl p-5 md:p-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Score Trend</h2>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>Your last {trendData.length} sessions</p>
            <div className="mt-4 h-64">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} aria-label="Score progression chart">
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--ink)', backdropFilter: 'blur(20px)' }} />
                    <Area dataKey="score" stroke="var(--accent-cyan)" fill="url(#scoreFill)" strokeWidth={2.5} dot={{ fill: 'var(--accent-cyan)', r: 4, strokeWidth: 0 }} activeDot={{ fill: 'var(--accent-cyan)', r: 6, strokeWidth: 2, stroke: 'var(--accent-blue)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--ink-muted)' }}>
                  Complete a session to see your score trend
                </div>
              )}
            </div>
          </div>

          {/* Level & XP Progress */}
          <div className="glass rounded-2xl p-5 md:p-6 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink-secondary)' }}>
              <Star className="h-4 w-4" style={{ color: 'var(--accent-amber)' }} aria-hidden="true" />
              Level {level}
            </div>
            <h3 className="mt-1 text-xl font-bold gradient-text">{levelName}</h3>

            <div className="mt-6" aria-label={`${xpProgress.toFixed(0)}% progress to next level`}>
              <ProgressRing value={xpProgress} label="to next level" />
            </div>

            <div className="mt-4 text-center">
              <p className="text-2xl font-bold flex items-center gap-1" style={{ color: 'var(--ink)' }}>
                <Zap className="h-5 w-5" style={{ color: 'var(--accent-amber)' }} aria-hidden="true" />
                <AnimatedCounter target={analytics?.xp ?? 0} className="" />
                <span className="text-sm font-normal" style={{ color: 'var(--ink-muted)' }}>XP</span>
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
                {Math.max(0, (level * 200) - (analytics?.xp ?? 0) % 200)} XP to Level {level + 1}
              </p>
            </div>

            {/* Badges preview */}
            <div className="mt-4 flex gap-2 flex-wrap justify-center" aria-label="Unlocked achievements">
              {analytics && analytics.sessions_completed >= 1 && (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 border border-emerald-500/20" role="img" aria-label="First Session achievement">🎯 First Session</span>
              )}
              {analytics && analytics.streak_days >= 3 && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400 border border-amber-500/20" role="img" aria-label="On Fire achievement">🔥 On Fire</span>
              )}
              {analytics && analytics.average_score >= 70 && (
                <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-400 border border-cyan-500/20" role="img" aria-label="High Scorer achievement">⭐ High Scorer</span>
              )}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }} aria-label="Practice modules">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Practice Modules</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink-muted)' }}>Choose a module to start practicing</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 stagger-children">
            {modules.map((module) => (
              <ModuleCard key={module.id} name={module.name} description={module.description} icon={iconMap[module.name] || '🧠'} />
            ))}
          </div>
        </section>
        </>
        )}
      </main>
    </div>
  );
}
