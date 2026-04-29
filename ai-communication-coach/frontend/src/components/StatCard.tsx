'use client';

import { type ReactNode } from 'react';

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function StatCard({ icon, label, value, subtitle, trend }: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-500';

  return (
    <div className="glass card-hover rounded-2xl p-5">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-100">{value}</span>
        {subtitle && <span className={`text-sm font-medium ${trendColor}`}>{subtitle}</span>}
      </div>
    </div>
  );
}
