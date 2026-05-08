'use client';

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  type?: 'error' | 'offline' | 'empty';
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message = 'We encountered an error while loading this content.',
  onRetry,
  type = 'error'
}: ErrorStateProps) {
  const icons = {
    error: AlertCircle,
    offline: WifiOff,
    empty: AlertCircle
  };
  
  const colors = {
    error: 'var(--accent-rose)',
    offline: 'var(--accent-amber)',
    empty: 'var(--ink-muted)'
  };
  
  const Icon = icons[type];
  const color = colors[type];

  return (
    <motion.div
      className="glass rounded-2xl p-8 text-center max-w-md mx-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: `${color}20` }}
      >
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
      
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      
      <p className="mb-6" style={{ color: 'var(--ink-secondary)' }}>
        {message}
      </p>
      
      {onRetry && (
        <motion.button
          onClick={onRetry}
          className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl font-medium"
          style={{
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
            color: 'var(--ink)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}

export function EmptyState({ 
  title = 'No data available',
  message = 'There are no items to display at the moment.',
  icon: Icon = AlertCircle
}: { 
  title?: string; 
  message?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <motion.div
      className="glass rounded-2xl p-8 text-center max-w-md mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div 
        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'var(--ink-muted)20' }}
      >
        <Icon className="w-8 h-8" style={{ color: 'var(--ink-muted)' }} />
      </div>
      
      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      
      <p style={{ color: 'var(--ink-secondary)' }}>
        {message}
      </p>
    </motion.div>
  );
}
