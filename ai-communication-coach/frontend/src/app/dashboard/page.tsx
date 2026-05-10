'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { 
  BarChart3, Flame, Gauge, Star, Trophy, Zap, 
  TrendingUp, Activity, Target, Award, Clock,
  ArrowUpRight, Sparkles, Play, ChevronRight,
  Brain, Mic2, Video, Users, Crown, Medal,
  Bolt, Target as TargetIcon
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

import { TiltCard } from '@/components/TiltCard';
import { ModuleCard } from '@/components/ModuleCard';
import { Navbar } from '@/components/Navbar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { api, AnalyticsOverview, ModuleItem } from '@/services/api';

const ThreeScene = dynamic(() => import('@/components/ThreeScene').then(mod => mod.ThreeScene), { ssr: false });

const moduleIcons: Record<string, any> = {
  'Group Discussion': Users,
  Debate: Target,
  Presentation: Mic2,
  JAM: Clock,
  Interview: Crown,
};

const moduleColors: Record<string, string> = {
  'Group Discussion': 'from-cyan-500 to-blue-500',
  Debate: 'from-violet-500 to-purple-500',
  Presentation: 'from-amber-500 to-orange-500',
  JAM: 'from-emerald-500 to-teal-500',
  Interview: 'from-rose-500 to-pink-500',
};

