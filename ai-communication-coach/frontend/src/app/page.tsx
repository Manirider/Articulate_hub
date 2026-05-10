'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarOrb } from '@/components/AvatarOrb';
import { TiltCard } from '@/components/TiltCard';

const ThreeScene = dynamic(() => import('@/components/ThreeScene').then(mod => mod.ThreeScene), { ssr: false });
import { ArrowRight, Sparkles, Zap, Brain, Mic, Video, Users, Trophy } from 'lucide-react';

export default function SplashPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showButton, setShowButton] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'loading' | 'ready'>('intro');
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number}>>([]);
  const tagline = 'Train Like a Leader. Speak Like a Pro.';
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, []);

  // Phase transitions for cinematic experience
  useEffect(() => {
    const phaseTimer = setTimeout(() => {
      setPhase('loading');
      setShowContent(true);
    }, 800);
    
    const readyTimer = setTimeout(() => {
      setPhase('ready');
    }, 3500);
    
    return () => {
      clearTimeout(phaseTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!showContent) return;
    let i = 0;
    typingRef.current = setInterval(() => {
      i++;
      setTypedText(tagline.slice(0, i));
      if (i >= tagline.length) {
        clearInterval(typingRef.current!);
      }
    }, 45);
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [showContent]);

  // Progress bar with cinematic timing (5 seconds total)
  useEffect(() => {
    if (phase !== 'loading' && phase !== 'ready') return;
    
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          // Auto-redirect after cinematic experience
          setTimeout(() => router.replace('/auth'), 500);
          return 100;
        }
        return p + 1.5;
      });
    }, 50);

    // Show button after cinematic reveal
    const btnTimer = setTimeout(() => setShowButton(true), 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(btnTimer);
    };
  }, [router, phase]);

  function handleEnter() {
    router.replace('/auth');
  }

  const features = [
    { icon: Mic, label: 'Voice AI', color: 'from-cyan-500 to-blue-500' },
    { icon: Video, label: 'Face Analysis', color: 'from-violet-500 to-purple-500' },
    { icon: Brain, label: 'Multi-Agent', color: 'from-emerald-500 to-teal-500' },
    { icon: Users, label: 'Team Rooms', color: 'from-amber-500 to-orange-500' },
    { icon: Trophy, label: 'Gamified', color: 'from-rose-500 to-pink-500' },
  ];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050810]">
      {/* Cinematic Three.js 3D background */}
      <div className="absolute inset-0 z-0">
        <ThreeScene variant="brain" interactive />
      </div>

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <motion.div 
          className="absolute left-1/4 top-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-[150px]"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 blur-[150px]"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 z-[3] opacity-20 pointer-events-none grid-bg" />

      {/* Main content */}
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.section
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            {/* Animated logo reveal */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
              className="relative"
            >
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 blur-xl animate-pulse" />
                <div className="relative z-10 flex items-center justify-center w-full h-full">
                  <Zap className="w-16 h-16 text-cyan-400" />
                </div>
                {/* Orbital rings */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-cyan-500/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  style={{ borderStyle: 'dashed' }}
                />
                <motion.div
                  className="absolute -inset-4 rounded-full border border-violet-500/20"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  style={{ borderStyle: 'dashed' }}
                />
              </div>
            </motion.div>
          </motion.section>
        )}

        {(phase === 'loading' || phase === 'ready') && (
          <motion.section
            key="main"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 flex w-[90%] max-w-3xl flex-col items-center text-center px-4"
          >
            {/* AI Hologram Avatar */}
            <TiltCard className="mb-8" tiltAmount={15}>
              <div className="relative">
                <motion.div
                  className="relative z-10"
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <AvatarOrb size="xl" speaking emotion="celebrating" />
                </motion.div>
                
                {/* Holographic glow */}
                <motion.div 
                  className="absolute -inset-8 rounded-full bg-gradient-to-r from-cyan-500/30 via-violet-500/30 to-cyan-500/30 blur-3xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Scanner line effect */}
                <motion.div
                  className="absolute inset-0 rounded-full overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    animate={{
                      top: ['0%', '100%', '0%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.div>
              </div>
            </TiltCard>

            {/* Animated Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight tracking-tight">
                <motion.span 
                  className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  AI Communication
                </motion.span>
                <motion.span 
                  className="block text-white/90 mt-2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  Coach
                </motion.span>
              </h1>
            </motion.div>

            {/* Typewriter tagline with glow */}
            <motion.p 
              className="mt-6 text-lg md:text-xl lg:text-2xl font-medium text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {typedText}
              <motion.span 
                className="inline-block w-0.5 h-6 ml-1 bg-cyan-400"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </motion.p>

            {/* Feature pills with icons */}
            <motion.div 
              className="mt-8 flex flex-wrap justify-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full glass-ultra border border-white/10 hover:border-cyan-500/50 transition-all duration-300 cursor-default group"
                >
                  <feature.icon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                  <span className="text-sm font-medium text-white/70">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Cinematic progress bar */}
            <motion.div 
              className="mt-10 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
            >
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5 backdrop-blur-sm">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #00e5ff, #a855f7, #00e5ff)',
                    backgroundSize: '200% 100%',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '500%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-white/50 uppercase tracking-widest font-medium">
                  {progress < 100 ? (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Initializing Neural Networks...
                    </motion.span>
                  ) : (
                    <span className="text-emerald-400">Systems Online</span>
                  )}
                </span>
                <span className="font-mono text-cyan-400">{Math.round(progress)}%</span>
              </div>
            </motion.div>

            {/* Cinematic Enter Button */}
            <AnimatePresence>
              {showButton && (
                <motion.button
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEnter}
                  className="mt-10 group relative px-8 py-4 rounded-2xl overflow-hidden"
                >
                  {/* Button background with gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 group-hover:from-cyan-500/30 group-hover:via-violet-500/30 group-hover:to-cyan-500/30 transition-all duration-500" />
                  
                  {/* Animated border */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(90deg, #00e5ff, #a855f7, #00e5ff)',
                      backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-[1px] rounded-2xl bg-[#0a0f1e]/90 backdrop-blur-xl" />
                  
                  {/* Button content */}
                  <div className="relative z-10 flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                    </motion.div>
                    <span className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                      Enter Experience
                    </span>
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-5 h-5 text-violet-400" />
                    </motion.div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Corner HUD elements */}
      <div className="absolute inset-0 z-[5] pointer-events-none">
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />
      </div>
    </main>
  );
}
