'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';

type HolographicCardProps = {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
};

export function HolographicCard({
  children,
  className = '',
  glowColor = '6, 182, 212',
  intensity = 12,
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(${glowColor}, 0.15) 0%, transparent 60%)`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;

    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    glow.style.background = 'transparent';
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`holo-card relative overflow-hidden transition-transform duration-300 ease-out ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div ref={glowRef} className="absolute inset-0 z-0 pointer-events-none transition-all duration-300" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
