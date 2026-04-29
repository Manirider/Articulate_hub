'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Home, LogOut, Mic, Trophy, Zap } from 'lucide-react';
import { useAuth, clearAuthCache } from '@/hooks/useAuth';

export function Navbar() {
  const { user } = useAuth();
  const router = useRouter();

  function handleLogout() {
    clearAuthCache();
    localStorage.removeItem('acc_token');
    window.location.href = '/auth';
  }

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-700/30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-100">
            <span className="gradient-text">AI</span> Coach
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/dashboard#modules" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200">
            <Zap className="h-4 w-4" /> Modules
          </Link>
          <Link href="/analytics" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200">
            <BarChart3 className="h-4 w-4" /> Analytics
          </Link>
          <Link href="/leaderboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1.5 text-sm md:flex">
              <span className="text-cyan-400 font-semibold">Lv.{user.level}</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400">{user.xp} XP</span>
              <span className="text-slate-500">·</span>
              <span className="text-rose-400">🔥{user.streak_days}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
