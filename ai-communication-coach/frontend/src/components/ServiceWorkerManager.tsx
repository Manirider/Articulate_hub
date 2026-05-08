'use client';

import { useEffect, useState } from 'react';

const SW_PATH = '/sw.js';

export function ServiceWorkerManager() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(SW_PATH).catch(() => {
        // Silent fallback: app continues to work without SW support.
      });
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,42rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl"
      style={{
        background: 'rgba(15, 15, 30, 0.92)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        color: 'var(--ink)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_0_6px_rgba(245,158,11,0.12)]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">You are offline</p>
          <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
            Core pages remain available, and your session will reconnect automatically when the network returns.
          </p>
        </div>
      </div>
    </div>
  );
}
