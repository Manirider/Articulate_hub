'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Home, LogOut, Mic, Moon, Sun, Trophy, Users, Zap } from 'lucide-react';
import { useAuth, clearAuthCache } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { disconnectSocket } from '@/services/socket';
import { clearToken } from '@/services/auth';
import { HealthIndicator } from '@/components/HealthIndicator';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard#modules', label: 'Modules', icon: Zap },
  { href: '/room', label: 'Rooms', icon: Users },
  { href: '/team', label: 'Teams', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function Navbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  function handleLogout() {
    clearAuthCache();
    disconnectSocket();
    clearToken();
    window.location.href = '/auth';
  }

  function isActive(href: string) {
    if (href.includes('#')) return pathname === href.split('#')[0];
    return pathname === href;
  }

  return (
    <nav
      className="sticky top-0 z-50 border-b transition-all duration-300"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        borderColor: 'var(--border)',
      }}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group" aria-label="AI Communication Coach home">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-cyan-500/25">
            <Mic className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
            <span className="gradient-text">AI</span> Coach
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-1 md:flex" role="menubar">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200"
              style={{
                color: isActive(href) ? 'var(--accent-cyan)' : 'var(--ink-secondary)',
              }}
              aria-current={isActive(href) ? 'page' : undefined}
              role="menuitem"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              {isActive(href) && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: 'var(--accent-cyan)' }}
                  aria-hidden="true"
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2" role="toolbar" aria-label="User controls">
          {/* Health indicator */}
          <HealthIndicator />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 hover:scale-110"
            style={{ background: 'var(--bg-card)', color: 'var(--ink-secondary)' }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>

          {/* User stats pill */}
          {user && (
            <div
              className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm md:flex"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              aria-label={`Level ${user.level}, ${user.xp} XP, ${user.streak_days} day streak`}
            >
              <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>Lv.{user.level}</span>
              <span style={{ color: 'var(--ink-muted)' }} aria-hidden="true">·</span>
              <span style={{ color: 'var(--accent-amber)' }}>{user.xp} XP</span>
              <span style={{ color: 'var(--ink-muted)' }} aria-hidden="true">·</span>
              <span style={{ color: 'var(--accent-rose)' }} aria-label="Streak">🔥{user.streak_days}</span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:scale-105"
            style={{ color: 'var(--ink-secondary)' }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* XP progress bar at bottom of navbar */}
      {user && (
        <div 
          className="h-0.5 w-full" 
          style={{ background: 'var(--border)' }}
          role="progressbar"
          aria-valuenow={Math.min(100, ((user.xp % 200) / 200) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="XP progress to next level"
        >
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${Math.min(100, ((user.xp % 200) / 200) * 100)}%`,
              background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))',
            }}
          />
        </div>
      )}
    </nav>
  );
}
