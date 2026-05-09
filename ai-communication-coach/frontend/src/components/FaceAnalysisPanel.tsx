'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Eye, 
  Activity, 
  Brain, 
  Target, 
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';
import { useFaceAnalysis, FaceAnalysisMetrics } from '@/hooks/useFaceAnalysis';
import { 
  calculateRealtimeFaceConfidence, 
  getScoreColor, 
  getScoreLabel,
  ConfidenceScore 
} from '@/services/confidenceScoring';
import { clsx } from 'clsx';

interface FaceAnalysisPanelProps {
  sessionId: string;
  isActive: boolean;
  onMetricsUpdate?: (metrics: FaceAnalysisMetrics, confidence: Partial<ConfidenceScore>) => void;
  compact?: boolean;
}

/**
 * FaceAnalysisPanel — Immersive real-time face analysis HUD
 * 
 * Features:
 * - Live webcam feed with face mesh overlay
 * - Real-time confidence scoring
 * - Eye contact tracking
 * - Engagement visualization
 * - Behavioral analysis display
 * - Futuristic HUD design with glassmorphism
 */
export function FaceAnalysisPanel({ 
  sessionId, 
  isActive, 
  onMetricsUpdate,
  compact = false 
}: FaceAnalysisPanelProps) {
  const {
    videoRef,
    canvasRef,
    overlayCanvasRef,
    metrics,
    history,
    isLoading,
    error,
    cameraPermission,
    start,
    stop,
  } = useFaceAnalysis(sessionId);

  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showDetails, setShowDetails] = useState(false);
  const [confidence, setConfidence] = useState<Partial<ConfidenceScore> | null>(null);
  const confidenceRef = useRef<Partial<ConfidenceScore> | null>(null);

  // Start/stop based on isActive prop
  useEffect(() => {
    if (isActive) {
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [isActive, start, stop]);

  // Calculate confidence score when metrics update
  useEffect(() => {
    if (metrics.faceDetected) {
      const newConfidence = calculateRealtimeFaceConfidence(
        metrics,
        history.sessionDuration
      );
      confidenceRef.current = newConfidence;
      setConfidence(newConfidence);
      
      if (onMetricsUpdate) {
        onMetricsUpdate(metrics, newConfidence);
      }
    }
  }, [metrics, history.sessionDuration, onMetricsUpdate]);

  // Permission denied state
  if (cameraPermission === 'denied') {
    return (
      <div className={clsx(
        "rounded-xl overflow-hidden",
        "bg-surface/80 backdrop-blur-xl",
        "border border-white/10",
        compact ? "p-4" : "p-6"
      )}>
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-white/90 font-medium">Camera Access Denied</p>
            <p className="text-white/50 text-sm mt-1">
              Please enable camera permissions to use face analysis
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={clsx(
        "rounded-xl overflow-hidden",
        "bg-surface/80 backdrop-blur-xl",
        "border border-white/10",
        compact ? "p-4" : "p-6"
      )}>
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-white/90 font-medium">Camera Error</p>
            <p className="text-white/50 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={clsx(
        "rounded-xl overflow-hidden",
        "bg-surface/80 backdrop-blur-xl",
        "border border-white/10",
        compact ? "p-4" : "p-6"
      )}>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin" />
            <Camera className="w-5 h-5 text-white/60 absolute inset-0 m-auto" />
          </div>
          <p className="text-white/70 text-sm">Initializing face analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={clsx(
        "rounded-xl overflow-hidden",
        "bg-surface/60 backdrop-blur-xl",
        "border border-white/10",
        "shadow-2xl shadow-black/20",
        compact && !isExpanded && "w-64"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-white/5 to-transparent border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={clsx(
            "w-2 h-2 rounded-full animate-pulse",
            metrics.faceDetected ? "bg-green-400" : "bg-red-400"
          )} />
          <span className="text-white/90 text-sm font-medium">Face Analysis</span>
          {metrics.faceDetected && (
            <span className="text-white/40 text-xs">{metrics.fps} FPS</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {compact && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-white/60" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white/60" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={clsx(
        "grid gap-4 p-4",
        isExpanded ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        {/* Video Feed Section */}
        <div className="relative">
          {/* Video Container */}
          <div className="relative rounded-lg overflow-hidden bg-black/40 aspect-video">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Face Detection Status Overlay */}
            <AnimatePresence>
              {!metrics.faceDetected && isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 animate-pulse mx-auto mb-3" />
                    <p className="text-white/70 text-sm">Position your face in the frame</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Eye Contact Indicator */}
            {metrics.faceDetected && (
              <div className="absolute top-3 right-3">
                <EyeContactIndicator 
                  lookingAtCamera={metrics.lookingAtCamera}
                  score={metrics.eyeContactScore}
                />
              </div>
            )}

            {/* Attention Level Badge */}
            {metrics.faceDetected && (
              <div className="absolute top-3 left-3">
                <AttentionBadge level={metrics.attentionLevel} />
              </div>
            )}
          </div>

          {/* Mini Stats Below Video */}
          {metrics.faceDetected && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MiniStat 
                label="Eye Contact"
                value={metrics.eyeContactScore}
                icon={Eye}
              />
              <MiniStat 
                label="Engagement"
                value={metrics.engagementScore}
                icon={Activity}
              />
              <MiniStat 
                label="Stability"
                value={metrics.stillnessScore}
                icon={Target}
              />
            </div>
          )}
        </div>

        {/* Analysis Panel */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Overall Confidence Score */}
            {confidence && (
              <ConfidenceMeter 
                score={confidence.overallConfidence || 0}
                status={confidence.status || 'average'}
                trend={confidence.trend || 'stable'}
              />
            )}

            {/* Detailed Metrics */}
            {metrics.faceDetected && (
              <div className="space-y-3">
                <h4 className="text-white/70 text-xs uppercase tracking-wider font-medium">
                  Behavioral Analysis
                </h4>
                
                {/* Head Movement Status */}
                <div className={clsx(
                  "p-3 rounded-lg border",
                  metrics.headStable 
                    ? "bg-green-500/10 border-green-500/30" 
                    : metrics.excessiveMovement
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-yellow-500/10 border-yellow-500/30"
                )}>
                  <div className="flex items-center gap-2">
                    {metrics.headStable ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-white/90 text-sm">
                      {metrics.headStable 
                        ? 'Head Position: Stable' 
                        : metrics.excessiveMovement 
                        ? 'Head Position: Excessive Movement'
                        : 'Head Position: Normal Movement'}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-white/50">
                    <span>Yaw: {metrics.headYaw.toFixed(1)}°</span>
                    <span>Pitch: {metrics.headPitch.toFixed(1)}°</span>
                    <span>Roll: {metrics.headRoll.toFixed(1)}°</span>
                  </div>
                </div>

                {/* Expression Analysis */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Expression</span>
                    <span className={clsx(
                      "text-sm font-medium capitalize",
                      metrics.expression === 'smile' && "text-green-400",
                      metrics.expression === 'neutral' && "text-blue-400",
                      metrics.expression === 'serious' && "text-yellow-400",
                      metrics.expression === 'concerned' && "text-orange-400"
                    )}>
                      {metrics.expression}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                      <span>Smile Intensity</span>
                      <span>{(metrics.smileIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${metrics.smileIntensity * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Nervous Movement Alert */}
                {metrics.nervousMovement > 60 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-orange-300 text-sm font-medium">
                          Elevated Movement Detected
                        </p>
                        <p className="text-white/50 text-xs mt-1">
                          Try taking deep breaths and maintaining a stable posture
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* AI Suggestions */}
            {confidence?.suggestions && confidence.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white/70 text-xs uppercase tracking-wider font-medium">
                  AI Coaching Tips
                </h4>
                <div className="space-y-2">
                  {confidence.suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
                    >
                      <Brain className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <p className="text-white/80 text-sm leading-relaxed">{suggestion}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Stats */}
            <div className="pt-3 border-t border-white/10">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-white/40">Session Duration</span>
                  <p className="text-white/90 font-medium">
                    {formatDuration(history.sessionDuration)}
                  </p>
                </div>
                <div>
                  <span className="text-white/40">Frames Analyzed</span>
                  <p className="text-white/90 font-medium">
                    {history.framesProcessed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compact View Stats */}
      {!isExpanded && metrics.faceDetected && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                (confidence?.overallConfidence || 0) >= 70 
                  ? "bg-green-500/20 text-green-400"
                  : (confidence?.overallConfidence || 0) >= 50
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
              )}>
                {Math.round(confidence?.overallConfidence || 0)}
              </div>
              <span className="text-white/70 text-sm">Confidence</span>
            </div>
            <span className={clsx(
              "text-sm font-medium",
              confidence?.status === 'excellent' && "text-green-400",
              confidence?.status === 'good' && "text-green-300",
              confidence?.status === 'average' && "text-yellow-400",
              confidence?.status === 'needs_improvement' && "text-orange-400",
              confidence?.status === 'poor' && "text-red-400"
            )}>
              {getScoreLabel(confidence?.overallConfidence || 0)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Eye Contact Indicator Component
function EyeContactIndicator({ lookingAtCamera, score }: { lookingAtCamera: boolean; score: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border",
        "backdrop-blur-md",
        lookingAtCamera 
          ? "bg-green-500/20 border-green-500/40 text-green-300"
          : score > 50
          ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
          : "bg-red-500/20 border-red-500/40 text-red-300"
      )}
    >
      <Eye className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">
        {lookingAtCamera ? 'Good Contact' : score > 50 ? 'Partial' : 'Look at Camera'}
      </span>
    </motion.div>
  );
}

// Attention Level Badge
function AttentionBadge({ level }: { level: 'high' | 'medium' | 'low' | 'distracted' }) {
  const colors = {
    high: 'bg-green-500/20 border-green-500/40 text-green-300',
    medium: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    low: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
    distracted: 'bg-red-500/20 border-red-500/40 text-red-300',
  };

  return (
    <div className={clsx(
      "px-2.5 py-1 rounded-full border text-xs font-medium capitalize",
      "backdrop-blur-md",
      colors[level]
    )}>
      {level} Attention
    </div>
  );
}

// Mini Stat Component
function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color = getScoreColor(value);
  
  return (
    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-white/40" />
        <span className="text-white/50 text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold" style={{ color }}>
          {Math.round(value)}
        </span>
        <span className="text-white/30 text-xs">/100</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

// Confidence Meter Component
function ConfidenceMeter({ 
  score, 
  status, 
  trend 
}: { 
  score: number; 
  status: string; 
  trend: 'improving' | 'stable' | 'declining';
}) {
  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-green-400' : trend === 'declining' ? 'text-red-400' : 'text-white/40';
  const statusColors: Record<string, string> = {
    excellent: 'from-green-400 to-emerald-400',
    good: 'from-green-300 to-teal-400',
    average: 'from-yellow-400 to-orange-400',
    needs_improvement: 'from-orange-400 to-red-400',
    poor: 'from-red-400 to-rose-500',
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          <span className="text-white/90 font-medium">Overall Confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon className={clsx("w-4 h-4", trendColor)} />
          <span className="text-white/50 text-sm capitalize">{trend}</span>
        </div>
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-4 mb-4">
        <div className={clsx(
          "w-20 h-20 rounded-full flex items-center justify-center",
          "bg-gradient-to-br shadow-lg",
          statusColors[status] || 'from-cyan-400 to-blue-500'
        )}>
          <span className="text-2xl font-bold text-white">{Math.round(score)}</span>
        </div>
        <div>
          <p className={clsx(
            "text-lg font-semibold capitalize",
            score >= 70 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400"
          )}>
            {status.replace('_', ' ')}
          </p>
          <p className="text-white/50 text-sm">
            {score >= 80 ? 'Outstanding performance!' : 
             score >= 60 ? 'Good job, keep practicing!' : 
             'Room for improvement detected'}
          </p>
        </div>
      </div>

      {/* Score Bar */}
      <div className="relative">
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={clsx(
              "h-full rounded-full bg-gradient-to-r",
              statusColors[status] || 'from-cyan-400 to-blue-500'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-white/40">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}

// Format duration helper
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
