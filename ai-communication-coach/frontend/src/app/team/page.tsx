'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Link as LinkIcon, Shield, Loader2, ArrowRight, Check,
  Crown, Target, Zap, Activity, Eye, Sparkles, Crown as CrownIcon,
  User, ChevronRight, BarChart3
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { TiltCard } from '@/components/TiltCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TeamSidebar } from '@/components/team/TeamSidebar';
import { TeamInfoCard } from '@/components/team/TeamInfoCard';
import { TeamStatsGrid } from '@/components/team/TeamStatsGrid';
import { TeamRoster } from '@/components/team/TeamRoster';
import { api, TeamResponse, TeamAnalytics } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function TeamPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [tab, setTab] = useState<'view' | 'create' | 'join'>('view');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (activeTeamId) {
      const team = teams.find((t) => t.id === activeTeamId);
      const isManager = team?.members.some(m => m.user_id === user?.id && m.role === 'manager');
      
      if (isManager) {
        fetchAnalytics(activeTeamId);
      } else {
        setAnalytics(null);
      }
    }
  }, [activeTeamId, teams, user]);

  async function fetchTeams() {
    try {
      const data = await api.getTeams();
      setTeams(data);
      if (data.length > 0 && !activeTeamId) {
        setActiveTeamId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnalytics(teamId: string) {
    try {
      const data = await api.getTeamAnalytics(teamId);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  }

  async function handleCreate() {
    if (!newTeamName.trim()) { setError('Team name is required'); return; }
    setActionLoading(true); setError('');
    try {
      const team = await api.createTeam({ name: newTeamName, description: newTeamDesc });
      await fetchTeams();
      setActiveTeamId(team.id);
      setTab('view');
      setNewTeamName('');
      setNewTeamDesc('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally { setActionLoading(false); }
  }

  async function handleJoin() {
    if (!joinCode.trim()) { setError('Invite code is required'); return; }
    setActionLoading(true); setError('');
    try {
      const team = await api.joinTeam(joinCode.trim().toUpperCase());
      await fetchTeams();
      setActiveTeamId(team.id);
      setTab('view');
      setJoinCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally { setActionLoading(false); }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const isManager = !!activeTeam?.members.some(m => m.user_id === user?.id && m.role === 'manager');

  return (
    <div className="min-h-screen bg-[#050810] relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[150px] animate-float-slow" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] animate-float-slow" style={{ animationDelay: '3s' }} />
      </div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 z-[1] opacity-10 pointer-events-none grid-bg" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl p-6 lg:p-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Users className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Teams</h1>
                <p className="text-white/50 text-sm">Enterprise communication coaching</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(['view', 'create', 'join'] as const).map((t) => (
              teams.length > 0 || t !== 'view' ? (
                <motion.button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    tab === t ? 'text-white' : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  {tab === t && (
                    <motion.div
                      layoutId="teamTabBg"
                      className={`absolute inset-0 rounded-xl ${
                        t === 'create'
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                          : t === 'join'
                          ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30'
                          : 'bg-white/10 border border-white/10'
                      }`}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {t === 'create' && <Plus className="h-4 w-4" />}
                    {t === 'join' && <LinkIcon className="h-4 w-4" />}
                    {t === 'view' && <BarChart3 className="h-4 w-4" />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                </motion.button>
              ) : null
            ))}
          </div>
        </motion.section>

        {loading ? (
          <div className="mt-20 flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 mb-4"
            />
            <p className="text-white/50">Loading teams...</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {/* Create / Join Tabs */}
              {(tab === 'create' || tab === 'join') && (
                <motion.section
                  key={tab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-ultra rounded-3xl p-8 max-w-md mx-auto mb-8 border border-white/10"
                >
                  <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    {tab === 'create' ? <><Sparkles className="h-5 w-5 text-cyan-400" /> Create Team</> : <><LinkIcon className="h-5 w-5 text-violet-400" /> Join Team</>}
                  </h2>
                  <p className="text-white/50 text-sm mb-6">{tab === 'create' ? 'Create a new team to manage members' : 'Join with an invite code from your manager'}</p>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 rounded-xl p-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {tab === 'create' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs uppercase tracking-wider text-white/50 block mb-2">Team Name</label>
                        <input
                          type="text"
                          name="teamName"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="e.g., Sales Team Alpha"
                          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-white/50 block mb-2">Description (Optional)</label>
                        <input
                          type="text"
                          name="teamDescription"
                          value={newTeamDesc}
                          onChange={(e) => setNewTeamDesc(e.target.value)}
                          placeholder="Brief description..."
                          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none"
                        />
                      </div>
                      <motion.button
                        onClick={handleCreate}
                        disabled={actionLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3 font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {actionLoading ? (
                          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                            <Loader2 className="h-4 w-4" />
                          </motion.span>
                        ) : (
                          <><Plus className="h-4 w-4" /> Create Team</>
                        )}
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs uppercase tracking-wider text-white/50 block mb-2">Invite Code</label>
                        <input
                          type="text"
                          name="joinCode"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          placeholder="A3F1B2"
                          maxLength={8}
                          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-center text-2xl font-mono tracking-[0.2em] uppercase text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none"
                        />
                      </div>
                      <motion.button
                        onClick={handleJoin}
                        disabled={actionLoading || joinCode.length < 5}
                        whileHover={{ scale: joinCode.length >= 5 ? 1.02 : 1 }}
                        whileTap={{ scale: joinCode.length >= 5 ? 0.98 : 1 }}
                        className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                      >
                        {actionLoading ? (
                          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                            <Loader2 className="h-4 w-4" />
                          </motion.span>
                        ) : (
                          <><ArrowRight className="h-4 w-4" /> Join Team</>
                        )}
                      </motion.button>
                    </div>
                  )}
                </motion.section>
              )}

              {/* View Tab - Empty State */}
              {tab === 'view' && teams.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-20 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                    <Shield className="h-10 w-10 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Teams Found</h3>
                  <p className="text-white/50 max-w-sm mb-6">You are not part of any teams yet. Create a new team or join with an invite code.</p>
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setTab('create')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-medium text-sm"
                    >
                      Create Team
                    </motion.button>
                    <motion.button
                      onClick={() => setTab('join')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition"
                    >
                      Join Team
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {tab === 'view' && activeTeam && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid gap-6 lg:grid-cols-[280px_1fr]"
                >
                  {/* Team Selector Sidebar */}
                  <TeamSidebar 
                    teams={teams} 
                    activeTeamId={activeTeamId} 
                    setActiveTeamId={setActiveTeamId} 
                  />

                  {/* Team Dashboard */}
                  <div className="space-y-6">
                    {/* Team Info Card */}
                    <TeamInfoCard 
                      activeTeam={activeTeam} 
                      isManager={isManager} 
                      copyCode={copyCode} 
                      copied={copied} 
                    />

                    {/* Analytics Section (Managers Only) */}
                    {isManager ? (
                      analytics ? (
                        <div className="space-y-6">
                          <TeamStatsGrid analytics={analytics} />
                          <TeamRoster activeTeam={activeTeam} analytics={analytics} />
                        </div>
                      ) : (
                        <div className="flex justify-center p-8">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-400"
                          />
                        </div>
                      )
                    ) : (
                      <TiltCard tiltAmount={2}>
                        <div className="glass-ultra rounded-3xl p-8 text-center border border-white/10">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                            <Shield className="h-8 w-8 text-violet-400" />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">Member View</h3>
                          <p className="text-sm text-white/50 max-w-md mx-auto">You are a member of this team. Detailed analytics are restricted to team managers. Continue practicing to contribute to your team&apos;s overall score!</p>
                        </div>
                      </TiltCard>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* HUD Corners */}
      <div className="fixed inset-0 z-[5] pointer-events-none">
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />
      </div>
    </div>
  );
}
