'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Plus, Users, Swords, ArrowRight, Shield,
  MessageCircle, Sparkles, Crown, Zap, Radio
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AvatarOrb } from '@/components/AvatarOrb';
import { TiltCard } from '@/components/TiltCard';
import { api } from '@/services/api';

const MODES = [
  { id: 'practice', label: 'Free Practice', icon: MessageCircle, desc: 'Open discussion with AI observation', max: 6, color: 'from-cyan-500 to-blue-500' },
  { id: 'team_2v2', label: 'Team 2v2', icon: Swords, desc: 'Debate format, 2 vs 2 with AI judge', max: 4, color: 'from-violet-500 to-purple-500' },
  { id: 'team_3v3', label: 'Team 3v3', icon: Crown, desc: 'Team battle, 3 vs 3 with AI judge', max: 6, color: 'from-amber-500 to-orange-500' },
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
    <div className="min-h-screen bg-[#050810] relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[150px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-violet-500/5 blur-[120px] animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 z-[1] opacity-10 pointer-events-none grid-bg" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl p-6 lg:p-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Users className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-400">Multiplayer Mode</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Friends Mode
          </h1>
          <p className="text-lg text-white/50">
            Practice with friends in real-time. Create a room or join with a code.
          </p>
        </motion.section>

        {/* Animated Tabs */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6">
          {(['create', 'join'] as const).map((t) => (
            <motion.button
              key={t}
              onClick={() => { setTab(t); setError(''); if (t === 'join') setCreatedRoom(null); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 w-full sm:w-auto ${
                tab === t
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {tab === t && (
                <motion.div
                  layoutId="roomTabBg"
                  className={`absolute inset-0 rounded-xl ${
                    t === 'create'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                      : 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30'
                  }`}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {t === 'create' ? <><Plus className="h-4 w-4" /> Create Room</> : <><ArrowRight className="h-4 w-4" /> Join Room</>}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Create Room Panel */}
          {tab === 'create' && !createdRoom && (
            <motion.section
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-ultra rounded-3xl p-8 border border-white/10"
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                Create a Room
              </h2>

              <div className="mb-6">
                <label className="text-sm font-medium text-white/50 uppercase tracking-wider block mb-3">Room Title</label>
                <input
                  type="text"
                  name="roomTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Interview Practice, Debate Club..."
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-white/50 uppercase tracking-wider block mb-3">Select Mode</label>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  {MODES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <TiltCard key={m.id} tiltAmount={5}>
                        <motion.button
                          onClick={() => { setMode(m.id); setMaxParticipants(m.max); }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full rounded-xl p-4 border transition-all text-left ${
                            mode === m.id
                              ? 'border-cyan-500/30 bg-cyan-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${m.color} p-2 mb-3`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <p className={`text-sm font-semibold ${mode === m.id ? 'text-cyan-400' : 'text-white'}`}>
                            {m.label}
                          </p>
                          <p className="text-xs text-white/40 mt-1">{m.desc}</p>
                        </motion.button>
                      </TiltCard>
                    );
                  })}
                </div>
              </div>

              <motion.button
                onClick={handleCreate}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 font-semibold text-white disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.span>
                    Creating...
                  </span>
                ) : (
                  'Create Room'
                )}
              </motion.button>
            </motion.section>
          )}

          {/* Room Created — Show Code */}
          {tab === 'create' && createdRoom && (
            <motion.section
              key="created"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-ultra rounded-3xl p-8 text-center border border-white/10"
            >
              <div className="inline-flex items-center justify-center">
                <AvatarOrb size="lg" emotion="celebrating" />
              </div>
              <h2 className="text-2xl font-bold mt-4 text-white">Room Created!</h2>
              <p className="text-sm mt-2 text-white/50">Share this code with your friends</p>

              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl px-6 py-4 bg-black/30 border border-white/10">
                <span className="text-2xl sm:text-3xl font-mono font-bold tracking-[0.3em] bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  {createdRoom.code}
                </span>
                <motion.button
                  onClick={copyCode}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </motion.button>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  onClick={() => router.push(`/room/${createdRoom.id}`)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold"
                >
                  <ArrowRight className="h-4 w-4" /> Enter Room
                </motion.button>
              </div>
            </motion.section>
          )}

          {/* Join Room Panel */}
          {tab === 'join' && (
            <motion.section
              key="join"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-ultra rounded-3xl p-8 border border-white/10"
            >
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Radio className="h-5 w-5 text-violet-400" />
                Join a Room
              </h2>
              <p className="text-sm text-white/50 mb-6">Enter the 6-character code shared by the host</p>

              <div className="relative mb-6">
                <input
                  type="text"
                  name="roomCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="A3F1B2"
                  maxLength={6}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-center text-2xl sm:text-3xl font-mono tracking-[0.3em] uppercase text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all outline-none"
                />
              </div>

              <motion.button
                onClick={handleJoin}
                disabled={loading || joinCode.length < 4}
                whileHover={{ scale: joinCode.length >= 4 ? 1.02 : 1 }}
                whileTap={{ scale: joinCode.length >= 4 ? 0.98 : 1 }}
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 font-semibold text-white disabled:opacity-40 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.span>
                    Joining...
                  </span>
                ) : (
                  'Join Room'
                )}
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl p-4 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features */}
        <section className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[
            { icon: Users, title: 'Multi-User', desc: 'Up to 6 participants with live audio/video', color: 'cyan' },
            { icon: Shield, title: 'AI Observer', desc: 'Real-time analysis of every participant', color: 'violet' },
            { icon: Swords, title: 'Team Mode', desc: '2v2 or 3v3 with AI judge scoring', color: 'amber' },
          ].map((feature, index) => (
            <TiltCard key={feature.title} tiltAmount={5}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="glass-ultra rounded-2xl p-5 text-center border border-white/10 hover:border-white/20 transition-all"
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center`}>
                  <feature.icon className={`h-6 w-6 text-${feature.color}-400`} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">{feature.title}</p>
                <p className="text-xs text-white/50">{feature.desc}</p>
              </motion.div>
            </TiltCard>
          ))}
        </section>
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
