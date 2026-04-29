'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type ModuleCardProps = {
  name: string;
  description: string;
  icon: string;
  completionPercent?: number;
};

const accentColors: Record<string, { border: string; glow: string; badge: string }> = {
  'Group Discussion': { border: 'border-cyan-500/20', glow: 'shadow-glow', badge: 'bg-cyan-500/10 text-cyan-400' },
  'Debate': { border: 'border-violet-500/20', glow: 'shadow-glow-violet', badge: 'bg-violet-500/10 text-violet-400' },
  'Presentation': { border: 'border-amber-500/20', glow: 'shadow-glow-amber', badge: 'bg-amber-500/10 text-amber-400' },
  'JAM': { border: 'border-emerald-500/20', glow: 'shadow-glow', badge: 'bg-emerald-500/10 text-emerald-400' },
  'Interview': { border: 'border-rose-500/20', glow: 'shadow-glow', badge: 'bg-rose-500/10 text-rose-400' },
};

export function ModuleCard({ name, description, icon, completionPercent = 0 }: ModuleCardProps) {
  const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
  const accent = accentColors[name] || accentColors['Group Discussion'];

  return (
    <Link
      href={`/modules/${slug}`}
      className={`group glass card-hover relative rounded-2xl p-6 ${accent.border} overflow-hidden`}
    >
      {/* Shimmer overlay on hover */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 animate-shimmer" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-4xl drop-shadow-lg">{icon}</span>
          <ArrowRight className="h-5 w-5 text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-400" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-slate-100">{name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span>{Math.round(completionPercent)}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700"
              style={{ width: `${Math.min(100, completionPercent)}%` }}
            />
          </div>
        </div>

        {/* Submodule badges */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {['Demo', 'Practice', 'AI', 'Friends'].map((mode) => (
            <span
              key={mode}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${accent.badge}`}
            >
              {mode}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
