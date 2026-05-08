'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Plus, Users, Swords, ArrowRight, Shield } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AvatarOrb } from '@/components/AvatarOrb';
import { HolographicCard } from '@/components/HolographicCard';
import { api } from '@/services/api';

const MODES = [
  { id: 'practice', label: 'Free Practice', icon: '👥', desc: 'Open discussion with AI observation', max: 6, glow: '0, 229, 255' },
  { id: 'team_2v2', label: 'Team 2v2', icon: '⚔️', desc: 'Debate format, 2 vs 2 with AI judge', max: 4, glow: '168, 85, 247' },
  { id: 'team_3v3', label: 'Team 3v3', icon: '🏆', desc: 'Team battle, 3 vs 3 with AI judge', max: 6, glow: '245, 158, 11' },
];

export default function RoomPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('practice');
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setLoading(true); setError('');
    try {
      const room = await api.createRoom({ title: title || 'Practice Room', mode, max_participants: maxParticipants });
      setCreatedRoom({ id: room.id, code: room.code });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!joinCode.trim()) { setError('Enter a room code'); return; }
    setLoading(true); setError('');
    try {
      const room = await api.joinRoom(joinCode.trim());
      router.push(`/room/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally { setLoading(false); }
  }

  function copyCode() {
    if (createdRoom) {
      navigator.clipboard.writeText(createdRoom.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl p-6 lg:p-8">
        {/* Header */}
        <section className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-extrabold flex items-center justify-center gap-3" style={{ color: 'var(--ink)' }}>
            <Users className="h-8 w-8" style={{ color: 'var(--accent-cyan)' }} />
            Friends Mode
          </h1>
          <p className="mt-2" style={{ color: 'var(--ink-secondary)' }}>
            Practice with friends in real-time. Create a room or join with a code.
          </p>
        </section>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6">
          <button
            onClick={() => { setTab('create'); setError(''); setCreatedRoom(null); }}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300 w-full sm:w-auto"
            style={{
              background: tab === 'create' ? 'var(--glow-cyan)' : 'var(--bg-card)',
              color: tab === 'create' ? 'var(--accent-cyan)' : 'var(--ink-muted)',
              border: `1px solid ${tab === 'create' ? 'var(--border-hover)' : 'var(--border)'}`,
            }}
            aria-pressed={tab === 'create'}
          >
            <Plus className="inline h-4 w-4 mr-1.5" /> Create Room
          </button>
          <button
            onClick={() => { setTab('join'); setError(''); }}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300 w-full sm:w-auto"
            style={{
              background: tab === 'join' ? 'var(--glow-violet)' : 'var(--bg-card)',
              color: tab === 'join' ? 'var(--accent-violet)' : 'var(--ink-muted)',
              border: `1px solid ${tab === 'join' ? 'rgba(168,85,247,0.3)' : 'var(--border)'}`,
            }}
            aria-pressed={tab === 'join'}
          >
            <ArrowRight className="inline h-4 w-4 mr-1.5" /> Join Room
          </button>
        </div>

        {/* Create Room Panel */}
        {tab === 'create' && !createdRoom && (
          <section className="glass rounded-2xl p-8 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Create a Room</h2>
            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: 'var(--ink-muted)' }}>Room Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Interview Practice, Debate Club..." className="input-dark" />
            </div>
            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider block mb-2" style={{ color: 'var(--ink-muted)' }}>Mode</label>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                {MODES.map((m) => (
                  <HolographicCard
                    key={m.id}
                    className={`rounded-xl p-3 cursor-pointer transition-all min-w-0`}
                    glowColor={m.glow}
                  >
                    <button
                      onClick={() => { setMode(m.id); setMaxParticipants(m.max); }}
                      className="text-left w-full"
                      aria-pressed={mode === m.id}
                      style={{
                        color: mode === m.id ? 'var(--accent-cyan)' : 'var(--ink-muted)',
                      }}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <p className="text-sm font-semibold mt-1">{m.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-70">{m.desc}</p>
                    </button>
                  </HolographicCard>
                ))}
              </div>
            </div>
            <button onClick={handleCreate} disabled={loading} className="btn-primary w-full mt-4">
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </section>
        )}

        {/* Room Created — Show Code */}
        {tab === 'create' && createdRoom && (
          <section className="glass rounded-2xl p-8 text-center animate-fade-in-up">
            <AvatarOrb size="sm" emotion="celebrating" />
            <h2 className="text-lg font-bold mt-4" style={{ color: 'var(--ink)' }}>Room Created!</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>Share this code with your friends</p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl px-5 py-4 sm:px-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span className="text-2xl sm:text-3xl font-mono font-bold tracking-[0.3em] gradient-text glow-text">
                {createdRoom.code}
              </span>
              <button onClick={copyCode} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition" style={{ background: 'var(--bg-card-hover)', color: 'var(--ink)' }}>
                {copied ? <Check className="h-3.5 w-3.5" style={{ color: 'var(--accent-emerald)' }} /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => router.push(`/room/${createdRoom.id}`)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
                <ArrowRight className="h-4 w-4" /> Enter Room
              </button>
            </div>
          </section>
        )}

        {/* Join Room Panel */}
        {tab === 'join' && (
          <section className="glass rounded-2xl p-8 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ink)' }}>Join a Room</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ink-secondary)' }}>Enter the 6-character code shared by the host</p>
            <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g., A3F1B2" maxLength={6} className="input-dark text-center text-xl sm:text-2xl font-mono tracking-[0.2em] sm:tracking-[0.3em] uppercase w-full" aria-label="Room join code" />
            <button onClick={handleJoin} disabled={loading || joinCode.length < 4} className="btn-primary w-full mt-4">
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </section>
        )}

        {error && (
          <div className="mt-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
            {error}
          </div>
        )}

        {/* Features */}
        <section className="mt-8 grid gap-3 grid-cols-1 sm:grid-cols-3 stagger-children">
          <HolographicCard className="rounded-2xl p-5 text-center" glowColor="0, 229, 255">
            <Users className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-cyan)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Multi-User</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>Up to 6 participants with live audio/video</p>
          </HolographicCard>
          <HolographicCard className="rounded-2xl p-5 text-center" glowColor="168, 85, 247">
            <Shield className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-violet)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>AI Observer</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>Real-time analysis of every participant</p>
          </HolographicCard>
          <HolographicCard className="rounded-2xl p-5 text-center" glowColor="245, 158, 11">
            <Swords className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--accent-amber)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Team Mode</p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>2v2 or 3v3 with AI judge scoring</p>
          </HolographicCard>
        </section>
      </main>
    </div>
  );
}
