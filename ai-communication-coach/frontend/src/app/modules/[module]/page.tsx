'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot, Eye, Play, Users } from 'lucide-react';
import { AvatarOrb } from '@/components/AvatarOrb';
import { HolographicCard } from '@/components/HolographicCard';
import { Navbar } from '@/components/Navbar';

const SPECIAL_CASE_NAMES: Record<string, string> = { jam: 'JAM' };

function fromSlug(slug: string): string {
  const decoded = decodeURIComponent(slug);
  const lower = decoded.toLowerCase().replace(/-/g, ' ').trim();
  if (SPECIAL_CASE_NAMES[lower]) return SPECIAL_CASE_NAMES[lower];
  return lower.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const moduleDescriptions: Record<string, string> = {
  'Group Discussion': 'Practice group discussions with AI participants. Learn to contribute meaningfully, manage turn-taking, and build on others\' points.',
  'Debate': 'Sharpen your argumentation skills. The AI will present counterpoints and evaluate logical consistency, evidence usage, and rebuttal quality.',
  'Presentation': 'Deliver presentations and receive feedback on structure, pacing, clarity, audience engagement, and visual storytelling.',
  'JAM': 'Just A Minute — speak on a random topic for 60 seconds without hesitation, repetition, or deviation. The ultimate fluency challenge.',
  'Interview': 'Simulate interview scenarios. Practice behavioral, technical, and situational questions with AI-powered evaluation.',
};

const submodules = [
  { name: 'Demo Mode', slug: 'demo-mode', icon: <Play className="h-6 w-6" />, description: 'Watch AI-generated examples and learn optimal techniques before practicing.', glow: '0, 229, 255', color: 'from-cyan-500 to-cyan-400' },
  { name: 'Personal Practice', slug: 'personal-practice', icon: <Eye className="h-6 w-6" />, description: 'Solo mode with full AI analysis. Practice at your own pace with detailed feedback.', glow: '168, 85, 247', color: 'from-violet-500 to-violet-400' },
  { name: 'AI Mode', slug: 'ai-mode', icon: <Bot className="h-6 w-6" />, description: 'Interactive sessions with AI avatars. Real-time conversation and coaching.', glow: '16, 185, 129', color: 'from-emerald-500 to-emerald-400' },
  { name: 'Friends Mode', slug: 'friends-mode', icon: <Users className="h-6 w-6" />, description: 'Multi-user sessions with AI observer. Practice with friends and get comparative analysis.', glow: '245, 158, 11', color: 'from-amber-500 to-amber-400' },
];

const iconMap: Record<string, string> = { 'Group Discussion': '👥', Debate: '⚖️', Presentation: '🎤', JAM: '⏱️', Interview: '💼' };

export default function ModuleDetailPage() {
  const params = useParams<{ module: string }>();
  const router = useRouter();
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);

  const moduleName = useMemo(() => fromSlug(params.module), [params.module]);
  const moduleIcon = iconMap[moduleName] || '🧠';
  const moduleDesc = moduleDescriptions[moduleName] || 'Practice this module with AI coaching.';

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl p-6 lg:p-8">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm transition mb-6" style={{ color: 'var(--ink-muted)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        {/* Module header */}
        <section className="glass rounded-2xl p-8 animate-fade-in-up">
          <div className="flex items-start gap-4">
            <span className="text-5xl">{moduleIcon}</span>
            <div>
              <h1 className="text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>{moduleName}</h1>
              <p className="mt-2 leading-relaxed max-w-2xl" style={{ color: 'var(--ink-secondary)' }}>{moduleDesc}</p>
            </div>
          </div>
        </section>

        {/* Submodule selector */}
        <section className="mt-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Choose Practice Mode</h2>
          <div className="grid gap-4 sm:grid-cols-2 stagger-children">
            {submodules.map((sub) => (
              <HolographicCard key={sub.slug} className="rounded-2xl" glowColor={sub.glow}>
                <button
                  onClick={() => sub.slug === 'friends-mode' ? router.push('/room') : router.push(`/modules/${params.module}/${sub.slug}`)}
                  onMouseEnter={() => setHoveredMode(sub.slug)}
                  onMouseLeave={() => setHoveredMode(null)}
                  className="p-6 text-left w-full"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl bg-gradient-to-br ${sub.color} p-3 text-white`}>{sub.icon}</div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{sub.name}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>{sub.description}</p>
                </button>
              </HolographicCard>
            ))}
          </div>
        </section>

        {/* AI Avatar preview */}
        <section className="mt-8 glass rounded-2xl p-8 flex flex-col items-center text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <AvatarOrb size="lg" speaking={!!hoveredMode} emotion={hoveredMode ? 'thinking' : 'idle'} />
          <p className="mt-4 text-sm max-w-md" style={{ color: 'var(--ink-secondary)' }}>
            {hoveredMode ? 'Ready to coach you! Select a mode to begin your practice session.' : 'Your AI coach is standing by. Hover over a practice mode to activate.'}
          </p>
        </section>
      </main>
    </div>
  );
}
