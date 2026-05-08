'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AvatarOrb } from '@/components/AvatarOrb';

const ThreeScene = dynamic(() => import('@/components/ThreeScene').then(mod => mod.ThreeScene), { ssr: false });
import { ArrowRight, Sparkles } from 'lucide-react';

export default function SplashPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showButton, setShowButton] = useState(false);
  const tagline = 'Train Like a Leader. Speak Like a Pro.';
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  // Fade-in content after mount
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!showContent) return;
    let i = 0;
    typingRef.current = setInterval(() => {
      i++;
      setTypedText(tagline.slice(0, i));
      if (i >= tagline.length) {
        clearInterval(typingRef.current!);
      }
    }, 45);
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [showContent]);

  // Progress bar + auto-redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          router.replace('/auth');
          return 100;
        }
        return p + 2;
      });
    }, 100);

    // Show button after 2s
    const btnTimer = setTimeout(() => setShowButton(true), 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(btnTimer);
    };
  }, [router]);

  function handleEnter() {
    router.replace('/auth');
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Three.js 3D background */}
      <div className="absolute inset-0 z-0">
        <ThreeScene variant="brain" interactive />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 z-[1]">
        <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-cyan-500/8 blur-[120px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/8 blur-[120px] animate-float-slow" style={{ animationDelay: '3s' }} />
      </div>

      <section
        className={`relative z-10 flex w-[90%] max-w-2xl flex-col items-center text-center transition-all duration-1000 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Avatar */}
        <div className="relative">
          <AvatarOrb size="xl" speaking emotion="speaking" />
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 blur-2xl animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="mt-10 text-5xl md:text-6xl font-extrabold leading-tight">
          <span className="gradient-text glow-text">AI Communication</span>
          <br />
          <span style={{ color: 'var(--ink)' }}>Coach</span>
        </h1>

        {/* Typewriter tagline */}
        <p className="mt-4 text-lg md:text-xl font-medium" style={{ color: 'var(--ink-secondary)' }}>
          {typedText}
          <span className="inline-block w-0.5 h-5 ml-1 bg-current animate-pulse" />
        </p>

        {/* Progress bar */}
        <div className="mt-10 w-72">
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-card)' }}>
            <div
              className="h-full rounded-full transition-all duration-200 animate-aurora"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-violet), var(--accent-cyan))',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
          <p className="mt-3 text-xs tracking-wide uppercase" style={{ color: 'var(--ink-muted)' }}>
            {progress < 100 ? 'Initializing AI systems...' : 'Ready'}
          </p>
        </div>

        {/* Enter Button */}
        {showButton && (
          <button
            onClick={handleEnter}
            className="btn-primary mt-8 flex items-center gap-2 text-base animate-fade-in-up"
          >
            <Sparkles className="h-5 w-5" />
            Enter Platform
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Feature chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 stagger-children">
          {['Speech Analysis', 'Real-Time Feedback', 'Multi-Agent AI', 'Gamification', '3D Immersive'].map((feature) => (
            <span
              key={feature}
              className="rounded-full px-3 py-1 text-xs border"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                color: 'var(--ink-muted)',
              }}
            >
              {feature}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
