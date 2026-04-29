'use client';

import { useEffect, useRef } from 'react';

type AvatarOrbProps = {
  speaking?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  emotion?: 'idle' | 'thinking' | 'speaking' | 'listening' | 'celebrating';
};

const sizeMap = {
  sm: { container: 'h-16 w-16', text: 'text-xs' },
  md: { container: 'h-24 w-24', text: 'text-sm' },
  lg: { container: 'h-36 w-36', text: 'text-base' },
  xl: { container: 'h-48 w-48', text: 'text-lg' },
};

const emotionColors: Record<string, string> = {
  idle: 'from-cyan-400 to-violet-500',
  thinking: 'from-amber-400 to-orange-500',
  speaking: 'from-cyan-400 to-emerald-400',
  listening: 'from-violet-400 to-pink-500',
  celebrating: 'from-amber-400 to-rose-500',
};

export function AvatarOrb({ speaking = false, size = 'md', emotion = 'idle' }: AvatarOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const { container, text } = sizeMap[size];
  const gradientClass = speaking ? emotionColors.speaking : emotionColors[emotion];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;

    function draw() {
      if (!ctx || !canvas) return;
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.32;

      // Draw layered rings
      const ringCount = speaking ? 4 : 2;
      for (let i = ringCount; i >= 0; i--) {
        const t = phase + i * 0.8;
        const amplitude = speaking ? 6 + i * 3 : 2 + i * 1;
        const radius = baseRadius + Math.sin(t) * amplitude + i * 8;

        ctx.beginPath();
        for (let angle = 0; angle < Math.PI * 2; angle += 0.02) {
          const wobble = Math.sin(angle * 3 + t) * (amplitude * 0.5) + Math.sin(angle * 5 + t * 1.3) * (amplitude * 0.3);
          const r = radius + wobble;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (angle === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const alpha = 0.08 + (ringCount - i) * 0.04;
        ctx.fillStyle = speaking
          ? `rgba(6, 182, 212, ${alpha})`
          : `rgba(139, 92, 246, ${alpha})`;
        ctx.fill();
      }

      // Core orb
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.8);
      if (speaking) {
        coreGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        coreGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.15)');
        coreGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      } else {
        coreGrad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
        coreGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.1)');
        coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      }

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      phase += speaking ? 0.06 : 0.02;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [speaking, size]);

  return (
    <div className={`relative ${container} animate-float`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ borderRadius: '50%' }}
      />
      <div
        className={`relative flex h-full w-full items-center justify-center rounded-full border border-slate-600/30 bg-slate-900/50 shadow-lg backdrop-blur-sm`}
      >
        <span className={`${text} font-bold uppercase tracking-widest bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
          AI
        </span>
      </div>
      {speaking && (
        <>
          <span className="absolute inset-0 rounded-full border border-cyan-400/40 animate-pulseRing" />
          <span className="absolute inset-0 rounded-full border border-cyan-400/20 animate-pulseRing" style={{ animationDelay: '0.4s' }} />
        </>
      )}
    </div>
  );
}
