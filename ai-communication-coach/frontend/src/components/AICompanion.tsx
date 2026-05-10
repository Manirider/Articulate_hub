'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  Bot, 
  X, 
  MessageCircle, 
  Volume2, 
  VolumeX,
  Sparkles,
  Zap,
  Trophy,
  Target,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * AI Companion - Persistent 3D AI Bot Assistant
 * 
 * A futuristic AI companion that appears across the entire platform,
 * providing guidance, feedback, and interactive assistance with
 * cinematic 3D visuals and voice synthesis.
 */

interface AICompanionProps {
  mode?: 'floating' | 'sidebar' | 'minimal';
  sessionActive?: boolean;
}

interface Message {
  id: string;
  text: string;
  type: 'greeting' | 'guidance' | 'feedback' | 'achievement' | 'system';
  emotion?: 'happy' | 'neutral' | 'concerned' | 'excited';
}

export function AICompanion({ mode = 'floating', sessionActive = false }: AICompanionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    botGroup: THREE.Group;
    headGroup: THREE.Group;
    eyeLeft: THREE.Mesh;
    eyeRight: THREE.Mesh;
    mouth: THREE.Mesh;
    glowLight: THREE.PointLight;
    particles: THREE.Points;
    animationId: number;
  } | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [botState, setBotState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [hovered, setHovered] = useState(false);

  // Initialize 3D Scene
  useEffect(() => {
    if (!canvasRef.current || mode === 'minimal') return;

    const canvas = canvasRef.current;
    const width = 200;
    const height = 200;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Bot Group
    const botGroup = new THREE.Group();
    scene.add(botGroup);

    // Head Group
    const headGroup = new THREE.Group();
    botGroup.add(headGroup);

    // Materials
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.5,
      roughness: 0.5,
    });

    // Main head sphere
    const headGeometry = new THREE.SphereGeometry(1, 32, 32);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    headGroup.add(head);

    // Face screen
    const faceGeometry = new THREE.CircleGeometry(0.7, 32);
    const faceScreen = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.9,
    }));
    faceScreen.position.set(0, 0, 0.85);
    headGroup.add(faceScreen);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.9,
    });

    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(-0.25, 0.1, 0.9);
    headGroup.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeRight.position.set(0.25, 0.1, 0.9);
    headGroup.add(eyeRight);

    // Eye glow rings
    const eyeGlowGeometry = new THREE.RingGeometry(0.12, 0.18, 16);
    const eyeGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });

    const eyeGlowLeft = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial);
    eyeGlowLeft.position.set(-0.25, 0.1, 0.91);
    headGroup.add(eyeGlowLeft);

    const eyeGlowRight = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial);
    eyeGlowRight.position.set(0.25, 0.1, 0.91);
    headGroup.add(eyeGlowRight);

    // Mouth
    const mouthGeometry = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8);
    const mouthMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.7,
    });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.25, 0.9);
    mouth.rotation.z = Math.PI / 2;
    headGroup.add(mouth);

    // Antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
    const antenna = new THREE.Mesh(antennaGeometry, darkMaterial);
    antenna.position.set(0, 1.3, 0);
    headGroup.add(antenna);

    // Antenna tip glow
    const antennaTipGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const antennaTip = new THREE.Mesh(antennaTipGeometry, glowMaterial);
    antennaTip.position.set(0, 1.6, 0);
    headGroup.add(antennaTip);

    // Side panels
    const panelGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.1);
    const panelLeft = new THREE.Mesh(panelGeometry, darkMaterial);
    panelLeft.position.set(-1.1, 0, 0);
    panelLeft.rotation.z = 0.2;
    headGroup.add(panelLeft);

    const panelRight = new THREE.Mesh(panelGeometry, darkMaterial);
    panelRight.position.set(1.1, 0, 0);
    panelRight.rotation.z = -0.2;
    headGroup.add(panelRight);

    // Panel glow strips
    const stripGeometry = new THREE.BoxGeometry(0.05, 0.6, 0.02);
    const stripMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8,
    });

    const stripLeft = new THREE.Mesh(stripGeometry, stripMaterial);
    stripLeft.position.set(-1.1, 0, 0.06);
    headGroup.add(stripLeft);

    const stripRight = new THREE.Mesh(stripGeometry, stripMaterial);
    stripRight.position.set(1.1, 0, 0.06);
    headGroup.add(stripRight);

    // Glow light
    const glowLight = new THREE.PointLight(0x06b6d4, 2, 10);
    glowLight.position.set(0, 0, 2);
    scene.add(glowLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Back light
    const backLight = new THREE.DirectionalLight(0x06b6d4, 0.5);
    backLight.position.set(-5, 3, -5);
    scene.add(backLight);

    // Particles
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 6;
      positions[i + 1] = (Math.random() - 0.5) * 6;
      positions[i + 2] = (Math.random() - 0.5) * 6;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.03,
      transparent: true,
      opacity: 0.6,
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      botGroup,
      headGroup,
      eyeLeft,
      eyeRight,
      mouth,
      glowLight,
      particles,
      animationId: 0,
    };

    // Animation loop
    let time = 0;
    const animate = () => {
      time += 0.01;
      const { headGroup, particles, glowLight, eyeLeft, eyeRight, mouth } = sceneRef.current!;

      // Idle floating animation
      headGroup.position.y = Math.sin(time) * 0.1;
      headGroup.rotation.y = Math.sin(time * 0.5) * 0.05;

      // Particles rotation
      particles.rotation.y += 0.002;
      particles.rotation.x += 0.001;

      // Glow pulse
      const glowIntensity = isSpeaking 
        ? 2 + Math.sin(time * 10) * 1.5 // Fast pulse when speaking
        : hovered 
        ? 2 + Math.sin(time * 3) * 0.5  // Medium pulse when hovered
        : 1.5 + Math.sin(time * 2) * 0.3; // Slow pulse when idle
      glowLight.intensity = glowIntensity;

      // Eye animation when speaking
      if (isSpeaking) {
        const blinkSpeed = 8;
        const eyeScale = 0.8 + Math.sin(time * blinkSpeed) * 0.2;
        eyeLeft.scale.y = eyeScale;
        eyeRight.scale.y = eyeScale;
        
        // Mouth animation
        mouth.scale.x = 0.8 + Math.sin(time * 15) * 0.4;
      } else {
        eyeLeft.scale.y = 1;
        eyeRight.scale.y = 1;
        mouth.scale.x = 1;
      }

      renderer.render(scene, camera);
      sceneRef.current!.animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(sceneRef.current?.animationId || 0);
      renderer.dispose();
    };
  }, [mode, isSpeaking, hovered]);

  // Text-to-Speech
  const speak = useCallback((text: string, emotion: Message['emotion'] = 'neutral') => {
    if (isMuted || typeof window === 'undefined') return;

    // Cancel any ongoing speech
    window.speechSynthesis?.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = emotion === 'excited' ? 1.2 : emotion === 'happy' ? 1.1 : 1;
    utterance.volume = 0.8;

    // Try to find a good voice
    const voices = window.speechSynthesis?.getVoices() || [];
    const preferredVoice = voices.find(v => v.name.includes('Google')) || 
                          voices.find(v => v.name.includes('Samantha')) ||
                          voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis?.speak(utterance);
  }, [isMuted]);

  // Add message and speak
  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const fullMessage = { ...message, id };
    
    setMessages(prev => [...prev.slice(-4), fullMessage]);
    setCurrentMessage(fullMessage);
    speak(message.text, message.emotion);
  }, [speak]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greetings = [
        { text: "Hello! I'm your AI communication coach. Ready to help you master your speaking skills!", emotion: 'happy' as const },
        { text: "Welcome back! I'm here to guide you through your communication journey.", emotion: 'happy' as const },
        { text: "Hi there! Let's work on becoming a confident communicator together.", emotion: 'excited' as const },
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      setTimeout(() => {
        addMessage({
          text: greeting.text,
          type: 'greeting',
          emotion: greeting.emotion,
        });
      }, 1000);
    }
  }, [addMessage, messages.length]);

  // Guidance messages based on page/activity
  useEffect(() => {
    if (sessionActive && !isSpeaking) {
      const tips = [
        "Remember to maintain eye contact with the camera!",
        "Take a deep breath and speak with confidence.",
        "Great job! Keep your energy up!",
        "Try to vary your tone for more impact.",
      ];
      
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          const tip = tips[Math.floor(Math.random() * tips.length)];
          addMessage({
            text: tip,
            type: 'guidance',
            emotion: 'neutral',
          });
        }
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [sessionActive, isSpeaking, addMessage]);

  // Minimal mode - just an icon
  if (mode === 'minimal') {
    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30"
      >
        <Bot className="w-6 h-6 text-white" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className={clsx(
          "fixed z-50",
          mode === 'floating' && "bottom-6 right-6",
          mode === 'sidebar' && "top-24 right-6"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Main Container */}
        <div className={clsx(
          "relative rounded-2xl overflow-hidden",
          "bg-surface/80 backdrop-blur-xl",
          "border border-white/10",
          "shadow-2xl shadow-cyan-500/10",
          isExpanded ? "w-80" : "w-auto"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className={clsx(
                "w-2 h-2 rounded-full",
                isSpeaking ? "bg-cyan-400 animate-pulse" : "bg-green-400"
              )} />
              <span className="text-white/90 text-sm font-medium">AI Coach</span>
              {isSpeaking && (
                <span className="text-cyan-400 text-xs animate-pulse">Speaking...</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white/60" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white/60" />
                )}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isExpanded ? (
                  <X className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={clsx(
            "flex",
            isExpanded ? "flex-row" : "flex-col items-center p-4"
          )}>
            {/* 3D Avatar */}
            <div className={clsx(
              "relative",
              isExpanded ? "w-32 h-32" : "w-24 h-24"
            )}>
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
              />
              
              {/* Status indicator ring */}
              <div className={clsx(
                "absolute inset-0 rounded-full border-2",
                isSpeaking 
                  ? "border-cyan-400 animate-pulse" 
                  : hovered 
                  ? "border-cyan-400/50" 
                  : "border-white/10"
              )} />
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="flex-1 p-4 space-y-3">
                {/* Current Message */}
                <AnimatePresence mode="wait">
                  {currentMessage && (
                    <motion.div
                      key={currentMessage.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={clsx(
                        "p-3 rounded-lg border",
                        currentMessage.type === 'greeting' && "bg-cyan-500/10 border-cyan-500/30",
                        currentMessage.type === 'guidance' && "bg-blue-500/10 border-blue-500/30",
                        currentMessage.type === 'feedback' && "bg-purple-500/10 border-purple-500/30",
                        currentMessage.type === 'achievement' && "bg-yellow-500/10 border-yellow-500/30",
                        currentMessage.type === 'system' && "bg-white/5 border-white/10"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {currentMessage.type === 'achievement' && (
                          <Trophy className="w-4 h-4 text-yellow-400 mt-0.5" />
                        )}
                        {currentMessage.type === 'guidance' && (
                          <Target className="w-4 h-4 text-blue-400 mt-0.5" />
                        )}
                        {currentMessage.type === 'greeting' && (
                          <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5" />
                        )}
                        <p className="text-white/90 text-sm leading-relaxed">
                          {currentMessage.text}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addMessage({
                      text: "I'm here to help! What would you like to practice today?",
                      type: 'guidance',
                      emotion: 'happy',
                    })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                  >
                    <MessageCircle className="w-4 h-4 text-cyan-400" />
                    <span className="text-white/70 text-xs">Ask for Help</span>
                  </button>
                  <button
                    onClick={() => addMessage({
                      text: "Take a deep breath. You've got this! Let's start when you're ready.",
                      type: 'guidance',
                      emotion: 'happy',
                    })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                  >
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/70 text-xs">Get Motivated</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Message History (when expanded) */}
          {isExpanded && messages.length > 1 && (
            <div className="px-4 pb-4">
              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                {messages.slice(0, -1).reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 rounded bg-white/5 text-white/60 text-xs"
                  >
                    {msg.text.slice(0, 60)}{msg.text.length > 60 ? '...' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Glow effect */}
        <div className={clsx(
          "absolute -inset-1 rounded-2xl blur-xl -z-10 transition-opacity duration-500",
          isSpeaking ? "opacity-60" : hovered ? "opacity-40" : "opacity-20"
        )} 
        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)' }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
