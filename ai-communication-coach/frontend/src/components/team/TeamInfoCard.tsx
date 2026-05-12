'use client';

import { motion } from 'framer-motion';
import { Crown, Crown as CrownIcon, Check, Link as LinkIcon } from 'lucide-react';
import { TeamResponse } from '@/services/api';
import { TiltCard } from '@/components/TiltCard';

type TeamInfoCardProps = {
  activeTeam: TeamResponse;
  isManager: boolean;
  copyCode: (code: string) => void;
  copied: boolean;
};

export function TeamInfoCard({ activeTeam, isManager, copyCode, copied }: TeamInfoCardProps) {
  return (
    <TiltCard tiltAmount={3}>
      <div className="glass-ultra rounded-3xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <CrownIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{activeTeam.name}</h2>
              {activeTeam.description && <p className="text-sm text-white/50 mt-1">{activeTeam.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/40">{activeTeam.members.length} members</span>
                {isManager && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Manager
                  </span>
                )}
              </div>
            </div>
          </div>
          {isManager && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-black/30 border border-white/10">
              <span className="text-xs uppercase tracking-wider text-white/50">Invite Code:</span>
              <span className="font-mono font-bold tracking-widest text-lg text-cyan-400">{activeTeam.invite_code}</span>
              <motion.button
                onClick={() => copyCode(activeTeam.invite_code)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Copy code"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <LinkIcon className="h-4 w-4 text-white/50" />}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </TiltCard>
  );
}
