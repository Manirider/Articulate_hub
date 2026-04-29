'use client';

type ScoreCardProps = {
  label: string;
  value: number;
  icon?: string;
  color?: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose';
};

const colorMap = {
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', bar: 'from-cyan-500 to-cyan-400' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', bar: 'from-violet-500 to-violet-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'from-emerald-500 to-emerald-400' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', bar: 'from-rose-500 to-rose-400' },
};

export function ScoreCard({ label, value, icon, color = 'cyan' }: ScoreCardProps) {
  const c = colorMap[color];
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-100">{clamped.toFixed(1)}</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/40">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-1000`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
