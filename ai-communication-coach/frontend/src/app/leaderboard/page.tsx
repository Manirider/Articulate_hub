'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Medal, Trophy, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { HolographicCard } from '@/components/HolographicCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { api } from '@/services/api';

type LeaderboardEntry = {
  rank: number;
  name: string;
  xp: number;
  level: number;
  sessions: number;
};

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="h-5 w-5" style={{ color: 'var(--accent-amber)' }} />,
  2: <Medal className="h-5 w-5" style={{ color: 'var(--ink-secondary)' }} />,
  3: <Medal className="h-5 w-5" style={{ color: '#b45309' }} />,
};

const podiumGlows: Record<number, string> = {
  1: '245, 158, 11',
  2: '148, 163, 184',
  3: '180, 83, 9',
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('acc_token');
    if (!token) { router.push('/auth'); return; }

    api.getLeaderboard()
      .then((res) => setData(res.leaderboard))
      .catch((err) => console.error('Failed to load leaderboard', err))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl p-6 lg:p-8">
        <section className="animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7" style={{ color: 'var(--accent-amber)' }} />
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>Leaderboard</h1>
          </div>
          <p className="mt-1" style={{ color: 'var(--ink-secondary)' }}>Top communicators ranked by XP and session performance.</p>
        </section>

        {loading ? (
          <div className="mt-20 flex flex-col items-center justify-center animate-fade-in-up" style={{ color: 'var(--ink-muted)' }}>
            <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: 'var(--accent-amber)' }} />
            <p>Loading the latest rankings...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center animate-fade-in-up" style={{ color: 'var(--ink-muted)' }}>
            <p>No communicators found yet. Be the first!</p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            <section className="mt-8 grid grid-cols-3 gap-3 stagger-children">
              {data.slice(0, 3).map((entry) => (
                <HolographicCard
                  key={entry.rank}
                  className={`rounded-2xl p-5 text-center ${entry.rank === 1 ? 'sm:-mt-4' : ''}`}
                  glowColor={podiumGlows[entry.rank] || '148, 163, 184'}
                >
                  <div className="flex justify-center mb-2">{rankIcons[entry.rank]}</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>#{entry.rank}</div>
                  <p className="mt-1 text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{entry.name}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--accent-amber)' }}>
                    <AnimatedCounter target={entry.xp} /> XP
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Lv.{entry.level} · {entry.sessions} sessions</p>
                </HolographicCard>
              ))}
            </section>

            {/* Full list */}
            <section className="mt-6 glass rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div
                className="grid grid-cols-[60px_1fr_90px_80px_90px] gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ink-muted)', borderBottom: '1px solid var(--border)' }}
              >
                <span>Rank</span><span>User</span>
                <span className="text-right">XP</span><span className="text-right">Level</span>
                <span className="text-right">Sessions</span>
              </div>
              {data.map((entry, idx) => (
                <div
                  key={entry.rank}
                  className="grid grid-cols-[60px_1fr_90px_80px_90px] gap-2 px-5 py-3.5 items-center transition-all duration-200 animate-fade-in-up"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: entry.rank <= 3 ? 'var(--bg-card)' : 'transparent',
                    animationDelay: `${idx * 0.03}s`,
                  }}
                >
                  <span className="flex items-center gap-2">
                    {rankIcons[entry.rank] || <span className="text-sm font-mono w-5 text-center" style={{ color: 'var(--ink-muted)' }}>{entry.rank}</span>}
                  </span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{entry.name}</span>
                  <span className="text-sm text-right font-semibold" style={{ color: 'var(--accent-amber)' }}>{entry.xp}</span>
                  <span className="text-sm text-right" style={{ color: 'var(--ink-secondary)' }}>Lv.{entry.level}</span>
                  <span className="text-sm text-right" style={{ color: 'var(--ink-muted)' }}>{entry.sessions}</span>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
