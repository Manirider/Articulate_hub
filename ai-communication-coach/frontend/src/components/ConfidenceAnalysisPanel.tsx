'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Eye, Activity, Mic, FileText, Brain } from 'lucide-react';
import type { FaceMetrics } from '@/hooks/useMediaPipe';
import type { VoiceAnalysisMetrics } from '@/hooks/useVoiceAnalysis';

/**
 * Multi-modal fusion result from the backend.
 */
export type MultiModalResult = {
  confidence_score: number;      // 0-10
  eye_contact: string;
  head_movement: string;
  voice_stability: string;
  engagement: string;
  face_score: number;
  voice_score: number;
  content_score: number;
  suggestions: string[];
  active_signals: string[];
};

type Props = {
  // Webcam state
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cameraActive: boolean;
  cameraLoading: boolean;
  cameraError: string;
  onToggleCamera: () => void;
  faceMetrics: FaceMetrics;

  // Voice state
  voiceMetrics: VoiceAnalysisMetrics;

  // Fused result from backend
  multiModalResult: MultiModalResult | null;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  good: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Good' },
  stable: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Stable' },
  strong: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Strong' },
  high: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'High' },
  moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Moderate' },
  needs_improvement: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', label: 'Needs Work' },
  unstable: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', label: 'Unstable' },
  weak: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', label: 'Weak' },
  low: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', label: 'Low' },
  unavailable: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-600', label: 'N/A' },
};

function getStatusStyle(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.moderate;
}

export function ConfidenceAnalysisPanel({
  videoRef,
  canvasRef,
  cameraActive,
  cameraLoading,
  cameraError,
  onToggleCamera,
  faceMetrics,
  voiceMetrics,
  multiModalResult,
}: Props) {
  const gaugeRef = useRef<HTMLCanvasElement>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  const score = multiModalResult?.confidence_score ?? 0;

  // Animate score changes smoothly
  useEffect(() => {
    const diff = score - animatedScore;
    if (Math.abs(diff) < 0.05) {
      setAnimatedScore(score);
      return;
    }
    const timer = setTimeout(() => {
      setAnimatedScore((prev) => prev + diff * 0.15);
    }, 30);
    return () => clearTimeout(timer);
  }, [score, animatedScore]);

  // Draw confidence gauge
  useEffect(() => {
    if (!gaugeRef.current) return;
    drawGauge(gaugeRef.current, animatedScore);
  }, [animatedScore]);

  const r = multiModalResult;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-violet-400" />
          Confidence Analysis
        </h3>
        <div className="flex items-center gap-1.5">
          {(r?.active_signals ?? []).includes('camera') && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Camera active" />
          )}
          {(r?.active_signals ?? []).includes('microphone') && (
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" title="Microphone active" />
          )}
          {(r?.active_signals ?? []).includes('transcript') && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Transcript active" />
          )}
        </div>
      </div>

      {/* Webcam Preview */}
      <div className="px-5 pb-3">
        <div className="relative rounded-xl overflow-hidden bg-slate-900/80 border border-slate-700/30">
          {cameraActive ? (
            <div className="relative" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror-video"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Face detection indicator */}
              <div className={`absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                faceMetrics.faceDetected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${faceMetrics.faceDetected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                {faceMetrics.faceDetected ? 'Face Detected' : 'No Face'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-600">
              <CameraOff className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Camera not active</p>
            </div>
          )}

          {/* Camera toggle */}
          <button
            onClick={onToggleCamera}
            disabled={cameraLoading}
            className={`absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              cameraActive
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
            } ${cameraLoading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {cameraLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : cameraActive ? (
              <><CameraOff className="h-3 w-3" /> Stop</>
            ) : (
              <><Camera className="h-3 w-3" /> Enable</>
            )}
          </button>
        </div>

        {cameraError && (
          <p className="mt-1.5 text-[10px] text-rose-400">{cameraError}</p>
        )}
      </div>

      {/* Confidence Gauge */}
      <div className="px-5 pb-3 flex flex-col items-center">
        <div className="relative">
          <canvas ref={gaugeRef} width={160} height={100} className="w-40 h-[100px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-2xl font-bold gradient-text tabular-nums">{animatedScore.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 -mt-0.5">/ 10.0</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-2">
        <MetricCard
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Eye Contact"
          status={r?.eye_contact ?? 'unavailable'}
        />
        <MetricCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Head Movement"
          status={r?.head_movement ?? 'unavailable'}
        />
        <MetricCard
          icon={<Mic className="h-3.5 w-3.5" />}
          label="Voice"
          status={r?.voice_stability ?? 'unavailable'}
        />
        <MetricCard
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Engagement"
          status={r?.engagement ?? 'unavailable'}
        />
      </div>

      {/* Signal Bars */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <SignalBar label="Face" value={r?.face_score ?? 0} color="violet" />
          <SignalBar label="Voice" value={r?.voice_score ?? 0} color="cyan" />
          <SignalBar label="Content" value={r?.content_score ?? 0} color="amber" />
        </div>
      </div>

      {/* Suggestions */}
      {r && r.suggestions.length > 0 && (
        <div className="px-5 pb-5">
          <div className="rounded-xl bg-slate-800/40 border border-slate-700/20 p-3">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1.5">💡 Suggestions</p>
            <ul className="space-y-1">
              {r.suggestions.map((s, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <span className="text-violet-500 mt-0.5 flex-shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function MetricCard({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  const style = getStatusStyle(status);
  return (
    <div className={`rounded-xl ${style.bg} border border-slate-700/20 p-2.5 transition-all duration-500`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={style.text}>{icon}</span>
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
      </div>
    </div>
  );
}

function SignalBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-500',
    cyan: 'bg-cyan-500',
    amber: 'bg-amber-500',
  };
  const barColor = colorMap[color] || 'bg-slate-500';
  const width = Math.min(100, Math.max(0, value));

  return (
    <div className="flex-1">
      <div className="flex justify-between mb-0.5">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-1 rounded-full bg-slate-700/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ── Gauge Drawing ──────────────────────────────────────────────────────

function drawGauge(canvas: HTMLCanvasElement, score: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h - 8;
  const radius = 65;
  const lineWidth = 8;

  ctx.clearRect(0, 0, w, h);

  // Background arc (grey)
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Filled arc (gradient based on score)
  const fraction = Math.min(1, Math.max(0, score / 10));
  const filledEnd = startAngle + fraction * Math.PI;

  const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
  gradient.addColorStop(0, '#f43f5e');     // rose
  gradient.addColorStop(0.35, '#f59e0b');  // amber
  gradient.addColorStop(0.65, '#06b6d4');  // cyan
  gradient.addColorStop(1, '#10b981');     // emerald

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, filledEnd);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Glow effect
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, filledEnd);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = lineWidth + 4;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.15;
  ctx.stroke();
  ctx.globalAlpha = 1;
}
