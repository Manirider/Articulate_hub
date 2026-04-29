'use client';

import { useEffect, useState } from 'react';

import { api } from '@/services/api';

export type AuthUser = {
  email: string;
  full_name: string;
  level: number;
  xp: number;
  streak_days: number;
};

// Module-level cache so the /me call is made at most once per page load
let _cachedUser: AuthUser | null = null;
let _fetchPromise: Promise<AuthUser> | null = null;

const authEventEmitter = typeof window !== 'undefined' ? new EventTarget() : null;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(_cachedUser);
  const [loading, setLoading] = useState(!_cachedUser);

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(_cachedUser);
      setLoading(false);
    };

    authEventEmitter?.addEventListener('auth_changed', handleAuthChange);

    // If we already have cached data, use it
    if (_cachedUser) {
      setUser(_cachedUser);
      setLoading(false);
      return () => authEventEmitter?.removeEventListener('auth_changed', handleAuthChange);
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('acc_token') : null;
    if (!token) {
      setLoading(false);
      return () => authEventEmitter?.removeEventListener('auth_changed', handleAuthChange);
    }

    // Reuse in-flight request if multiple components call useAuth simultaneously
    if (!_fetchPromise) {
      _fetchPromise = api.me();
    }

    _fetchPromise
      .then((data) => {
        _cachedUser = data;
        setUser(data);
        authEventEmitter?.dispatchEvent(new Event('auth_changed'));
      })
      .catch(() => {
        // Token might be expired — clear it
        _cachedUser = null;
        authEventEmitter?.dispatchEvent(new Event('auth_changed'));
      })
      .finally(() => {
        _fetchPromise = null;
        setLoading(false);
      });

    return () => authEventEmitter?.removeEventListener('auth_changed', handleAuthChange);
  }, []);

  return { user, loading, isAuthenticated: !!user };
}

/** Clear the auth cache (call on logout) */
export function clearAuthCache() {
  _cachedUser = null;
  _fetchPromise = null;
  authEventEmitter?.dispatchEvent(new Event('auth_changed'));
}
