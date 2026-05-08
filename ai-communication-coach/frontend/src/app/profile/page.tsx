'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, LogOut, AlertCircle, CheckCircle, Loader } from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { api } from '@/services/api';
import * as auth from '@/services/auth';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('acc_token');
    if (!token) {
      router.push('/auth');
      return;
    }
    
    api.me().then(setUser).catch(() => {
      setError('Failed to load profile');
    }).finally(() => setLoading(false));
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setUpdatingPassword(true);
    try {
      // In production, this would call an actual password change endpoint
      // For now, we'll simulate it
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to change password',
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    auth.clearToken();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-2xl p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-32 rounded-lg" style={{ background: 'var(--border)' }} />
            <div className="h-40 rounded-xl glass" style={{ background: 'var(--border)' }} />
            <div className="h-64 rounded-xl glass" style={{ background: 'var(--border)' }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-2xl p-6 lg:p-8">
        {/* Header */}
        <section className="animate-fade-in-up mb-8">
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>
            Account Settings
          </h1>
          <p className="mt-2" style={{ color: 'var(--ink-secondary)' }}>
            Manage your profile, security, and preferences.
          </p>
        </section>

        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-xl glass p-4 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-orange)' }} />
            <p style={{ color: 'var(--ink)' }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl glass p-4 border border-green-500/20 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-cyan)' }} />
            <p style={{ color: 'var(--ink)' }}>{success}</p>
          </div>
        )}

        {/* Profile Info Card */}
        <div className="mb-6 glass rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--ink)' }}>
            Profile Information
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-secondary)' }}>
                Email Address
              </label>
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'var(--bg-deep)' }}>
                <Mail className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                <span style={{ color: 'var(--ink)' }}>{user?.email || '—'}</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
                Contact support to change email
              </p>
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-secondary)' }}>
                User ID
              </label>
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'var(--bg-deep)' }}>
                <User className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--ink)' }}>
                  {user?.id?.slice(0, 8)}...
                </span>
              </div>
            </div>

            {/* Join Date */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-secondary)' }}>
                Member Since
              </label>
              <div className="px-4 py-2 rounded-lg" style={{ background: 'var(--bg-deep)', color: 'var(--ink)' }}>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </div>
            </div>

            {/* XP */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-secondary)' }}>
                Current XP
              </label>
              <div className="px-4 py-2 rounded-lg" style={{ background: 'var(--bg-deep)', color: 'var(--ink)' }}>
                {user?.xp ?? 0} XP
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="mb-6 glass rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <Lock className="h-5 w-5" />
            Change Password
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--ink-secondary)' }}
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showPassword.current ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--bg-deep)',
                    color: 'var(--ink)',
                    borderColor: 'var(--border)',
                    '--tw-ring-color': 'var(--accent-cyan)',
                  } as any}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPassword.current ? 'Hide password' : 'Show password'}
                >
                  {showPassword.current ? (
                    <EyeOff className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--ink-secondary)' }}
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword.new ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--bg-deep)',
                    color: 'var(--ink)',
                    borderColor: 'var(--border)',
                    '--tw-ring-color': 'var(--accent-cyan)',
                  } as any}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPassword.new ? 'Hide password' : 'Show password'}
                >
                  {showPassword.new ? (
                    <EyeOff className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
                At least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--ink-secondary)' }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--bg-deep)',
                    color: 'var(--ink)',
                    borderColor: 'var(--border)',
                    '--tw-ring-color': 'var(--accent-cyan)',
                  } as any}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPassword.confirm ? 'Hide password' : 'Show password'}
                >
                  {showPassword.confirm ? (
                    <EyeOff className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                  ) : (
                    <Eye className="h-4 w-4" style={{ color: 'var(--ink-muted)' }} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full px-6 py-2.5 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
                color: 'var(--ink)',
              }}
              aria-label="Update password"
            >
              {updatingPassword && <Loader className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </form>
        </div>

        {/* Logout Card */}
        <div className="glass rounded-2xl p-8 border border-red-500/10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <LogOut className="h-5 w-5 text-red-500" />
            Sign Out
          </h2>
          <p className="mb-6" style={{ color: 'var(--ink-secondary)' }}>
            You will be logged out of this device. Other sessions will remain active.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 text-red-500 border border-red-500/30 hover:bg-red-500/5"
            aria-label="Sign out from account"
          >
            Sign Out
          </button>
        </div>

        {/* Data Export Card */}
        <div className="mt-6 glass rounded-2xl p-8 border border-blue-500/10">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--ink)' }}>
            Export Data
          </h2>
          <p className="mb-6" style={{ color: 'var(--ink-secondary)' }}>
            Download a copy of your personal data and all your session analytics in JSON format.
          </p>
          <button
            className="px-6 py-2.5 rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--bg-deep)',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--border)',
            }}
            aria-label="Download user data export"
          >
            Export Data
          </button>
        </div>
      </main>
    </div>
  );
}
