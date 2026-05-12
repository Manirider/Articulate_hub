'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  Bot, 
  Mic, 
  MicOff,
  Activity,
  Eye,
  MessageSquare
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAICompanion } from '@/hooks/useAICompanion';

interface RoomBotTileProps {
  isModerator?: boolean;
  participants?: string[];
  onAnalysis?: (data: any) => void;
}

/**
 * RoomBotTile - AI Bot participant in group video rooms
 * 
 * Appears as a participant tile in multi-user video sessions,
 * actively monitoring discussions and providing moderation.
 */
export function RoomBotTile({ isModerator = true, participants = [], onAnalysis }: RoomBotTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    headGroup: THREE.Group;
    animationId: number;
  } | null>(null);
  
  const { isSpeaking, currentMessage } = useAICompanion();
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [participantStats, setParticipantStats] = useState<Record<string, {
    speakingTime: number;
    interventions: number;
    engagement: number;
  }>>({});

  // Initialize 3D avatar (compact version)
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = 150;
    const height = 150;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 4);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const headGroup = new THREE.Group();
    scene.add(headGroup);

    // Materials
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8,
    });

    // Head
    const headGeometry = new THREE.SphereGeometry(0.8, 24, 24);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    headGroup.add(head);

    // Face screen
    const faceGeometry = new THREE.CircleGeometry(0.55, 24);
    const faceScreen = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.9,
    }));
    faceScreen.position.set(0, 0, 0.68);
    headGroup.add(faceScreen);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 12, 12);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(-0.2, 0.08, 0.72);
    headGroup.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeRight.position.set(0.2, 0.08, 0.72);
    headGroup.add(eyeRight);

    // Eye glow
    const eyeGlowGeometry = new THREE.RingGeometry(0.1, 0.14, 12);
    const eyeGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });

    const eyeGlowLeft = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial);
    eyeGlowLeft.position.set(-0.2, 0.08, 0.73);
    headGroup.add(eyeGlowLeft);

    const eyeGlowRight = new THREE.Mesh(eyeGlowGeometry, eyeGlowMaterial);
    eyeGlowRight.position.set(0.2, 0.08, 0.73);
    headGroup.add(eyeGlowRight);

    // Mouth
    const mouthGeometry = new THREE.CapsuleGeometry(0.06, 0.2, 4, 8);
    const mouthMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.7,
    });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.2, 0.72);
    mouth.rotation.z = Math.PI / 2;
    headGroup.add(mouth);

    // Antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8);
    const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 1, 0);
    headGroup.add(antenna);

    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      glowMaterial
    );
    antennaTip.position.set(0, 1.2, 0);
    headGroup.add(antennaTip);

    // Glow light
    const glowLight = new THREE.PointLight(0x06b6d4, 2, 8);
    glowLight.position.set(0, 0, 1.5);
    scene.add(glowLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 3, 3);
    scene.add(dirLight);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      headGroup,
      animationId: 0,
    };

    // Animation
    let time = 0;
    const animate = () => {
      time += 0.015;
      const { headGroup } = sceneRef.current!;

      // Idle animation
      headGroup.position.y = Math.sin(time) * 0.05;
      headGroup.rotation.y = Math.sin(time * 0.5) * 0.1;

      // Speaking animation
      if (isSpeaking) {
        mouth.scale.x = 0.7 + Math.sin(time * 15) * 0.5;
        eyeLeft.scale.y = 0.8 + Math.sin(time * 8) * 0.2;
        eyeRight.scale.y = 0.8 + Math.sin(time * 8) * 0.2;
        glowLight.intensity = 2 + Math.sin(time * 10) * 1;
      } else if (isListening) {
        // Listening - eyes focused
        eyeLeft.scale.y = 1.1;
        eyeRight.scale.y = 1.1;
        glowLight.intensity = 1.5 + Math.sin(time * 4) * 0.5;
        mouth.scale.x = 0.5;
      } else if (isAnalyzing) {
        // Analyzing - rapid glow
        glowLight.intensity = 2 + Math.sin(time * 20) * 1;
        eyeLeft.scale.y = 1;
        eyeRight.scale.y = 1;
        mouth.scale.x = 1;
      } else {
        // Idle
        mouth.scale.x = 1;
        eyeLeft.scale.y = 1;
        eyeRight.scale.y = 1;
        glowLight.intensity = 1.5 + Math.sin(time * 2) * 0.3;
      }

      renderer.render(scene, camera);
      sceneRef.current!.animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(sceneRef.current?.animationId || 0);
      renderer.dispose();
    };
  }, [isSpeaking, isListening, isAnalyzing]);

  // Listen for real analysis updates from parent
  useEffect(() => {
    // In a real production environment, this would listen to a socket event
    // or receive props from the parent Room page that manages the WebRTC connection.
    // For now, we rely solely on the onAnalysis prop or external state management
    // rather than faking data.
  }, [isModerator, participants]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-xl overflow-hidden bg-slate-900/80 backdrop-blur-sm border border-white/10"
    >
      {/* Video Tile Container */}
      <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
        {/* 3D Avatar Canvas */}
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-32 h-32"
          />
        </div>

        {/* Status Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Speaking Indicator */}
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/30 border border-cyan-500/50"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-300 text-xs">Speaking</span>
            </motion.div>
          )}

          {/* Listening Indicator */}
          {isListening && !isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/30 border border-green-500/50"
            >
              <Eye className="w-3 h-3 text-green-400" />
              <span className="text-green-300 text-xs">Listening</span>
            </motion.div>
          )}

          {/* Analyzing Indicator */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/30 border border-purple-500/50"
            >
              <Activity className="w-3 h-3 text-purple-400 animate-pulse" />
              <span className="text-purple-300 text-xs">Analyzing</span>
            </motion.div>
          )}

          {/* Bot Name Badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-white/90 text-sm font-medium">AI Coach</span>
            {isModerator && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 text-xs">
                Moderator
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                isMuted ? "bg-red-500/30 text-red-400" : "bg-white/10 text-white/60 hover:bg-white/20"
              )}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Current Message Overlay */}
        <AnimatePresence>
          {currentMessage && isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-16 left-4 right-4 p-3 rounded-lg bg-black/70 backdrop-blur-md border border-cyan-500/30"
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-white/90 text-sm">{currentMessage.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Analysis Panel */}
      {isModerator && Object.keys(participantStats).length > 0 && (
        <div className="p-3 border-t border-white/10 bg-black/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-white/70 text-xs uppercase tracking-wider">Discussion Analysis</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(participantStats).slice(0, 3).map(([id, stats], index) => (
              <div key={id} className="p-2 rounded bg-white/5 text-center">
                <span className="text-white/40 text-xs">Participant {index + 1}</span>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <div 
                    className="w-8 h-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    style={{ opacity: stats.engagement / 100 }}
                  />
                  <span className="text-cyan-400 text-xs">{stats.engagement}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
