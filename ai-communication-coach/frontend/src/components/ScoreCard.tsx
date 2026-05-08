'use client';

import { AnimatedCounter } from './AnimatedCounter';

type ScoreCardProps = {
  label: string;
  value: number;
  icon?: string;
  color?: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose';
};

const colorMap = {
  cyan: { accent: 'var(--accent-cyan)', glow: 'var(--glow-cyan)' },
  violet: { accent: 'var(--accent-violet)', glow: 'var(--glow-violet)' },
  amber: { accent: 'var(--accent-amber)', glow: 'rgba(245,158,11,0.15)' },
  emerald: { accent: 'var(--accent-emerald)', glow: 'rgba(16,185,129,0.15)' },
  rose: { accent: 'var(--accent-rose)', glow: 'rgba(244,63,94,0.15)' },
};

export function ScoreCard({ label, value, icon, color = 'cyan' }: ScoreCardProps) {
  const c = colorMap[color];
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: c.accent }}>{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>
        <AnimatedCounter target={clamped} decimals={1} />
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-card)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${clamped}%`, background: c.accent, boxShadow: `0 0 8px ${c.glow}` }}
        />
      </div>
    </div>
  );
}
