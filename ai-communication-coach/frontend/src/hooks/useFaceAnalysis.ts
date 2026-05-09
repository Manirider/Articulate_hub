'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

/**
 * Comprehensive face analysis metrics for behavioral evaluation
 */
export type FaceAnalysisMetrics = {
  // Core detection
  faceDetected: boolean;
  faceConfidence: number;
  
  // Eye contact analysis
  eyeContactScore: number; // 0-100
  lookingAtCamera: boolean;
  gazeDirection: 'center' | 'left' | 'right' | 'up' | 'down';
  
  // Head pose
  headYaw: number; // degrees
  headPitch: number; // degrees
  headRoll: number; // degrees
  headStable: boolean;
  
  // Engagement metrics
  engagementScore: number; // 0-100
  attentionLevel: 'high' | 'medium' | 'low' | 'distracted';
  faceVisibleDuration: number; // seconds
  
  // Behavioral indicators
  nervousMovement: number; // 0-100 (lower is better)
  excessiveMovement: boolean;
  stillnessScore: number; // 0-100
  
  // Expression analysis
  smileIntensity: number; // 0-1
  expression: 'neutral' | 'smile' | 'serious' | 'concerned';
  confidenceIndicator: number; // 0-100
  
  // Real-time status
  fps: number;
  processingLatency: number; // ms
  lastUpdated: number; // timestamp
};

/**
 * Historical data for trend analysis
 */
export type FaceAnalysisHistory = {
  eyeContactHistory: number[];
  engagementHistory: number[];
  headMovementHistory: { yaw: number; pitch: number; timestamp: number }[];
  sessionDuration: number;
  framesProcessed: number;
};

const DEFAULT_METRICS: FaceAnalysisMetrics = {
  faceDetected: false,
  faceConfidence: 0,
  eyeContactScore: 0,
  lookingAtCamera: false,
  gazeDirection: 'center',
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  headStable: true,
  engagementScore: 0,
  attentionLevel: 'low',
  faceVisibleDuration: 0,
  nervousMovement: 0,
  excessiveMovement: false,
  stillnessScore: 100,
  smileIntensity: 0,
  expression: 'neutral',
  confidenceIndicator: 50,
  fps: 0,
  processingLatency: 0,
  lastUpdated: 0,
};

// Eye contact thresholds
const EYE_CONTACT_THRESHOLDS = {
  center: { yaw: 15, pitch: 10 }, // degrees
  weak: { yaw: 25, pitch: 20 },
};

// Head movement thresholds
const MOVEMENT_THRESHOLDS = {
  stable: 5, // degrees
  normal: 15,
  excessive: 30,
};

/**
 * useFaceAnalysis — Advanced real-time face analysis with behavioral evaluation
 * 
 * Provides:
 * - Real-time face detection and landmark tracking
 * - Eye contact scoring and gaze direction
 * - Head movement stability analysis
 * - Engagement and attention monitoring
 * - Nervous behavior detection
 * - Confidence estimation
 * - Historical trend analysis
 */
