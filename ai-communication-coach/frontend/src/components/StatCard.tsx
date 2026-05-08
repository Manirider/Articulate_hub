'use client';

import { type ReactNode } from 'react';
import { AnimatedCounter } from './AnimatedCounter';

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function StatCard({ icon, label, value, subtitle, trend }: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'var(--accent-emerald)' : trend === 'down' ? 'var(--accent-rose)' : 'var(--ink-muted)';

  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const isNumeric = !isNaN(numericValue);

  return (
    <div className="holo-card card-hover rounded-2xl p-4 md:p-5 min-w-0">
      <div className="flex items-center gap-2" style={{ color: 'var(--ink-secondary)' }}>
        {icon}
        <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider break-words">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 min-w-0">
        {isNumeric ? (
          <span className="text-2xl md:text-3xl font-bold leading-none" style={{ color: 'var(--ink)' }}>
            <AnimatedCounter
              target={numericValue}
              decimals={String(value).includes('.') ? 1 : 0}
            />
          </span>
        ) : (
          <span className="text-2xl md:text-3xl font-bold leading-none" style={{ color: 'var(--ink)' }}>{value}</span>
        )}
        {subtitle && <span className="text-xs md:text-sm font-medium" style={{ color: trendColor }}>{subtitle}</span>}
      </div>
    </div>
  );
}
