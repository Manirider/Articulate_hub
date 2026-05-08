'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Link as LinkIcon, Shield, Loader2, ArrowRight, Check } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { HolographicCard } from '@/components/HolographicCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ScoreCard } from '@/components/ScoreCard';
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
  const isManager = activeTeam?.members.some(m => m.user_id === user?.id && m.role === 'manager');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl p-6 lg:p-8">
        
        {/* Header */}
        <section className="animate-fade-in-up flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Users className="h-7 w-7" style={{ color: 'var(--accent-cyan)' }} />
              <h1 className="text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>Teams</h1>
            </div>
            <p className="mt-1" style={{ color: 'var(--ink-secondary)' }}>Enterprise dashboard for communication coaching.</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => { setTab('create'); setError(''); }}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition"
              style={{ background: tab === 'create' ? 'var(--glow-cyan)' : 'var(--bg-card)', color: 'var(--ink)', border: '1px solid var(--border)' }}
            >
              <Plus className="inline h-4 w-4 mr-1.5" /> Create
            </button>
            <button
              onClick={() => { setTab('join'); setError(''); }}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition"
              style={{ background: tab === 'join' ? 'var(--glow-violet)' : 'var(--bg-card)', color: 'var(--ink)', border: '1px solid var(--border)' }}
            >
              <LinkIcon className="inline h-4 w-4 mr-1.5" /> Join
            </button>
            {teams.length > 0 && (
              <button
                onClick={() => setTab('view')}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{ background: tab === 'view' ? 'rgba(255,255,255,0.05)' : 'transparent', color: 'var(--ink)' }}
              >
                Overview
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div className="mt-20 flex flex-col items-center justify-center animate-fade-in-up" style={{ color: 'var(--ink-muted)' }}>
            <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: 'var(--accent-amber)' }} />
            <p>Loading teams...</p>
          </div>
        ) : (
          <>
            {/* Create / Join Tabs */}
            {(tab === 'create' || tab === 'join') && (
              <section className="glass rounded-2xl p-8 max-w-md mx-auto mb-8 animate-fade-in-up">
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--ink)' }}>{tab === 'create' ? 'Create a Team' : 'Join a Team'}</h2>
                
                {error && <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.2)' }}>{error}</div>}
                
                {tab === 'create' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-muted)' }}>Team Name</label>
                      <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g., Sales Team Alpha" className="input-dark" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-muted)' }}>Description (Optional)</label>
                      <input type="text" value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} placeholder="Brief description..." className="input-dark" />
                    </div>
                    <button onClick={handleCreate} disabled={actionLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Create Enterprise Team</>}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-muted)' }}>Invite Code</label>
                      <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g., A3F1B2" maxLength={8} className="input-dark text-center text-2xl font-mono tracking-[0.2em] uppercase" />
                    </div>
                    <button onClick={handleJoin} disabled={actionLoading || joinCode.length < 5} className="btn-primary w-full flex items-center justify-center gap-2">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Join Team</>}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* View Tab */}
            {tab === 'view' && teams.length === 0 && (
              <div className="mt-20 flex flex-col items-center justify-center text-center animate-fade-in-up" style={{ color: 'var(--ink-muted)' }}>
                <Shield className="h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>No Teams Found</h3>
                <p className="mt-2 max-w-sm">You are not part of any teams yet. Create a new team to act as a manager, or ask your manager for an invite code.</p>
              </div>
            )}

            {tab === 'view' && activeTeam && (
              <div className="grid gap-6 lg:grid-cols-[250px_1fr] animate-fade-in-up">
                
                {/* Team Selector Sidebar */}
                <aside className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-2" style={{ color: 'var(--ink-muted)' }}>Your Teams</h3>
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTeamId(t.id)}
                      className="w-full text-left rounded-xl p-3 transition-all duration-200"
                      style={{
                        background: activeTeamId === t.id ? 'var(--bg-card-hover)' : 'transparent',
                        border: `1px solid ${activeTeamId === t.id ? 'var(--border-hover)' : 'transparent'}`,
                      }}
                    >
                      <div className="font-bold text-sm truncate" style={{ color: activeTeamId === t.id ? 'var(--accent-cyan)' : 'var(--ink)' }}>{t.name}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{t.members.length} member{t.members.length !== 1 ? 's' : ''}</div>
                    </button>
                  ))}
                </aside>

                {/* Team Dashboard */}
                <div className="space-y-6">
                  
                  {/* Team Info Card */}
                  <HolographicCard className="rounded-2xl p-6" glowColor="0, 229, 255">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{activeTeam.name}</h2>
                        {activeTeam.description && <p className="text-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>{activeTeam.description}</p>}
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-3 rounded-xl px-4 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>Invite Code:</span>
                          <span className="font-mono font-bold tracking-widest text-lg" style={{ color: 'var(--accent-cyan)' }}>{activeTeam.invite_code}</span>
                          <button onClick={() => copyCode(activeTeam.invite_code)} className="p-1.5 hover:bg-white/10 rounded-lg transition" title="Copy code">
                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <LinkIcon className="h-4 w-4" style={{ color: 'var(--ink-secondary)' }} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </HolographicCard>

                  {/* Analytics Section (Managers Only) */}
                  {isManager ? (
                    analytics ? (
                      <div className="space-y-6">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
                          <ScoreCard label="Team Clarity" value={analytics.average_clarity} icon="🎯" color="cyan" />
                          <ScoreCard label="Team Confidence" value={analytics.average_confidence} icon="💪" color="violet" />
                          <ScoreCard label="Team Pacing" value={analytics.average_pacing} icon="⏱️" color="amber" />
                          <ScoreCard label="Team Vision" value={analytics.average_vision} icon="👁️" color="emerald" />
                        </div>
                        
                        <div className="glass rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="font-bold" style={{ color: 'var(--ink)' }}>Team Roster & Performance</h3>
                          </div>
                          <div className="grid grid-cols-[1fr_80px_120px] sm:grid-cols-[1fr_80px_100px_120px] gap-4 px-5 py-3 text-xs uppercase tracking-wider" style={{ color: 'var(--ink-muted)', borderBottom: '1px solid var(--border)' }}>
                            <span>Member</span>
                            <span className="hidden sm:block">Role</span>
                            <span className="text-right">Sessions</span>
                            <span className="text-right">Joined</span>
                          </div>
                          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {activeTeam.members.map((member) => {
                              const mStats = analytics.members?.find(m => m.user_id === member.user_id);
                              const sessions = mStats?.sessions_count || 0;
                              const score = mStats?.average_score ? Math.round(mStats.average_score) : null;
                              return (
                              <div key={member.id} className="grid grid-cols-[1fr_80px_120px] sm:grid-cols-[1fr_80px_100px_120px] gap-4 px-5 py-4 items-center">
                                <div>
                                  <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{member.user_name || 'Unknown User'}</div>
                                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>{member.user_email}</div>
                                </div>
                                <div className="hidden sm:block">
                                  <span className="text-[10px] uppercase px-2 py-1 rounded-full" style={{ background: member.role === 'manager' ? 'rgba(168,85,247,0.1)' : 'var(--bg-card)', color: member.role === 'manager' ? 'var(--accent-violet)' : 'var(--ink-secondary)' }}>
                                    {member.role}
                                  </span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                  <div className="font-medium" style={{ color: 'var(--accent-amber)' }}>
                                    {sessions} {sessions === 1 ? 'Session' : 'Sessions'}
                                  </div>
                                  {score !== null && (
                                    <div className="text-[10px] mt-0.5 font-bold" style={{ color: 'var(--accent-cyan)' }}>
                                      Avg: {score}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right text-xs" style={{ color: 'var(--ink-muted)' }}>
                                  {new Date(member.joined_at).toLocaleDateString()}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--ink-muted)' }} /></div>
                    )
                  ) : (
                    <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--ink-muted)' }}>
                      <Shield className="h-10 w-10 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Member View</h3>
                      <p className="mt-2 text-sm max-w-md mx-auto">You are a member of this team. Detailed analytics are restricted to team managers. Continue practicing to contribute to your team's overall score!</p>
                    </div>
                  )}

                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
