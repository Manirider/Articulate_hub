'use client';

import Link from 'next/link';
import { useRef, type MouseEvent } from 'react';
import { ArrowRight } from 'lucide-react';

type ModuleCardProps = {
  name: string;
  description: string;
  icon: string;
  completionPercent?: number;
};

const accentColors: Record<string, { glow: string; badge: string; color: string }> = {
  'Group Discussion': { glow: '0, 229, 255', badge: 'bg-cyan-500/10 text-cyan-400', color: 'var(--accent-cyan)' },
  'Debate': { glow: '168, 85, 247', badge: 'bg-violet-500/10 text-violet-400', color: 'var(--accent-violet)' },
  'Presentation': { glow: '245, 158, 11', badge: 'bg-amber-500/10 text-amber-400', color: 'var(--accent-amber)' },
  'JAM': { glow: '16, 185, 129', badge: 'bg-emerald-500/10 text-emerald-400', color: 'var(--accent-emerald)' },
  'Interview': { glow: '244, 63, 94', badge: 'bg-rose-500/10 text-rose-400', color: 'var(--accent-rose)' },
};

export function ModuleCard({ name, description, icon, completionPercent = 0 }: ModuleCardProps) {
  const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
  const accent = accentColors[name] || accentColors['Group Discussion'];
  const cardRef = useRef<HTMLAnchorElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(${accent.glow}, 0.12) 0%, transparent 60%)`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    glow.style.background = 'transparent';
  }

  return (
    <Link
      ref={cardRef}
      href={`/modules/${slug}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group glass relative rounded-2xl p-5 md:p-6 overflow-hidden transition-all duration-300 min-w-0"
      style={{ transformStyle: 'preserve-3d', borderColor: 'var(--border)' }}
      aria-label={`${name} practice module`}
    >
      {/* Mouse-following glow */}
      <div ref={glowRef} className="absolute inset-0 z-0 pointer-events-none transition-all duration-300" />

      {/* Shimmer overlay on hover */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 animate-shimmer" />

      <div className="relative z-10" style={{ transform: 'translateZ(10px)' }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-3xl md:text-4xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110" style={{ transform: 'translateZ(20px)' }}>{icon}</span>
          <ArrowRight className="h-5 w-5 transition-all duration-300 group-hover:translate-x-1" style={{ color: 'var(--ink-muted)' }} />
        </div>
        <h3 className="mt-4 text-lg md:text-xl font-bold break-words" style={{ color: 'var(--ink)' }}>{name}</h3>
        <p className="mt-2 text-sm leading-relaxed break-words" style={{ color: 'var(--ink-secondary)' }}>{description}</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-muted)' }}>
            <span>Progress</span>
            <span>{Math.round(completionPercent)}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-card)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, completionPercent)}%`, background: `linear-gradient(90deg, rgba(${accent.glow}, 0.8), rgba(${accent.glow}, 1))` }}
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
