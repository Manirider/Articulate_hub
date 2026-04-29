'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Lightbulb, Mic, Sparkles, Zap } from 'lucide-react';
import { AvatarOrb } from '@/components/AvatarOrb';
import { Navbar } from '@/components/Navbar';
import { api } from '@/services/api';

// Known module names that require special casing
const SPECIAL_CASE_NAMES: Record<string, string> = { jam: 'JAM' };

function fromSlug(slug: string): string {
  const decoded = decodeURIComponent(slug);
  const lower = decoded.toLowerCase().replace(/-/g, ' ').trim();
  if (SPECIAL_CASE_NAMES[lower]) return SPECIAL_CASE_NAMES[lower];
  return lower
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const topicSuggestions: Record<string, string[]> = {
  'Group Discussion': [
    'Should AI replace human teachers in education?',
    'Impact of social media on mental health',
    'Is remote work the future of employment?',
    'Climate change: individual vs corporate responsibility',
  ],
  Debate: [
    'Technology is making us more isolated',
    'Universal Basic Income should be implemented globally',
    'Privacy vs security in the digital age',
    'Space exploration is more important than ocean exploration',
  ],
  Presentation: [
    'The future of AI in healthcare',
    'How to build an effective leadership pipeline',
    'Sustainable business practices in 2025',
    'The evolution of customer experience',
  ],
  JAM: [
    'The color blue',
    'If I could time travel',
    'The importance of failure',
    'My favorite invention',
  ],
  Interview: [
    'Tell me about a time you handled conflict at work',
    'Describe your greatest professional achievement',
    'How do you handle tight deadlines and pressure?',
    'Where do you see yourself in 5 years?',
  ],
};

export default function ModuleSubmodulePage() {
  const params = useParams<{ module: string; submodule: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const moduleName = useMemo(() => fromSlug(params.module), [params.module]);
  const submoduleName = useMemo(() => fromSlug(params.submodule), [params.submodule]);
  const suggestions = topicSuggestions[moduleName] || topicSuggestions['Group Discussion'];

  async function startSession() {
    const sessionTopic = topic.trim() || suggestions[0];
    setLoading(true);
    setError('');
    try {
      const session = await api.createSession({
        module_name: moduleName,
        submodule_name: submoduleName,
        topic: sessionTopic,
      });
      router.push(
        `/session/${session.id}?module=${encodeURIComponent(moduleName)}&submodule=${encodeURIComponent(submoduleName)}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-3xl p-6 lg:p-8">
        <button
          onClick={() => router.push(`/modules/${params.module}`)}
          className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {moduleName}
        </button>

        <section className="glass rounded-2xl p-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h1 className="text-2xl font-bold text-slate-100">{moduleName} · {submoduleName}</h1>
          </div>
          <p className="text-slate-400">
            Briefing → Live Practice → AI Analysis → Personalized Feedback → Score Update
          </p>

          {/* Session flow visualization */}
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-600 overflow-x-auto">
            {['🎯 Briefing', '🎙 Practice', '🧠 Analysis', '📊 Feedback', '📈 Progress'].map((step, i) => (
              <span key={step} className="flex items-center gap-1.5 whitespace-nowrap">
                {i > 0 && <span className="text-slate-700">→</span>}
                <span className="rounded-full bg-slate-800/60 px-3 py-1.5 border border-slate-700/30">{step}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Topic selection */}
        <section className="glass rounded-2xl p-8 mt-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">Session Topic</h2>
          </div>

          <textarea
            id="session-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter your topic or select a suggestion below..."
            rows={3}
            className="input-dark resize-none"
          />

          {/* Topic suggestions */}
          <div className="mt-4">
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setTopic(suggestion)}
                  className={`rounded-xl px-3 py-2 text-xs transition-all duration-200 ${
                    topic === suggestion
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800/40 text-slate-500 border border-slate-700/20 hover:border-slate-600/30 hover:text-slate-400'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Launch button */}
        <section className="glass rounded-2xl p-8 mt-6 flex flex-col items-center text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <AvatarOrb size="md" emotion="thinking" />
          <p className="mt-4 text-sm text-slate-400 max-w-md">
            Your AI coach will analyze your speech for clarity, confidence, content quality, and delivery in real-time.
          </p>

          <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Mic className="h-3 w-3" /> Microphone required</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> AI analysis enabled</span>
          </div>

          <button
            id="start-session-btn"
            onClick={startSession}
            disabled={loading}
            className="btn-primary mt-6 flex items-center gap-2 text-base"
          >
            {loading ? (
              <span className="animate-pulse">Creating session...</span>
            ) : (
              <>
                <Mic className="h-5 w-5" /> Start Practice Session
              </>
            )}
          </button>
        </section>
      </main>
    </div>
  );
}