const levelData: Record<number, { name: string; color: string; icon: any }> = {
  1: { name: 'Novice', color: 'from-gray-400 to-gray-500', icon: Star },
  2: { name: 'Learner', color: 'from-cyan-500 to-blue-500', icon: Zap },
  3: { name: 'Practitioner', color: 'from-emerald-500 to-teal-500', icon: Activity },
  4: { name: 'Advanced', color: 'from-violet-500 to-purple-500', icon: Target },
  5: { name: 'Expert', color: 'from-amber-500 to-orange-500', icon: Award },
  6: { name: 'Master', color: 'from-rose-500 to-pink-500', icon: Trophy },
  7: { name: 'Legend', color: 'from-yellow-400 to-amber-500', icon: Crown },
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
  const levelName = levelData[Math.min(level, 7)]?.name || 'Legend';
  const xpProgress = ((analytics?.xp ?? 0) % 200) / 200 * 100;

  return (
    <div className="min-h-screen bg-[#050810] relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[150px] animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[150px] animate-float-slow" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-[200px]" />
      </div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 z-[1] opacity-20 pointer-events-none grid-bg" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8">
        {/* Greeting Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <motion.h1 
                className="text-4xl md:text-5xl font-bold text-white mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {greeting},{` `}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  Communicator
                </span>
              </motion.h1>
              <motion.p 
                className="text-white/50 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Ready to level up your communication skills today?
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full glass-ultra border border-white/10"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/70">AI Systems Online</span>
            </motion.div>
          </div>
        </motion.section>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl p-4 text-sm bg-red-500/10 border border-red-500/20 text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Skeleton Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-ultra rounded-2xl p-6 border border-white/10">
                    <div className="loading-shimmer h-4 w-24 mb-4 rounded" />
                    <div className="loading-shimmer h-10 w-16 rounded" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Content */}
        {!loading && analytics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Stats Grid - Floating Cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { 
                  icon: Gauge, 
                  label: 'Average Score', 
                  value: analytics.average_score?.toFixed(1) ?? '0.0', 
                  suffix: '/100',
                  trend: '+12%',
                  color: 'from-cyan-500 to-blue-500',
                  glow: 'cyan'
                },
                { 
                  icon: Flame, 
                  label: 'Current Streak', 
                  value: `${analytics.streak_days ?? 0}`, 
                  suffix: 'days',
                  trend: 'Best: 14',
                  color: 'from-amber-500 to-orange-500',
                  glow: 'amber'
                },
                { 
                  icon: Activity, 
                  label: 'Total Sessions', 
                  value: `${analytics.sessions_completed ?? 0}`, 
                  suffix: '',
                  trend: '+3 this week',
                  color: 'from-emerald-500 to-teal-500',
                  glow: 'emerald'
                },
                { 
                  icon: Trophy, 
                  label: 'Global Rank', 
                  value: `#${analytics.leaderboard_rank_hint ?? '---'}`, 
                  suffix: '',
                  trend: 'Top 10%',
                  color: 'from-violet-500 to-purple-500',
                  glow: 'violet'
                },
              ].map((stat, index) => (
                <TiltCard key={stat.label} tiltAmount={8}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className={`glass-ultra rounded-2xl p-6 border border-white/10 hover:border-${stat.glow}-500/30 transition-all duration-500`}>
                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />
                      
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                            <stat.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-xs text-emerald-400 font-medium">{stat.trend}</span>
                        </div>
                        <p className="text-white/50 text-sm mb-1">{stat.label}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-white">
                            <AnimatedCounter target={parseFloat(stat.value.replace(/[^0-9.]/g, '')) || 0} />
                          </span>
                          <span className="text-white/50 text-sm">{stat.suffix}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </TiltCard>
              ))}
            </section>

            {/* Charts & Level Progress */}
            <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Score Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-ultra rounded-3xl p-6 border border-white/10"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-cyan-400" />
                      Performance Trend
                    </h2>
                    <p className="text-white/50 text-sm mt-1">Your communication journey over time</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs">Last 7 sessions</span>
                  </div>
                </div>
                
                <div className="h-72">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="scoreStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#00e5ff" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(10,15,30,0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '12px',
                            backdropFilter: 'blur(20px)'
                          }}
                          itemStyle={{ color: '#00e5ff' }}
                        />
                        <Area 
                          dataKey="score" 
                          stroke="url(#scoreStroke)" 
                          strokeWidth={3}
                          fill="url(#scoreGradient)" 
                          dot={{ fill: '#00e5ff', r: 5, strokeWidth: 0 }} 
                          activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                          <TargetIcon className="w-8 h-8 text-white/30" />
                        </div>
                        <p className="text-white/40 text-sm">Complete your first session to see trends</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Level & Progress Panel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-ultra rounded-3xl p-6 border border-white/10 flex flex-col"
              >
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4"
                  >
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Level {level}</span>
                  </motion.div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    {levelData[level]?.name || 'Legend'}
                  </h3>
                </div>

                {/* Progress Ring */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative">
                    <ProgressRing value={xpProgress} size={180} strokeWidth={12} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-white">{Math.round(xpProgress)}%</span>
                      <span className="text-xs text-white/50">to next level</span>
                    </div>
                  </div>
                </div>

                {/* XP Stats */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <span className="text-white/70">Total XP</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      <AnimatedCounter target={analytics.xp ?? 0} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">
                      {Math.max(0, (level * 200) - (analytics.xp ?? 0) % 200)} XP to Level {level + 1}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* Badges */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {analytics.sessions_completed >= 1 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5"
                    >
                      <Medal className="w-3 h-3" /> First Session
                    </motion.span>
                  )}
                  {analytics.streak_days >= 3 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-1.5"
                    >
                      <Flame className="w-3 h-3" /> On Fire
                    </motion.span>
                  )}
                  {analytics.average_score >= 70 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs flex items-center gap-1.5"
                    >
                      <Star className="w-3 h-3" /> High Scorer
                    </motion.span>
                  )}
                </div>
              </motion.div>
            </section>

            {/* Practice Modules */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Brain className="w-6 h-6 text-violet-400" />
                    Practice Modules
                  </h2>
                  <p className="text-white/50 mt-1">Choose a module to begin your training session</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">AI Recommendation</span>
                </motion.button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {modules.map((module, index) => {
                  const Icon = moduleIcons[module.name] || Brain;
                  const colorClass = moduleColors[module.name] || 'from-cyan-500 to-blue-500';
                  
                  return (
                    <TiltCard key={module.id} tiltAmount={10}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        whileHover={{ y: -5 }}
                        className="group relative cursor-pointer"
                        onClick={() => router.push(`/modules/${module.name.toLowerCase().replace(' ', '-')}`)}
                      >
                        <div className="glass-ultra rounded-2xl p-6 border border-white/10 hover:border-cyan-500/30 transition-all duration-500 h-full">
                          {/* Glow background */}
                          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />
                          
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} p-3 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{module.name}</h3>
                            <p className="text-white/50 text-sm mb-4 line-clamp-2">{module.description}</p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/40">5 submodules</span>
                              <motion.div
                                whileHover={{ x: 3 }}
                                className="flex items-center gap-1 text-cyan-400 text-sm font-medium"
                              >
                                Start <ChevronRight className="w-4 h-4" />
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </TiltCard>
                  );
                })}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Start Random Session', icon: Bolt, color: 'from-yellow-400 to-amber-500', action: () => {} },
                { label: 'View Analytics', icon: BarChart3, color: 'from-cyan-400 to-blue-500', action: () => router.push('/analytics') },
                { label: 'Join Team Room', icon: Users, color: 'from-violet-400 to-purple-500', action: () => router.push('/room') },
                { label: 'Leaderboard', icon: Trophy, color: 'from-rose-400 to-pink-500', action: () => router.push('/leaderboard') },
              ].map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.action}
                  className="group glass-ultra rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 flex items-center gap-3"
                >
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium text-sm">{action.label}</span>
                  <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-cyan-400 ml-auto transition-colors" />
                </motion.button>
              ))}
            </section>
          </motion.div>
        )}
      </main>
    </div>
  );
}
