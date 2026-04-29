'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Medal, Trophy } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

type LeaderboardEntry = {
  rank: number;
  name: string;
  xp: number;
  level: number;
  sessions: number;
};

// Simulated leaderboard data (in production this comes from the backend)
const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Communication Pro', xp: 2450, level: 7, sessions: 34 },
  { rank: 2, name: 'Debate Master', xp: 1980, level: 6, sessions: 28 },
  { rank: 3, name: 'Speech Leader', xp: 1650, level: 5, sessions: 22 },
  { rank: 4, name: 'Presentation Ace', xp: 1320, level: 4, sessions: 18 },
  { rank: 5, name: 'Rising Speaker', xp: 1100, level: 4, sessions: 15 },
  { rank: 6, name: 'JAM Champion', xp: 890, level: 3, sessions: 12 },
  { rank: 7, name: 'Eloquent Voice', xp: 720, level: 3, sessions: 10 },
  { rank: 8, name: 'Wordsmith', xp: 540, level: 2, sessions: 8 },
  { rank: 9, name: 'Learner', xp: 320, level: 2, sessions: 5 },
  { rank: 10, name: 'Newcomer', xp: 150, level: 1, sessions: 2 },
];

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="h-5 w-5 text-amber-400" />,
  2: <Medal className="h-5 w-5 text-slate-300" />,
  3: <Medal className="h-5 w-5 text-amber-600" />,
};

const rankColors: Record<number, string> = {
  1: 'bg-amber-500/5 border-amber-500/20',
  2: 'bg-slate-500/5 border-slate-400/20',
  3: 'bg-amber-700/5 border-amber-700/20',
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [data] = useState<LeaderboardEntry[]>(mockLeaderboard);

  useEffect(() => {
    const token = localStorage.getItem('acc_token');
    if (!token) router.push('/auth');
  }, [router]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl p-6 lg:p-8">
        <section className="animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-amber-400" />
            <h1 className="text-3xl font-bold text-slate-100">Leaderboard</h1>
          </div>
          <p className="mt-1 text-slate-400">Top communicators ranked by XP and session performance.</p>
        </section>

        {/* Top 3 podium */}
        <section className="mt-8 grid grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {data.slice(0, 3).map((entry) => (
            <div
              key={entry.rank}
              className={`glass rounded-2xl p-5 text-center border ${rankColors[entry.rank] || ''} ${
                entry.rank === 1 ? 'sm:-mt-4' : ''
              }`}
            >
              <div className="flex justify-center mb-2">{rankIcons[entry.rank]}</div>
              <div className="text-2xl font-bold text-slate-100">#{entry.rank}</div>
              <p className="mt-1 text-sm font-semibold text-slate-300 truncate">{entry.name}</p>
              <p className="text-xs text-amber-400 font-medium mt-1">{entry.xp} XP</p>
              <p className="text-xs text-slate-500">Lv.{entry.level} · {entry.sessions} sessions</p>
            </div>
          ))}
        </section>

        {/* Full list */}
        <section className="mt-6 glass rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="grid grid-cols-[60px_1fr_90px_80px_90px] gap-2 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700/20">
            <span>Rank</span>
            <span>User</span>
            <span className="text-right">XP</span>
            <span className="text-right">Level</span>
            <span className="text-right">Sessions</span>
          </div>
          {data.map((entry) => (
            <div
              key={entry.rank}
              className={`grid grid-cols-[60px_1fr_90px_80px_90px] gap-2 px-5 py-3.5 items-center border-b border-slate-800/30 transition hover:bg-slate-800/20 ${
                entry.rank <= 3 ? 'bg-slate-800/10' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                {rankIcons[entry.rank] || <span className="text-sm text-slate-500 font-mono w-5 text-center">{entry.rank}</span>}
              </span>
              <span className="text-sm font-medium text-slate-200 truncate">{entry.name}</span>
              <span className="text-sm text-amber-400 text-right font-semibold">{entry.xp}</span>
              <span className="text-sm text-slate-400 text-right">Lv.{entry.level}</span>
              <span className="text-sm text-slate-500 text-right">{entry.sessions}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