export function useFaceAnalysis(sessionId: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [metrics, setMetrics] = useState<FaceAnalysisMetrics>(DEFAULT_METRICS);
  const [history, setHistory] = useState<FaceAnalysisHistory>({
    eyeContactHistory: [],
    engagementHistory: [],
    headMovementHistory: [],
    sessionDuration: 0,
    framesProcessed: 0,
  });
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');

  // Refs for internal state
  const landmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const lastEmitRef = useRef<number>(0);
  const sessionStartTime = useRef<number>(0);
  const framesCountRef = useRef<number>(0);
  const fpsUpdateRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  
  // Movement tracking for stability analysis
  const movementBufferRef = useRef<{ yaw: number; pitch: number; roll: number; timestamp: number }[]>([]);
  const eyeContactBufferRef = useRef<number[]>([]);
  const engagementBufferRef = useRef<number[]>([]);
  const faceVisibleStartRef = useRef<number | null>(null);
  
  // Extract comprehensive metrics from face landmarks
  const extractMetrics = useCallback((landmarks: any[], timestamp: number): FaceAnalysisMetrics => {
    if (!landmarks || landmarks.length === 0) {
      return { ...DEFAULT_METRICS, lastUpdated: timestamp };
    }

    const face = landmarks[0];
    if (!face || face.length < 468) {
      return { ...DEFAULT_METRICS, lastUpdated: timestamp };
    }

    // Key landmarks
    const noseTip = face[1];
    const chin = face[152];
    const leftEyeOuter = face[33];
    const rightEyeOuter = face[263];
    const leftIris = face.length > 468 ? face[468] : null;
    const rightIris = face.length > 473 ? face[473] : null;
    const mouthLeft = face[61];
    const mouthRight = face[291];
    const upperLip = face[13];
    const lowerLip = face[14];
    const browInner = face[9];
    const leftEyeTop = face[159];
    const leftEyeBottom = face[145];

    // Calculate face center
    const faceCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const faceCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

    // ── Head Pose Estimation ──
    const headYaw = (noseTip.x - faceCenterX) * 180;
    const headPitch = (noseTip.y - faceCenterY - 0.06) * 180;
    const eyeDeltaY = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDeltaX = rightEyeOuter.x - leftEyeOuter.x;
    const headRoll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);

    // ── Eye Contact Analysis ──
    let eyeYaw = 0;
    let eyePitch = 0;
    let lookingAtCamera = false;
    let gazeDirection: 'center' | 'left' | 'right' | 'up' | 'down' = 'center';

    if (leftIris && rightIris) {
      // Calculate normalized iris position
      const leftEyeWidth = Math.abs(face[133].x - leftEyeOuter.x);
      const rightEyeWidth = Math.abs(rightEyeOuter.x - face[362].x);
      
      if (leftEyeWidth > 0.001 && rightEyeWidth > 0.001) {
        const leftIrisNormX = (leftIris.x - leftEyeOuter.x) / leftEyeWidth;
        const rightIrisNormX = (rightIris.x - face[362].x) / rightEyeWidth;
        const avgIrisX = ((leftIrisNormX + rightIrisNormX) / 2 - 0.5) * 2; // -1 to 1
        
        const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const irisYNorm = leftEyeHeight > 0.001 ? (leftIris.y - leftEyeTop.y) / leftEyeHeight : 0.5;
        const avgIrisY = (irisYNorm - 0.5) * 2; // -1 to 1

        eyeYaw = avgIrisX * 60; // degrees
        eyePitch = avgIrisY * 40; // degrees

        // Determine gaze direction
        if (Math.abs(eyeYaw) < EYE_CONTACT_THRESHOLDS.center.yaw && 
            Math.abs(eyePitch) < EYE_CONTACT_THRESHOLDS.center.pitch) {
          lookingAtCamera = true;
          gazeDirection = 'center';
        } else if (eyeYaw < -EYE_CONTACT_THRESHOLDS.center.yaw) {
          gazeDirection = 'left';
        } else if (eyeYaw > EYE_CONTACT_THRESHOLDS.center.yaw) {
          gazeDirection = 'right';
        } else if (eyePitch < -EYE_CONTACT_THRESHOLDS.center.pitch) {
          gazeDirection = 'up';
        } else if (eyePitch > EYE_CONTACT_THRESHOLDS.center.pitch) {
          gazeDirection = 'down';
        }
      }
    }

    // Calculate eye contact score (0-100)
    const eyeContactScore = lookingAtCamera ? 100 : Math.max(0, 100 - (Math.abs(eyeYaw) + Math.abs(eyePitch)) * 2);

    // ── Expression Analysis ──
    const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
    const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
    const mouthAspect = mouthWidth / Math.max(mouthHeight, 0.001);
    const smileIntensity = Math.min(1, Math.max(0, (mouthAspect - 2) / 5));
    
    let expression: 'neutral' | 'smile' | 'serious' | 'concerned' = 'neutral';
    if (smileIntensity > 0.5) expression = 'smile';
    else if (mouthAspect < 2.5 && browInner.y < faceCenterY - 0.05) expression = 'serious';
    else if (browInner.y < faceCenterY - 0.08) expression = 'concerned';

    // ── Head Stability Analysis ──
    const now = timestamp;
    movementBufferRef.current.push({ yaw: headYaw, pitch: headPitch, roll: headRoll, timestamp: now });
    // Keep only last 2 seconds of data (at 15fps = 30 frames)
    movementBufferRef.current = movementBufferRef.current.filter(m => now - m.timestamp < 2000);

    // Calculate movement variance
    const yawVariance = calculateVariance(movementBufferRef.current.map(m => m.yaw));
    const pitchVariance = calculateVariance(movementBufferRef.current.map(m => m.pitch));
    const totalVariance = yawVariance + pitchVariance;

    const headStable = totalVariance < MOVEMENT_THRESHOLDS.stable * MOVEMENT_THRESHOLDS.stable;
    const excessiveMovement = totalVariance > MOVEMENT_THRESHOLDS.excessive * MOVEMENT_THRESHOLDS.excessive;
    
    // Stillness score (0-100, higher is more still)
    const stillnessScore = Math.max(0, Math.min(100, 100 - totalVariance / 10));
    
    // Nervous movement indicator
    const nervousMovement = Math.min(100, totalVariance / 5);

    // ── Engagement Calculation ──
    // Combine eye contact, head stability, and face presence
    const eyeContactComponent = eyeContactScore * 0.4;
    const stabilityComponent = stillnessScore * 0.3;
    const presenceComponent = 30; // Base presence score
    
    const engagementScore = Math.min(100, eyeContactComponent + stabilityComponent + presenceComponent);

    // Determine attention level
    let attentionLevel: 'high' | 'medium' | 'low' | 'distracted';
    if (engagementScore > 80 && lookingAtCamera) attentionLevel = 'high';
    else if (engagementScore > 60) attentionLevel = 'medium';
    else if (engagementScore > 40) attentionLevel = 'low';
    else attentionLevel = 'distracted';

    // ── Confidence Indicator ──
    // Based on eye contact, stability, and expression
    const eyeContactConfidence = eyeContactScore * 0.4;
    const stabilityConfidence = stillnessScore * 0.35;
    const expressionConfidence = (expression === 'smile' ? 80 : expression === 'neutral' ? 70 : 50) * 0.25;
    const confidenceIndicator = eyeContactConfidence + stabilityConfidence + expressionConfidence;

    // ── Face Visible Duration ──
    if (faceVisibleStartRef.current === null) {
      faceVisibleStartRef.current = now;
    }
    const faceVisibleDuration = (now - faceVisibleStartRef.current) / 1000;

    // ── FPS Calculation ──
    framesCountRef.current++;
    const elapsed = now - lastFpsUpdateRef.current;
    let fps = metrics.fps;
    if (elapsed > 1000) {
      fps = Math.round((framesCountRef.current * 1000) / elapsed);
      framesCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }

    return {
      faceDetected: true,
      faceConfidence: 95, // MediaPipe provides high confidence
      eyeContactScore: Math.round(eyeContactScore),
      lookingAtCamera,
      gazeDirection,
      headYaw: Math.round(headYaw * 10) / 10,
      headPitch: Math.round(headPitch * 10) / 10,
      headRoll: Math.round(headRoll * 10) / 10,
      headStable,
      engagementScore: Math.round(engagementScore),
      attentionLevel,
      faceVisibleDuration: Math.round(faceVisibleDuration * 10) / 10,
      nervousMovement: Math.round(nervousMovement),
      excessiveMovement,
      stillnessScore: Math.round(stillnessScore),
      smileIntensity: Math.round(smileIntensity * 100) / 100,
      expression,
      confidenceIndicator: Math.round(confidenceIndicator),
      fps,
      processingLatency: 0,
      lastUpdated: timestamp,
    };
  }, [metrics.fps]);

  // Start face analysis
  const start = useCallback(async () => {
    if (isActive) return;
    setIsLoading(true);
    setError('');

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera access not supported in this browser');
      setCameraPermission('denied');
      setIsLoading(false);
      return;
    }

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraPermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe Face Landmarker
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      // Try GPU first, fallback to CPU
      let landmarker;
      try {
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      } catch {
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      }

      landmarkerRef.current = landmarker;
      sessionStartTime.current = performance.now();
      lastFpsUpdateRef.current = performance.now();
      
      setIsActive(true);
      setIsLoading(false);

      // Start detection loop
      const detect = () => {
        if (!videoRef.current || !landmarkerRef.current) return;

        const video = videoRef.current;
        const startTime = performance.now();

        if (video.readyState >= 2) {
          const result = landmarkerRef.current.detectForVideo(video, startTime);
          const faceMetrics = extractMetrics(result.faceLandmarks, startTime);
          
          // Calculate processing latency
          faceMetrics.processingLatency = performance.now() - startTime;
          
          setMetrics(faceMetrics);

          // Update history
          if (faceMetrics.faceDetected) {
            eyeContactBufferRef.current.push(faceMetrics.eyeContactScore);
            engagementBufferRef.current.push(faceMetrics.engagementScore);
            
            // Keep last 60 seconds of history
            if (eyeContactBufferRef.current.length > 300) {
              eyeContactBufferRef.current.shift();
            }
            if (engagementBufferRef.current.length > 300) {
              engagementBufferRef.current.shift();
            }

            setHistory(prev => ({
              eyeContactHistory: [...prev.eyeContactHistory.slice(-299), faceMetrics.eyeContactScore],
              engagementHistory: [...prev.engagementHistory.slice(-299), faceMetrics.engagementScore],
              headMovementHistory: [...prev.headMovementHistory.slice(-99), {
                yaw: faceMetrics.headYaw,
                pitch: faceMetrics.headPitch,
                timestamp: startTime
              }],
              sessionDuration: (startTime - sessionStartTime.current) / 1000,
              framesProcessed: prev.framesProcessed + 1,
            }));
          } else {
            faceVisibleStartRef.current = null;
          }

          // Emit to backend every 500ms
          const now = Date.now();
          if (now - lastEmitRef.current >= 500) {
            lastEmitRef.current = now;
            const socket = getSocket();
            socket.emit('face_analysis', {
              session_id: sessionId,
              metrics: faceMetrics,
              timestamp: now,
            });
          }

          // Draw overlays
          if (canvasRef.current && result.faceLandmarks?.[0]) {
            drawFaceMesh(canvasRef.current, result.faceLandmarks[0], video.videoWidth, video.videoHeight);
          }
          
          if (overlayCanvasRef.current && result.faceLandmarks?.[0]) {
            drawHUDOverlay(overlayCanvasRef.current, faceMetrics, video.videoWidth, video.videoHeight);
          }
        }

        animFrameRef.current = requestAnimationFrame(detect);
      };

      // Start detection after brief delay
      setTimeout(detect, 500);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera failed';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Camera access denied. Please enable camera permissions.');
        setCameraPermission('denied');
      } else if (msg.includes('NotFound')) {
        setError('No camera found. Please connect a webcam.');
      } else {
        setError(`Camera error: ${msg}`);
      }
      setIsLoading(false);
    }
  }, [isActive, sessionId, extractMetrics]);

  // Stop face analysis
  const stop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }

    // Clear buffers
    movementBufferRef.current = [];
    eyeContactBufferRef.current = [];
    engagementBufferRef.current = [];
    faceVisibleStartRef.current = null;

    setIsActive(false);
    setMetrics(DEFAULT_METRICS);
    setCameraPermission('pending');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    videoRef,
    canvasRef,
    overlayCanvasRef,
    metrics,
    history,
    isActive,
    isLoading,
    error,
    cameraPermission,
    start,
    stop,
  };
}

