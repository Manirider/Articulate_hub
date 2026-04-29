'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Brain, MessageSquare, Mic, Sparkles, Target, Trophy, Video, Zap } from 'lucide-react';
import { AvatarOrb } from '@/components/AvatarOrb';
import { api } from '@/services/api';

const features = [
  { icon: <Brain className="h-5 w-5" />, title: 'Multi-Agent AI', desc: '5 specialized AI agents analyze your speech in parallel' },
  { icon: <Mic className="h-5 w-5" />, title: 'Live Speech Analysis', desc: 'Real-time transcription with instant feedback' },
  { icon: <Target className="h-5 w-5" />, title: 'Adaptive Coaching', desc: 'Personalized difficulty that grows with you' },
  { icon: <Trophy className="h-5 w-5" />, title: 'XP & Leaderboard', desc: 'Gamified progression with badges and streaks' },
  { icon: <MessageSquare className="h-5 w-5" />, title: '5 Practice Modes', desc: 'GD, Debate, Presentation, JAM, Interview' },
  { icon: <Zap className="h-5 w-5" />, title: 'Explainable Scores', desc: 'Transparent AI scoring with actionable insights' },
];

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = isSignUp
        ? await api.signup({ email, full_name: fullName, password })
        : await api.login({ email, password });

      localStorage.setItem('acc_token', response.access_token);
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_480px]">
      {/* Left panel — Product showcase */}
      <section className="relative overflow-hidden p-8 lg:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5" />

        <div className="relative z-10 max-w-xl animate-fade-in-up">
          <div className="flex items-center gap-3">
            <AvatarOrb size="sm" speaking={false} />
            <div>
              <h1 className="text-4xl font-bold text-slate-100">
                Train Your <span className="gradient-text">Communication</span>
              </h1>
            </div>
          </div>

          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            Practice Group Discussion, Debate, Presentation, JAM, and Interview rounds with an AI system that scores clarity, confidence, and delivery in real-time.
          </p>

          {/* Feature grid */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass card-hover rounded-xl p-4 flex items-start gap-3"
              >
                <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{feature.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Demo preview card */}
          <div className="glass mt-8 rounded-xl p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Video className="h-4 w-4 text-cyan-400" /> Demo Preview
            </div>
            <p className="text-sm text-slate-500">
              Experience the full AI coaching pipeline—start a session, speak into your mic,
              and receive real-time analysis with explainable score breakdowns.
            </p>
          </div>
        </div>
      </section>

      {/* Right panel — Auth form */}
      <section className="flex items-center justify-center p-8 lg:p-14 border-l border-slate-800/50">
        <div className="glass w-full max-w-sm rounded-2xl p-8" style={{ animationDelay: '0.2s' }}>
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="text-2xl font-bold text-slate-100">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {isSignUp && (
              <input
                required
                id="auth-fullname"
                placeholder="Full name"
                className="input-dark"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}

            <input
              required
              id="auth-email"
              type="email"
              placeholder="Email address"
              className="input-dark"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              required
              id="auth-password"
              type="password"
              placeholder="Password (min 8 chars)"
              className="input-dark"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              disabled={loading || !email || !password || (isSignUp && !fullName)}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              id="auth-toggle"
              onClick={() => setIsSignUp((v) => !v)}
              className="text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>

          <div className="relative mt-6 flex items-center">
            <div className="flex-1 border-t border-slate-700/50" />
            <span className="mx-3 text-xs text-slate-600 uppercase">or continue with</span>
            <div className="flex-1 border-t border-slate-700/50" />
          </div>

          <button
            id="auth-oauth"
            type="button"
            disabled
            className="btn-secondary mt-4 w-full flex items-center justify-center gap-2 text-sm opacity-50 cursor-not-allowed"
            title="Google Sign In coming soon"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Sign In
            <span className="ml-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">Soon</span>
          </button>
        </div>
      </section>
    </main>
  );
}
