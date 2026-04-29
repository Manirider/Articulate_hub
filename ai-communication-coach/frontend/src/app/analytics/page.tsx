'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Target, TrendingUp, Zap } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

import { Navbar } from '@/components/Navbar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { api, AnalyticsOverview } from '@/services/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('acc_token');
    if (!token) { router.push('/auth'); return; }
    api.analytics().then(setAnalytics).catch(() => {});
  }, [router]);

  const trendData = (analytics?.score_trend || []).map((v, i) => ({
    session: `S${i + 1}`,
    score: Math.round(v * 10) / 10,
  }));

  // Real per-dimension breakdown from the backend
  const dimensionData = [
    { name: 'Clarity', value: Math.round(analytics?.avg_clarity ?? 0) },
    { name: 'Confidence', value: Math.round(analytics?.avg_confidence ?? 0) },
    { name: 'Content', value: Math.round(analytics?.avg_content ?? 0) },
    { name: 'Delivery', value: Math.round(analytics?.avg_delivery ?? 0) },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        <section className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-slate-100">Performance Analytics</h1>
          <p className="mt-1 text-slate-400">Deep dive into your communication metrics and progression.</p>
        </section>

        {/* Summary stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <StatCard icon={<Target className="h-4 w-4" />} label="Avg Score" value={analytics?.average_score?.toFixed(1) || '—'} />
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Sessions" value={analytics?.sessions_completed ?? 0} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Level" value={analytics?.level ?? 1} />
          <StatCard icon={<Zap className="h-4 w-4" />} label="Total XP" value={analytics?.xp ?? 0} />
        </section>

        {/* Charts */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Score trend */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Score Trend</h2>
            <div className="h-64">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                    <XAxis dataKey="session" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                    <Area dataKey="score" stroke="#06b6d4" fill="url(#trendFill)" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-600 text-sm">No data yet</div>
              )}
            </div>
          </div>

          {/* Dimension breakdown */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Skill Breakdown</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="mt-6 glass rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-lg font-bold text-slate-100 mb-4">Achievements</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: '🎯', name: 'First Session', desc: 'Complete your first practice session', unlocked: (analytics?.sessions_completed ?? 0) >= 1 },
              { icon: '🔥', name: 'On Fire', desc: 'Maintain a 3-day streak', unlocked: (analytics?.streak_days ?? 0) >= 3 },
              { icon: '⭐', name: 'High Scorer', desc: 'Achieve 70+ average score', unlocked: (analytics?.average_score ?? 0) >= 70 },
              { icon: '🏆', name: 'Veteran', desc: 'Complete 10 sessions', unlocked: (analytics?.sessions_completed ?? 0) >= 10 },
              { icon: '💎', name: 'Diamond', desc: 'Reach Level 5', unlocked: (analytics?.level ?? 1) >= 5 },
              { icon: '🚀', name: 'Rocket', desc: 'Earn 500 XP', unlocked: (analytics?.xp ?? 0) >= 500 },
              { icon: '🎤', name: 'Speaker', desc: 'Score 80+ in Clarity', unlocked: false },
              { icon: '🧠', name: 'Strategist', desc: 'Score 80+ in Content', unlocked: false },
            ].map((badge) => (
              <div
                key={badge.name}
                className={`rounded-xl p-4 border transition-all ${
                  badge.unlocked
                    ? 'bg-slate-800/40 border-cyan-500/20'
                    : 'bg-slate-900/30 border-slate-700/10 opacity-40'
                }`}
              >
                <span className="text-2xl">{badge.icon}</span>
                <h3 className="mt-2 text-sm font-bold text-slate-200">{badge.name}</h3>
                <p className="text-xs text-slate-500">{badge.desc}</p>
                {badge.unlocked && <span className="mt-2 inline-block text-xs text-cyan-400 font-medium">✓ Unlocked</span>}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