// Helper: Calculate variance for movement analysis
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

// Helper: Draw face mesh
function drawFaceMesh(canvas: HTMLCanvasElement, landmarks: any[], videoW: number, videoH: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = videoW;
  canvas.height = videoH;
  ctx.clearRect(0, 0, videoW, videoH);

  // Draw mesh dots
  ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
  for (let i = 0; i < landmarks.length; i += 3) {
    const lm = landmarks[i];
    ctx.beginPath();
    ctx.arc(lm.x * videoW, lm.y * videoH, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw key points with glow
  const keyPoints = [1, 33, 263, 61, 291, 13, 14, 468, 473, 152];
  ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
  ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
  ctx.shadowBlur = 8;
  
  for (const idx of keyPoints) {
    if (idx < landmarks.length) {
      const lm = landmarks[idx];
      ctx.beginPath();
      ctx.arc(lm.x * videoW, lm.y * videoH, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.shadowBlur = 0;
}

// Helper: Draw HUD overlay
function drawHUDOverlay(canvas: HTMLCanvasElement, metrics: FaceAnalysisMetrics, videoW: number, videoH: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = videoW;
  canvas.height = videoH;
  ctx.clearRect(0, 0, videoW, videoH);

  // Draw gaze direction indicator
  if (metrics.gazeDirection !== 'center') {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const centerX = videoW / 2;
    const centerY = videoH / 2;
    const arrowLength = 40;
    
    switch (metrics.gazeDirection) {
      case 'left':
        ctx.moveTo(centerX - 20, centerY);
        ctx.lineTo(centerX - 20 - arrowLength, centerY);
        break;
      case 'right':
        ctx.moveTo(centerX + 20, centerY);
        ctx.lineTo(centerX + 20 + arrowLength, centerY);
        break;
      case 'up':
        ctx.moveTo(centerX, centerY - 20);
        ctx.lineTo(centerX, centerY - 20 - arrowLength);
        break;
      case 'down':
        ctx.moveTo(centerX, centerY + 20);
        ctx.lineTo(centerX, centerY + 20 + arrowLength);
        break;
    }
    ctx.stroke();
  }

  // Draw face bounding box with eye contact status
  const boxColor = metrics.lookingAtCamera 
    ? 'rgba(34, 197, 94, 0.6)' // Green for good eye contact
    : metrics.eyeContactScore > 50
    ? 'rgba(234, 179, 8, 0.6)' // Yellow for partial
    : 'rgba(239, 68, 68, 0.6)'; // Red for poor

  ctx.strokeStyle = boxColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(videoW * 0.2, videoH * 0.15, videoW * 0.6, videoH * 0.7);
  
  // Corner brackets for futuristic look
  const cornerSize = 20;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(videoW * 0.2, videoH * 0.15 + cornerSize);
  ctx.lineTo(videoW * 0.2, videoH * 0.15);
  ctx.lineTo(videoW * 0.2 + cornerSize, videoH * 0.15);
  // Top-right
  ctx.moveTo(videoW * 0.8 - cornerSize, videoH * 0.15);
  ctx.lineTo(videoW * 0.8, videoH * 0.15);
  ctx.lineTo(videoW * 0.8, videoH * 0.15 + cornerSize);
  // Bottom-left
  ctx.moveTo(videoW * 0.2, videoH * 0.85 - cornerSize);
  ctx.lineTo(videoW * 0.2, videoH * 0.85);
  ctx.lineTo(videoW * 0.2 + cornerSize, videoH * 0.85);
  // Bottom-right
  ctx.moveTo(videoW * 0.8 - cornerSize, videoH * 0.85);
  ctx.lineTo(videoW * 0.8, videoH * 0.85);
  ctx.lineTo(videoW * 0.8, videoH * 0.85 - cornerSize);
  ctx.stroke();
}
