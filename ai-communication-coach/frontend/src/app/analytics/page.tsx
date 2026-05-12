'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Target, TrendingUp, Zap, AlertCircle, RefreshCw,
  Activity, Award, Brain, Flame, Crown, Star, Trophy,
  TrendingUp as TrendingUpIcon, PieChart, ChevronRight
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

import Navbar from '@/components/Navbar';
import { TiltCard } from '@/components/TiltCard';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedCounter } from '@/components/AnimatedCounter';
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
      <div className="min-h-screen bg-[#050810] relative overflow-hidden">
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none grid-bg" />
        <Navbar />
        <main className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8">
          <div className="flex items-center justify-center py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-ultra rounded-3xl p-8 max-w-md text-center border border-white/10"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Failed to Load Analytics</h2>
              <p className="text-sm mb-6 text-white/60">{error}</p>
              <motion.button
                onClick={fetchAnalytics}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </motion.button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] relative overflow-hidden">
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none grid-bg" />
        <Navbar />
        <main className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-48 rounded-lg bg-white/10" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-2xl glass-ultra border border-white/5 bg-white/5" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 rounded-2xl glass-ultra border border-white/5 bg-white/5" />
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
    { icon: Target, name: 'First Session', desc: 'Complete your first practice', unlocked: (analytics?.sessions_completed ?? 0) >= 1, color: 'cyan' },
    { icon: Flame, name: 'On Fire', desc: '3-day streak maintained', unlocked: (analytics?.streak_days ?? 0) >= 3, color: 'amber' },
    { icon: Star, name: 'High Scorer', desc: '70+ average score', unlocked: (analytics?.average_score ?? 0) >= 70, color: 'yellow' },
    { icon: Trophy, name: 'Veteran', desc: 'Complete 10 sessions', unlocked: (analytics?.sessions_completed ?? 0) >= 10, color: 'violet' },
    { icon: Crown, name: 'Diamond', desc: 'Reach Level 5', unlocked: (analytics?.level ?? 1) >= 5, color: 'blue' },
    { icon: Zap, name: 'Rocket', desc: 'Earn 500 XP', unlocked: (analytics?.xp ?? 0) >= 500, color: 'emerald' },
    { icon: Activity, name: 'Speaker', desc: '80+ Clarity score', unlocked: (analytics?.avg_clarity ?? 0) >= 80, color: 'rose' },
    { icon: Brain, name: 'Strategist', desc: '80+ Content score', unlocked: (analytics?.avg_content ?? 0) >= 80, color: 'purple' },
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalBadges = badges.length;

  return (
    <div className="min-h-screen bg-[#050810] relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[150px] animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[150px] animate-float-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/3 blur-[200px]" />
      </div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 z-[1] opacity-10 pointer-events-none grid-bg" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-cyan-400" />
                Performance Analytics
              </h1>
              <p className="text-white/50 text-lg">Deep dive into your communication metrics</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchAnalytics}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl glass-ultra border border-white/10 text-white/70 hover:text-white transition"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </motion.button>
          </div>
        </motion.section>

        {/* Summary Stats with TiltCards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[
            { icon: Target, label: 'Avg Score', value: analytics?.average_score?.toFixed(1) || '0.0', suffix: '/100', color: 'cyan' },
            { icon: Activity, label: 'Sessions', value: analytics?.sessions_completed ?? 0, suffix: '', color: 'violet' },
            { icon: TrendingUp, label: 'Current Level', value: analytics?.level ?? 1, suffix: '', color: 'amber' },
            { icon: Zap, label: 'Total XP', value: analytics?.xp ?? 0, suffix: '', color: 'emerald' },
          ].map((stat, index) => (
            <TiltCard key={stat.label} tiltAmount={8}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-ultra rounded-2xl p-6 border border-white/10 hover:border-cyan-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-400`} />
                  </div>
                </div>
                <p className="text-white/50 text-sm mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">
                    <AnimatedCounter target={parseFloat(stat.value.toString()) || 0} />
                  </span>
                  <span className="text-white/40 text-sm">{stat.suffix}</span>
                </div>
              </motion.div>
            </TiltCard>
          ))}
        </section>

        {/* Charts Section */}
        <section className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Score Trend with Gradient */}
          <TiltCard tiltAmount={3}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-ultra rounded-3xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Score Trend</h2>
                </div>
                <span className="text-xs text-white/40">Last 7 sessions</span>
              </div>
              <div className="h-64">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#00e5ff" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="session" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'rgba(10,15,30,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#00e5ff' }} />
                      <Area dataKey="score" stroke="url(#trendStroke)" strokeWidth={3} fill="url(#trendGradient)" dot={{ fill: '#00e5ff', r: 5, strokeWidth: 0 }} activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-8 w-8 text-white/20 mx-auto mb-2" />
                      <p className="text-sm text-white/40">Complete sessions to see your trend</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </TiltCard>

          {/* Radar Chart */}
          <TiltCard tiltAmount={3}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-ultra rounded-3xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-violet-400" />
                  <h2 className="text-lg font-bold text-white">Skill Radar</h2>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="score" stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.2} strokeWidth={2.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </TiltCard>
        </section>

        {/* Skill Breakdown */}
        <TiltCard tiltAmount={2}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-ultra rounded-3xl p-6 border border-white/10 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Skill Breakdown</h2>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: 'rgba(10,15,30,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#a855f7' }} />
                  <Bar dataKey="value" fill="url(#scoreBarGradient)" radius={[0, 6, 6, 0]} barSize={24} />
                  <defs>
                    <linearGradient id="scoreBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#00e5ff" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </TiltCard>

        {/* Achievements */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Achievements</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/50">Unlocked:</span>
              <span className="text-cyan-400 font-semibold">{unlockedCount}/{totalBadges}</span>
              <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedCount / totalBadges) * 100}%` }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge, index) => (
              <TiltCard key={badge.name} tiltAmount={5}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                  whileHover={{ y: -5 }}
                  className={`glass-ultra rounded-2xl p-5 border transition-all cursor-default ${
                    badge.unlocked ? 'border-white/10 hover:border-cyan-500/30' : 'border-white/5 opacity-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    badge.unlocked
                      ? `bg-gradient-to-br from-${badge.color}-500 to-${badge.color}-600`
                      : 'bg-white/5'
                  }`}>
                    <badge.icon className={`h-6 w-6 ${badge.unlocked ? 'text-white' : 'text-white/30'}`} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{badge.name}</h3>
                  <p className="text-xs text-white/50 mb-3">{badge.desc}</p>
                  {badge.unlocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400">
                      <Star className="h-3 w-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">Locked</span>
                  )}
                </motion.div>
              </TiltCard>
            ))}
          </div>
        </motion.section>
      </main>

      {/* HUD Corners */}
      <div className="fixed inset-0 z-[5] pointer-events-none">
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />
      </div>
    </div>
  );
}
