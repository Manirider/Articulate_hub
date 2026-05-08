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

const emotionColors: Record<string, { grad: string; core: string; ring: string }> = {
  idle: { grad: 'from-cyan-400 to-violet-500', core: '139, 92, 246', ring: 'rgba(139,92,246,0.3)' },
  thinking: { grad: 'from-amber-400 to-orange-500', core: '245, 158, 11', ring: 'rgba(245,158,11,0.3)' },
  speaking: { grad: 'from-cyan-400 to-emerald-400', core: '0, 229, 255', ring: 'rgba(0,229,255,0.3)' },
  listening: { grad: 'from-violet-400 to-pink-500', core: '168, 85, 247', ring: 'rgba(168,85,247,0.3)' },
  celebrating: { grad: 'from-amber-400 to-rose-500', core: '244, 63, 94', ring: 'rgba(244,63,94,0.3)' },
};

export function AvatarOrb({ speaking = false, size = 'md', emotion = 'idle' }: AvatarOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const { container, text } = sizeMap[size];
  const colors = speaking ? emotionColors.speaking : emotionColors[emotion];

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

      // Draw neural synapses (connecting dots)
      const neuronCount = speaking ? 12 : 6;
      const neurons: { x: number; y: number }[] = [];
      for (let n = 0; n < neuronCount; n++) {
        const angle = (n / neuronCount) * Math.PI * 2 + phase * 0.3;
        const r = baseRadius * (0.5 + Math.sin(phase + n) * 0.2);
        const nx = cx + Math.cos(angle) * r;
        const ny = cy + Math.sin(angle) * r;
        neurons.push({ x: nx, y: ny });

        // Draw neuron dot
        ctx.beginPath();
        ctx.arc(nx, ny, speaking ? 2 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colors.core}, ${0.4 + Math.sin(phase + n) * 0.2})`;
        ctx.fill();
      }

      // Draw synapse connections
      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          const dx = neurons[i].x - neurons[j].x;
          const dy = neurons[i].y - neurons[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < baseRadius * 1.2) {
            ctx.beginPath();
            ctx.moveTo(neurons[i].x, neurons[i].y);
            ctx.lineTo(neurons[j].x, neurons[j].y);
            ctx.strokeStyle = `rgba(${colors.core}, ${0.1 * (1 - dist / (baseRadius * 1.2))})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw layered rings
      const ringCount = speaking ? 6 : 3;
      for (let i = ringCount; i >= 0; i--) {
        const t = phase + i * 0.8;
        const amplitude = speaking ? 6 + i * 3 : 2 + i * 1;
        const radius = baseRadius + Math.sin(t) * amplitude + i * 7;

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

        const alpha = 0.06 + (ringCount - i) * 0.03;
        ctx.fillStyle = `rgba(${colors.core}, ${alpha})`;
        ctx.fill();
      }

      // Core orb with 3D depth illusion
      const coreGrad = ctx.createRadialGradient(cx - baseRadius * 0.15, cy - baseRadius * 0.15, 0, cx, cy, baseRadius * 0.8);
      coreGrad.addColorStop(0, `rgba(${colors.core}, 0.35)`);
      coreGrad.addColorStop(0.5, `rgba(${colors.core}, 0.12)`);
      coreGrad.addColorStop(1, `rgba(${colors.core}, 0)`);

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Inner highlight (3D sphere illusion)
      const hlGrad = ctx.createRadialGradient(cx - baseRadius * 0.2, cy - baseRadius * 0.25, 0, cx, cy, baseRadius * 0.4);
      hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = hlGrad;
      ctx.fill();

      phase += speaking ? 0.06 : 0.02;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [speaking, size, colors.core]);

  return (
    <div className={`relative ${container} animate-float`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ borderRadius: '50%' }}
      />
      <div
        className="relative flex h-full w-full items-center justify-center rounded-full shadow-lg backdrop-blur-sm"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <span className={`${text} font-bold uppercase tracking-widest bg-gradient-to-r ${colors.grad} bg-clip-text text-transparent`}>
          AI
        </span>
      </div>
      {speaking && (
        <>
          <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ border: `1px solid ${colors.ring}` }} />
          <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ border: `1px solid ${colors.ring}`, animationDelay: '0.4s' }} />
          <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ border: `1px solid ${colors.ring}`, animationDelay: '0.8s' }} />
        </>
      )}
    </div>
  );
}
