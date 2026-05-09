'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Play, 
  Square, 
  Settings, 
  Info,
  BarChart3,
  Activity,
  Eye,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { FaceAnalysisPanel } from '@/components/FaceAnalysisPanel';
import { FaceAnalysisMetrics } from '@/hooks/useFaceAnalysis';
import { ConfidenceScore } from '@/services/confidenceScoring';
import { clsx } from 'clsx';

/**
 * Face Analysis Demo Page
 * 
 * A comprehensive testing and demonstration page for the real-time
 * face analysis system with behavioral evaluation and confidence scoring.
 */
export default function FaceAnalysisDemoPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionId] = useState(`demo-${Date.now()}`);
  const [currentMetrics, setCurrentMetrics] = useState<FaceAnalysisMetrics | null>(null);
  const [currentConfidence, setCurrentConfidence] = useState<Partial<ConfidenceScore> | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleMetricsUpdate = useCallback((metrics: FaceAnalysisMetrics, confidence: Partial<ConfidenceScore>) => {
    setCurrentMetrics(metrics);
    setCurrentConfidence(confidence);
  }, []);

  const startAnalysis = () => {
    setIsAnalyzing(true);
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-sm font-medium">AI-Powered Face Analysis</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Real-Time Behavioral Analysis
          </h1>
          
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Experience our advanced face analysis system with eye contact tracking, 
            engagement monitoring, and confidence scoring powered by MediaPipe.
          </p>
        </motion.div>

        {/* Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-8"
        >
          {!isAnalyzing ? (
            <button
              onClick={startAnalysis}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
                "bg-gradient-to-r from-cyan-500 to-blue-500",
                "hover:from-cyan-400 hover:to-blue-400",
                "transition-all duration-300 shadow-lg shadow-cyan-500/25",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Play className="w-5 h-5" />
              Start Analysis
            </button>
          ) : (
            <button
              onClick={stopAnalysis}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
                "bg-gradient-to-r from-red-500 to-rose-500",
                "hover:from-red-400 hover:to-rose-400",
                "transition-all duration-300 shadow-lg shadow-red-500/25"
              )}
            >
              <Square className="w-5 h-5" />
              Stop Analysis
            </button>
          )}

          <button
            onClick={() => setShowDebug(!showDebug)}
            className={clsx(
              "flex items-center gap-2 px-4 py-3 rounded-xl font-medium",
              "bg-white/5 border border-white/10",
              "hover:bg-white/10 transition-all duration-300",
              showDebug && "bg-cyan-500/20 border-cyan-500/40"
            )}
          >
            <Settings className="w-5 h-5" />
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Face Analysis Panel */}
          <div className="lg:col-span-2">
            <FaceAnalysisPanel
              sessionId={sessionId}
              isActive={isAnalyzing}
              onMetricsUpdate={handleMetricsUpdate}
              compact={false}
            />
          </div>

          {/* Side Panel - Stats & Info */}
          <div className="space-y-6">
            {/* Analysis Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl bg-surface/60 backdrop-blur-xl border border-white/10"
            >
              <h3 className="flex items-center gap-2 text-white/90 font-semibold mb-4">
                <Activity className="w-5 h-5 text-cyan-400" />
                Analysis Status
              </h3>
              
              <div className="space-y-3">
                <StatusItem
                  label="Camera"
                  status={isAnalyzing ? 'active' : 'inactive'}
                  icon={Camera}
                />
                <StatusItem
                  label="Face Detection"
                  status={currentMetrics?.faceDetected ? 'active' : isAnalyzing ? 'waiting' : 'inactive'}
                  icon={Eye}
                />
                <StatusItem
                  label="Confidence Scoring"
                  status={currentConfidence ? 'active' : 'inactive'}
                  icon={Brain}
                />
                <StatusItem
                  label="Data Quality"
                  status={currentConfidence?.dataQuality === 'high' ? 'excellent' : currentConfidence?.dataQuality === 'medium' ? 'active' : 'warning'}
                  icon={BarChart3}
                />
              </div>
            </motion.div>

            {/* Quick Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20"
            >
              <h3 className="flex items-center gap-2 text-white/90 font-semibold mb-4">
                <Info className="w-5 h-5 text-cyan-400" />
                How It Works
              </h3>
              
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Tracks 478 facial landmarks in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Measures eye contact and gaze direction</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Detects head movement and stability</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Calculates engagement and confidence</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Provides AI coaching suggestions</span>
                </li>
              </ul>
            </motion.div>

            {/* Performance Metrics */}
            {currentMetrics && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-5 rounded-xl bg-surface/60 backdrop-blur-xl border border-white/10"
              >
                <h3 className="text-white/90 font-semibold mb-4">Performance</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-white/40 text-xs">FPS</span>
                    <p className="text-white/90 text-lg font-semibold">{currentMetrics.fps}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <span className="text-white/40 text-xs">Latency</span>
                    <p className="text-white/90 text-lg font-semibold">
                      {currentMetrics.processingLatency.toFixed(1)}ms
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Debug Panel */}
        {showDebug && currentMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-xl bg-black/40 border border-white/10"
          >
            <h3 className="flex items-center gap-2 text-white/90 font-semibold mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Debug Information
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white/50 text-sm mb-2">Face Metrics</h4>
                <pre className="text-xs text-green-400/80 bg-black/40 p-4 rounded-lg overflow-auto max-h-64">
                  {JSON.stringify(currentMetrics, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-white/50 text-sm mb-2">Confidence Score</h4>
                <pre className="text-xs text-cyan-400/80 bg-black/40 p-4 rounded-lg overflow-auto max-h-64">
                  {JSON.stringify(currentConfidence, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scoring Formula Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 p-6 rounded-xl bg-gradient-to-br from-surface/80 to-surface/40 backdrop-blur-xl border border-white/10"
        >
          <h3 className="text-white/90 font-semibold mb-4">Confidence Scoring Formula</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <span className="text-white/90 font-medium">Face Analysis (40%)</span>
              </div>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• Eye Contact: 35%</li>
                <li>• Engagement: 30%</li>
                <li>• Stability: 20%</li>
                <li>• Expression: 15%</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <span className="text-white/90 font-medium">Voice Analysis (40%)</span>
              </div>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• Clarity: 30%</li>
                <li>• Pace: 25%</li>
                <li>• Tone: 25%</li>
                <li>• Filler Words: 20%</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-green-400" />
                <span className="text-white/90 font-medium">Content Analysis (20%)</span>
              </div>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• Structure: 40%</li>
                <li>• Relevance: 35%</li>
                <li>• Vocabulary: 25%</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-cyan-300 text-sm text-center">
              <strong>Final Confidence = 0.4 × Face + 0.4 × Voice + 0.2 × Content</strong>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Status Item Component
function StatusItem({ 
  label, 
  status, 
  icon: Icon 
}: { 
  label: string; 
  status: 'active' | 'inactive' | 'waiting' | 'excellent' | 'warning';
  icon: React.ElementType;
}) {
  const colors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/40',
    inactive: 'bg-white/5 text-white/40 border-white/10',
    waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    excellent: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    warning: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  };

  const labels = {
    active: 'Active',
    inactive: 'Inactive',
    waiting: 'Waiting...',
    excellent: 'Excellent',
    warning: 'Low Quality',
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-white/50" />
        <span className="text-white/70 text-sm">{label}</span>
      </div>
      <span className={clsx(
        "px-2.5 py-1 rounded-full text-xs font-medium border",
        colors[status]
      )}>
        {labels[status]}
      </span>
    </div>
  );
}
