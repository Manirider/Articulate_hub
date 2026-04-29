'use client';

type WaveformVisualizerProps = {
  active?: boolean;
  barCount?: number;
};

export function WaveformVisualizer({ active = false, barCount = 7 }: WaveformVisualizerProps) {
  return (
    <div className="flex items-end justify-center gap-1 h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="wave-bar"
          style={{
            height: active ? undefined : '4px',
            animationPlayState: active ? 'running' : 'paused',
            opacity: active ? 1 : 0.3,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}
