'use client';

import { useEffect, useState, useCallback } from 'react';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'checking';

interface HealthState {
  status: HealthStatus;
  latency: number;
  lastChecked: Date | null;
  error: string | null;
}

export function useHealthCheck(intervalMs = 30000) {
  const [health, setHealth] = useState<HealthState>({
    status: 'checking',
    latency: 0,
    lastChecked: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    const start = performance.now();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${apiBase}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
      });
      
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - start);

      if (response.ok) {
        setHealth({
          status: latency < 500 ? 'healthy' : latency < 2000 ? 'degraded' : 'unhealthy',
          latency,
          lastChecked: new Date(),
          error: null,
        });
      } else {
        setHealth(prev => ({
          ...prev,
          status: 'unhealthy',
          latency,
          lastChecked: new Date(),
          error: `HTTP ${response.status}`,
        }));
      }
    } catch (err) {
      setHealth(prev => ({
        ...prev,
        status: 'unhealthy',
        latency: Math.round(performance.now() - start),
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Network error',
      }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up interval
    const intervalId = setInterval(checkHealth, intervalMs);

    // Check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkHealth, intervalMs]);

  return {
    ...health,
    checkNow: checkHealth,
    isHealthy: health.status === 'healthy',
    isDegraded: health.status === 'degraded',
    isUnhealthy: health.status === 'unhealthy',
  };
}
