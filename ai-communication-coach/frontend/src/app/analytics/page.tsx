'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Target, TrendingUp, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

import { Navbar } from '@/components/Navbar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { HolographicCard } from '@/components/HolographicCard';
import { api, AnalyticsOverview } from '@/services/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('acc_token');
      if (!token) {
        router.push('/auth');
        return;
      }
      const data = await api.analytics();
      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load analytics. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [router]);

  // Error state UI
  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-7xl p-6 lg:p-8">
          <div className="flex items-center justify-center py-12">
            <div className="rounded-2xl glass p-8 max-w-md text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--accent-orange)' }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
                Failed to Load Analytics
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-secondary)' }}>
                {error}
              </p>
              <button
                onClick={fetchAnalytics}
                className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
                  color: 'var(--ink)',
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-7xl p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-48 rounded-lg" style={{ background: 'var(--border)' }} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl glass" style={{ background: 'var(--border)' }} />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 rounded-xl glass" style={{ background: 'var(--border)' }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const trendData = (analytics?.score_trend || []).map((v, i) => ({
    session: `S${i + 1}`,
    score: Math.round(v * 10) / 10,
  }));

  const dimensionData = [
    { name: 'Clarity', value: Math.round(analytics?.avg_clarity ?? 0) },
    { name: 'Confidence', value: Math.round(analytics?.avg_confidence ?? 0) },
    { name: 'Content', value: Math.round(analytics?.avg_content ?? 0) },
    { name: 'Delivery', value: Math.round(analytics?.avg_delivery ?? 0) },
  ];

  const radarData = [
    { subject: 'Clarity', score: analytics?.avg_clarity ?? 0, fullMark: 100 },
    { subject: 'Confidence', score: analytics?.avg_confidence ?? 0, fullMark: 100 },
    { subject: 'Content', score: analytics?.avg_content ?? 0, fullMark: 100 },
    { subject: 'Delivery', score: analytics?.avg_delivery ?? 0, fullMark: 100 },
  ];

  const badges = [
    { icon: '🎯', name: 'First Session', desc: 'Complete your first practice session', unlocked: (analytics?.sessions_completed ?? 0) >= 1 },
    { icon: '🔥', name: 'On Fire', desc: 'Maintain a 3-day streak', unlocked: (analytics?.streak_days ?? 0) >= 3 },
    { icon: '⭐', name: 'High Scorer', desc: 'Achieve 70+ average score', unlocked: (analytics?.average_score ?? 0) >= 70 },
    { icon: '🏆', name: 'Veteran', desc: 'Complete 10 sessions', unlocked: (analytics?.sessions_completed ?? 0) >= 10 },
    { icon: '💎', name: 'Diamond', desc: 'Reach Level 5', unlocked: (analytics?.level ?? 1) >= 5 },
    { icon: '🚀', name: 'Rocket', desc: 'Earn 500 XP', unlocked: (analytics?.xp ?? 0) >= 500 },
    { icon: '🎤', name: 'Speaker', desc: 'Score 80+ in Clarity', unlocked: false },
    { icon: '🧠', name: 'Strategist', desc: 'Score 80+ in Content', unlocked: false },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        <section className="animate-fade-in-up">
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>Performance Analytics</h1>
          <p className="mt-1" style={{ color: 'var(--ink-secondary)' }}>Deep dive into your communication metrics and progression.</p>
        </section>

        {/* Summary stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <StatCard icon={<Target className="h-4 w-4" />} label="Avg Score" value={analytics?.average_score?.toFixed(1) || '—'} />
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Sessions" value={analytics?.sessions_completed ?? 0} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Level" value={analytics?.level ?? 1} />
          <StatCard icon={<Zap className="h-4 w-4" />} label="Total XP" value={analytics?.xp ?? 0} />
        </section>

        {/* Charts */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Score trend */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Score Trend</h2>
            <div className="h-64 mt-4">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                    <XAxis dataKey="session" tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--ink)' }} />
                    <Area dataKey="score" stroke="var(--accent-cyan)" fill="url(#trendFill)" strokeWidth={2.5} dot={{ fill: 'var(--accent-cyan)', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--ink-muted)' }}>No data yet</div>
              )}
            </div>
          </div>

          {/* Radar chart */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Skill Radar</h2>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--ink-secondary)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="score" stroke="var(--accent-cyan)" fill="var(--accent-cyan)" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Dimension breakdown */}
        <section className="mt-6 glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Skill Breakdown</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dimensionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--ink-secondary)', fontSize: 13 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--ink)' }} />
                <Bar dataKey="value" fill="var(--accent-violet)" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Achievements */}
        <section className="mt-6 glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Achievements</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {badges.map((badge) => (
              <HolographicCard
                key={badge.name}
                className={`rounded-xl p-4 ${badge.unlocked ? '' : 'opacity-40'}`}
                glowColor={badge.unlocked ? '0, 229, 255' : '100, 100, 100'}
              >
                <span className="text-2xl">{badge.icon}</span>
                <h3 className="mt-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>{badge.name}</h3>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{badge.desc}</p>
                {badge.unlocked && <span className="mt-2 inline-block text-xs font-medium" style={{ color: 'var(--accent-cyan)' }}>✓ Unlocked</span>}
              </HolographicCard>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
