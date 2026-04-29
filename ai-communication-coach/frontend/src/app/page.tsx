'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarOrb } from '@/components/AvatarOrb';

export default function SplashPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          router.replace('/auth');
          return 100;
        }
        return p + 5; // Faster for testing
      });
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <section className="relative z-10 flex w-[90%] max-w-2xl flex-col items-center text-center animate-fade-in-up">
        <AvatarOrb size="xl" speaking emotion="speaking" />

        <h1 className="mt-10 text-5xl font-bold leading-tight">
          <span className="gradient-text">AI Communication</span>
          <br />
          <span className="text-slate-100">Coach</span>
        </h1>

        <p className="mt-4 max-w-lg text-lg text-slate-400 leading-relaxed">
          Your personal AI-powered training environment for mastering communication skills with realtime feedback, adaptive coaching, and gamified progression.
        </p>

        {/* Progress bar */}
        <div className="mt-10 w-64">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-600 tracking-wide uppercase">
            Initializing AI systems...
          </p>
        </div>

        {/* Features chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {['Speech Analysis', 'Real-Time Feedback', 'Multi-Agent AI', 'Gamification'].map((feature) => (
            <span key={feature} className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-400 border border-slate-700/30">
              {feature}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
