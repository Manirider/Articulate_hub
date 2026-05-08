'use client';

import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Wifi, WifiOff, Activity } from 'lucide-react';

export function HealthIndicator() {
  const { status, latency, isHealthy, isDegraded } = useHealthCheck(30000);

  const getIcon = () => {
    if (isHealthy) return <Wifi className="h-4 w-4" style={{ color: 'var(--accent-emerald)' }} />;
    if (isDegraded) return <Activity className="h-4 w-4" style={{ color: 'var(--accent-amber)' }} />;
    return <WifiOff className="h-4 w-4" style={{ color: 'var(--accent-rose)' }} />;
  };

  const getStatusColor = () => {
    if (isHealthy) return 'var(--accent-emerald)';
    if (isDegraded) return 'var(--accent-amber)';
    return 'var(--accent-rose)';
  };

  const getLabel = () => {
    if (status === 'checking') return 'Checking...';
    if (isHealthy) return `${latency}ms`;
    if (isDegraded) return 'Slow';
    return 'Offline';
  };

  return (
    <div 
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
      style={{ 
        background: 'rgba(0,0,0,0.2)',
        color: getStatusColor(),
      }}
      title={`API Status: ${status}${latency ? ` (${latency}ms)` : ''}`}
    >
      {getIcon()}
      <span className="hidden sm:inline">{getLabel()}</span>
    </div>
  );
}
