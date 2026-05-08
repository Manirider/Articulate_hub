'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

/**
 * MediaPipe Face Landmark metrics extracted per frame.
 */
export type FaceMetrics = {
  eye_yaw: number;
  eye_pitch: number;
  head_yaw: number;
  head_pitch: number;
  head_roll: number;
  smile_prob: number;
  brow_inner_up: number;
  faceDetected: boolean;
};

const DEFAULT_METRICS: FaceMetrics = {
  eye_yaw: 0,
  eye_pitch: 0,
  head_yaw: 0,
  head_pitch: 0,
  head_roll: 0,
  smile_prob: 0.5,
  brow_inner_up: 0,
  faceDetected: false,
};

/**
 * useMediaPipe — Custom hook for real-time face analysis.
 *
 * Initializes MediaPipe FaceLandmarker in the browser (WASM), captures
 * webcam frames at ~15fps, extracts face metrics (gaze, head pose,
 * expression), and emits them via Socket.IO every 500ms.
 */
export function useMediaPipe(sessionId: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState<FaceMetrics>(DEFAULT_METRICS);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const landmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const startupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Extract metrics from 478 face landmarks ──────────────────────────

  const extractMetrics = useCallback((landmarks: any[]): FaceMetrics => {
    if (!landmarks || landmarks.length === 0) {
      return { ...DEFAULT_METRICS, faceDetected: false };
    }

    const face = landmarks[0]; // Use first detected face
    if (!face || face.length < 468) {
      return { ...DEFAULT_METRICS, faceDetected: false };
    }

    // Key landmark indices (MediaPipe Face Mesh 478-point topology):
    // Nose tip: 1, Chin: 152, Left eye outer: 33, Right eye outer: 263
    // Left iris: 468, Right iris: 473
    // Mouth corners: 61 (left), 291 (right)
    // Upper lip: 13, Lower lip: 14
    // Inner brow: 9 (top of forehead area)

    const noseTip = face[1];
    const chin = face[152];
    const leftEyeOuter = face[33];
    const rightEyeOuter = face[263];

    // ── Head Pose (simplified Euler angle estimation) ──
    // Use nose tip position relative to face center as proxy
    const faceCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const faceCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

    // Yaw: nose tip lateral offset from eye center (degrees approx)
    const headYaw = (noseTip.x - faceCenterX) * 180;
    // Pitch: nose tip vertical offset from eye center
    const headPitch = (noseTip.y - faceCenterY - 0.06) * 180;
    // Roll: angle between eyes
    const eyeDeltaY = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDeltaX = rightEyeOuter.x - leftEyeOuter.x;
    const headRoll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);

    // ── Eye Gaze (iris position relative to eye corners) ──
    let eyeYaw = 0;
    let eyePitch = 0;
    if (face.length > 473) {
      const leftIris = face[468];
      const rightIris = face[473];
      const leftEyeInner = face[133];
      const rightEyeInner = face[362];

      // Normalized iris position within eye socket
      const leftEyeWidth = Math.abs(leftEyeInner.x - leftEyeOuter.x);
      const rightEyeWidth = Math.abs(rightEyeOuter.x - rightEyeInner.x);

      if (leftEyeWidth > 0.001 && rightEyeWidth > 0.001) {
        const leftIrisNorm = (leftIris.x - leftEyeOuter.x) / leftEyeWidth;
        const rightIrisNorm = (rightIris.x - rightEyeInner.x) / rightEyeWidth;
        const avgIrisX = (leftIrisNorm + rightIrisNorm) / 2;
        eyeYaw = (avgIrisX - 0.5) * 60; // Map to degrees

        // Vertical gaze
        const leftEyeTop = face[159];
        const leftEyeBottom = face[145];
        const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        if (leftEyeHeight > 0.001) {
          const irisYNorm = (leftIris.y - leftEyeTop.y) / leftEyeHeight;
          eyePitch = (irisYNorm - 0.5) * 40;
        }
      }
    }

    // ── Expression: Smile probability ──
    const mouthLeft = face[61];
    const mouthRight = face[291];
    const upperLip = face[13];
    const lowerLip = face[14];
    const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
    const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
    const mouthAspect = mouthWidth / Math.max(mouthHeight, 0.001);
    // Smile: wide mouth with moderate opening → aspect ratio > 4
    const smileProb = Math.min(1.0, Math.max(0, (mouthAspect - 2) / 5));

    // ── Expression: Brow raise ──
    const browInner = face[9]; // Forehead center / inner brow approx
    const browBaseline = faceCenterY;
    const browInnerUp = Math.max(0, (browBaseline - browInner.y) * 10);

    return {
      eye_yaw: Math.round(eyeYaw * 10) / 10,
      eye_pitch: Math.round(eyePitch * 10) / 10,
      head_yaw: Math.round(headYaw * 10) / 10,
      head_pitch: Math.round(headPitch * 10) / 10,
      head_roll: Math.round(headRoll * 10) / 10,
      smile_prob: Math.round(smileProb * 100) / 100,
      brow_inner_up: Math.round(browInnerUp * 100) / 100,
      faceDetected: true,
    };
  }, []);

  // ── Start MediaPipe + Webcam ──────────────────────────────────────────

  const start = useCallback(async () => {
    if (isActive) return;
    setIsLoading(true);
    setError('');

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera analysis is not supported in this browser.');
      setIsLoading(false);
      return;
    }

    try {
      // Dynamically import MediaPipe (heavy WASM bundle)
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      let landmarker;
      try {
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      } catch {
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      }

      landmarkerRef.current = landmarker;

      // Start webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setIsLoading(false);

      // Start detection loop
      const detect = () => {
        if (!videoRef.current || !landmarkerRef.current) return;

        const video = videoRef.current;
        if (video.readyState >= 2) {
          const result = landmarkerRef.current.detectForVideo(video, performance.now());
          const faceMetrics = extractMetrics(result.faceLandmarks);
          setMetrics(faceMetrics);

          // Emit via Socket.IO every 500ms
          const now = Date.now();
          if (now - lastEmitRef.current >= 500 && faceMetrics.faceDetected) {
            lastEmitRef.current = now;
            const socket = getSocket();
            socket.emit('vision_metrics', {
              session_id: sessionId,
              ...faceMetrics,
            });
          }

          // Draw face mesh overlay on canvas (optional visual feedback)
          if (canvasRef.current && result.faceLandmarks?.[0]) {
            drawFaceMesh(canvasRef.current, result.faceLandmarks[0], video.videoWidth, video.videoHeight);
          }
        }

        animFrameRef.current = requestAnimationFrame(detect);
      };

      // Small delay to let video initialize
      startupTimeoutRef.current = setTimeout(detect, 200);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start camera';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Camera access denied. Enable camera in browser settings.');
      } else {
        setError(msg);
      }
      setIsLoading(false);
    }
  }, [isActive, sessionId, extractMetrics]);

  // ── Stop MediaPipe + Webcam ──────────────────────────────────────────

  const stop = useCallback(() => {
    if (startupTimeoutRef.current) {
      clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }

    setIsActive(false);
    setMetrics(DEFAULT_METRICS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, canvasRef, metrics, isActive, isLoading, error, start, stop };
}

// ── Helper: Draw face mesh overlay ──────────────────────────────────────

function drawFaceMesh(canvas: HTMLCanvasElement, landmarks: any[], videoW: number, videoH: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = videoW;
  canvas.height = videoH;
  ctx.clearRect(0, 0, videoW, videoH);

  // Draw subtle face mesh dots
  ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
  for (let i = 0; i < landmarks.length; i += 3) {
    const lm = landmarks[i];
    ctx.beginPath();
    ctx.arc(lm.x * videoW, lm.y * videoH, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Highlight key landmarks (eyes, nose, mouth) with brighter dots
  const keyPoints = [1, 33, 263, 61, 291, 13, 14, 468, 473];
  ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
  for (const idx of keyPoints) {
    if (idx < landmarks.length) {
      const lm = landmarks[idx];
      ctx.beginPath();
      ctx.arc(lm.x * videoW, lm.y * videoH, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
