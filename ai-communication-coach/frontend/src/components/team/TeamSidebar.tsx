'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { TeamResponse } from '@/services/api';

type TeamSidebarProps = {
  teams: TeamResponse[];
  activeTeamId: string | null;
  setActiveTeamId: (id: string) => void;
};

export function TeamSidebar({ teams, activeTeamId, setActiveTeamId }: TeamSidebarProps) {
  return (
    <aside className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 px-2">Your Teams</h3>
      {teams.map((t, index) => (
        <motion.button
          key={t.id}
          onClick={() => setActiveTeamId(t.id)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ x: 2 }}
          className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
            activeTeamId === t.id
              ? 'bg-violet-500/10 border-violet-500/30'
              : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTeamId === t.id ? 'bg-violet-500/20' : 'bg-white/10'
            }`}>
              <Users className={`h-4 w-4 ${activeTeamId === t.id ? 'text-violet-400' : 'text-white/50'}`} />
            </div>
            <div>
              <div className={`font-bold text-sm truncate ${activeTeamId === t.id ? 'text-violet-400' : 'text-white'}`}>
                {t.name}
              </div>
              <div className="text-xs text-white/40">{t.members.length} member{t.members.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </motion.button>
      ))}
    </aside>
  );
}
