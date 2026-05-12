'use client';

import { motion } from 'framer-motion';
import { User, Users } from 'lucide-react';
import { TeamResponse, TeamAnalytics } from '@/services/api';

type TeamRosterProps = {
  activeTeam: TeamResponse;
  analytics: TeamAnalytics | null;
};

export function TeamRoster({ activeTeam, analytics }: TeamRosterProps) {
  return (
    <div className="glass-ultra rounded-3xl overflow-hidden border border-white/10">
      <div className="px-6 py-4 border-b border-white/10 bg-white/5">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-400" />
          Team Roster & Performance
        </h3>
      </div>
      <div className="grid grid-cols-[1fr_80px_120px] sm:grid-cols-[1fr_80px_100px_120px] gap-4 px-6 py-3 text-xs uppercase tracking-wider text-white/40 border-b border-white/10">
        <span>Member</span>
        <span className="hidden sm:block">Role</span>
        <span className="text-right">Sessions</span>
        <span className="text-right">Joined</span>
      </div>
      <div>
        {activeTeam.members.map((member, index) => {
          const mStats = analytics?.members?.find(m => m.user_id === member.user_id);
          const sessions = mStats?.sessions_count || 0;
          const score = mStats?.average_score ? Math.round(mStats.average_score) : null;
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-[1fr_80px_120px] sm:grid-cols-[1fr_80px_100px_120px] gap-4 px-6 py-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">{member.user_name || 'Unknown User'}</div>
                  <div className="text-xs text-white/40">{member.user_email}</div>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className={`text-[10px] uppercase px-2 py-1 rounded-full ${
                  member.role === 'manager'
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'bg-white/5 text-white/50'
                }`}>
                  {member.role}
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="font-medium text-amber-400">
                  {sessions} {sessions === 1 ? 'Session' : 'Sessions'}
                </div>
                {score !== null && (
                  <div className="text-[10px] text-cyan-400 font-bold">
                    Avg: {score}
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-white/40">
                {new Date(member.joined_at).toLocaleDateString()}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
