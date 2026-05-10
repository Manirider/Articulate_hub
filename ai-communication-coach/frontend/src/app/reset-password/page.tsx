'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Shield, Sparkles, X
} from 'lucide-react';
import { api } from '@/services/api';

/* ── helpers ── */
const passRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function passStrength(p: string) {
  const score = passRules.filter(r => r.test(p)).length;
  if (score <= 1) return { label: 'Very Weak', color: '#f43f5e', pct: 20 };
  if (score === 2) return { label: 'Weak', color: '#f59e0b', pct: 40 };
  if (score === 3) return { label: 'Fair', color: '#eab308', pct: 60 };
  if (score === 4) return { label: 'Strong', color: '#10b981', pct: 80 };
  return { label: 'Very Strong', color: '#00e5ff', pct: 100 };
}

/* ── main component ── */
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const strength = password.length > 0 ? passStrength(password) : null;
  const passMismatch = confirmPass.length > 0 && confirmPass !== password;
  const isValid = password && confirmPass && password === confirmPass && passRules.every(r => r.test(password));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    if (!isValid) return;

    setLoading(true);
    try {
      await api.resetPassword({ token, new_password: password });
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth');
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <motion.div
          className="glass w-full max-w-md rounded-3xl p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <Check className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-white">Password Reset Successful!</h1>
          <p className="mb-6 text-white/70">
            Your password has been reset successfully. You will be redirected to the login page in a few seconds.
          </p>
          <motion.button
            onClick={() => router.push('/auth')}
            className="btn-primary w-full flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Go to Login <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo */}
      <motion.div
        className="mb-8 flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/30">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-white">
          <span className="gradient-text">AI</span> Coach
        </span>
      </motion.div>

      {/* Card */}
      <motion.div
        className="glass w-full max-w-md rounded-3xl p-8"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Heading */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Reset Password 🔐</h1>
          <p className="mt-1 text-sm text-white/60">
            Create a new password for your account
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
          >
            <X className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, strong password"
                className="input-dark w-full pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-3.5 transition hover:opacity-70"
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4 text-white/40" />
                ) : (
                  <Eye className="h-4 w-4 text-white/40" />
                )}
              </button>
            </div>

            {/* Strength meter */}
            {password.length > 0 && strength && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Strength</span>
                  <span className="font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${strength.pct}%` }}
                    style={{ background: strength.color }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {passRules.map((r) => (
                    <div key={r.label} className="flex items-center gap-1.5 text-xs">
                      <div
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors duration-300 ${
                          r.test(password)
                            ? 'border border-emerald-500 bg-emerald-500/20'
                            : 'border border-white/20 bg-white/5'
                        }`}
                      >
                        {r.test(password) && <Check className="h-2 w-2 text-emerald-400" />}
                      </div>
                      <span className={r.test(password) ? 'text-white/70' : 'text-white/40'}>
                        {r.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/60">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Re-enter password"
                className={`input-dark w-full pl-10 pr-10 ${
                  passMismatch ? 'border-red-500' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-3.5 transition hover:opacity-70"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4 text-white/40" />
                ) : (
                  <Eye className="h-4 w-4 text-white/40" />
                )}
              </button>
            </div>
            {passMismatch && (
              <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
            )}
            {!passMismatch && confirmPass && confirmPass === password && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
                <Check className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading || !isValid}
            className="btn-primary mt-4 w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Reset Password
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </form>

        {/* Back to login */}
        <p className="mt-6 text-center text-sm text-white/60">
          Remember your password?{' '}
          <button
            onClick={() => router.push('/auth')}
            className="font-semibold text-cyan-400 transition hover:opacity-80"
          >
            Sign In
          </button>
        </p>
      </motion.div>
    </div>
  );
}

/* ── page with suspense ── */
export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-orb bg-orb-cyan absolute -top-32 -left-32 h-96 w-96" />
        <div className="bg-orb bg-orb-violet absolute -bottom-32 -right-32 h-96 w-96" style={{ animationDelay: '3s' }} />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
