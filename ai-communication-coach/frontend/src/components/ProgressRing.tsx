'use client';

import { useEffect, useState } from 'react';

type ProgressRingProps = {
  value: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
};

export function ProgressRing({ value, label, size = 120, strokeWidth = 8 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const target = circumference - (clamped / 100) * circumference;
    const timer = setTimeout(() => setAnimatedOffset(target), 100);
    return () => clearTimeout(timer);
  }, [clamped, circumference]);

  const getColor = (v: number) => {
    if (v >= 80) return { stroke: 'var(--accent-cyan)', glow: 'var(--glow-cyan)' };
    if (v >= 60) return { stroke: 'var(--accent-violet)', glow: 'var(--glow-violet)' };
    if (v >= 40) return { stroke: 'var(--accent-amber)', glow: 'rgba(245,158,11,0.3)' };
    return { stroke: 'var(--accent-rose)', glow: 'rgba(244,63,94,0.3)' };
  };

  const colors = getColor(clamped);

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{Math.round(clamped)}%</span>
        {label && <span className="mt-0.5 text-xs" style={{ color: 'var(--ink-muted)' }}>{label}</span>}
      </div>
    </div>
  );
}
