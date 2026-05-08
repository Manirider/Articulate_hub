'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`glass rounded-2xl p-6 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-xl skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded skeleton-shimmer" />
          <div className="h-3 w-1/2 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-full rounded skeleton-shimmer" />
        <div className="h-3 w-5/6 rounded skeleton-shimmer" />
        <div className="h-3 w-4/6 rounded skeleton-shimmer" />
      </div>
    </motion.div>
  );
}

export function SkeletonStat({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`glass rounded-xl p-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded skeleton-shimmer" />
          <div className="h-6 w-20 rounded skeleton-shimmer" />
        </div>
      </div>
    </motion.div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`glass rounded-2xl p-6 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="h-6 w-32 rounded mb-4 skeleton-shimmer" />
      <div className="h-48 w-full rounded-xl skeleton-shimmer" />
    </motion.div>
  );
}

export function SkeletonList({ count = 5 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="glass rounded-xl p-4 flex items-center gap-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="h-12 w-12 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded skeleton-shimmer" />
            <div className="h-3 w-1/4 rounded skeleton-shimmer" />
          </div>
          <div className="h-8 w-20 rounded-lg skeleton-shimmer" />
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonModules() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} className="h-64" />
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="glass rounded-2xl p-8 space-y-6">
      <div className="flex items-center gap-6">
        <div className="h-24 w-24 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 rounded skeleton-shimmer" />
          <div className="h-4 w-32 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
