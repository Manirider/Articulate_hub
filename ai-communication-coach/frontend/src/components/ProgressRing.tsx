'use client';

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
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  // Dynamic color based on score
  const getColor = (v: number) => {
    if (v >= 80) return { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' };
    if (v >= 60) return { stroke: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.3)' };
    if (v >= 40) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' };
    return { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' };
  };

  const colors = getColor(clamped);

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-100">{Math.round(clamped)}%</span>
        {label && <span className="mt-0.5 text-xs text-slate-500">{label}</span>}
      </div>
    </div>
  );
}
