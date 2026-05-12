'use client';

import { motion } from 'framer-motion';
import { Target, Zap, Activity, Eye } from 'lucide-react';
import { TeamAnalytics } from '@/services/api';
import { TiltCard } from '@/components/TiltCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';

type TeamStatsGridProps = {
  analytics: TeamAnalytics;
};

export function TeamStatsGrid({ analytics }: TeamStatsGridProps) {
  const stats = [
    { label: 'Team Clarity', value: analytics.average_clarity, icon: Target, color: 'cyan' },
    { label: 'Team Confidence', value: analytics.average_confidence, icon: Zap, color: 'violet' },
    { label: 'Team Pacing', value: analytics.average_pacing, icon: Activity, color: 'amber' },
    { label: 'Team Vision', value: analytics.average_vision, icon: Eye, color: 'emerald' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <TiltCard key={stat.label} tiltAmount={5}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-ultra rounded-2xl p-5 border border-white/10 hover:border-cyan-500/30 transition-all"
          >
            <div className={`p-2 rounded-lg bg-${stat.color}-500/10 border border-${stat.color}-500/20 w-fit mb-3`}>
              <stat.icon className={`h-4 w-4 text-${stat.color}-400`} />
            </div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400`}>
              <AnimatedCounter target={stat.value} decimals={1} />
            </p>
          </motion.div>
        </TiltCard>
      ))}
    </div>
  );
}
