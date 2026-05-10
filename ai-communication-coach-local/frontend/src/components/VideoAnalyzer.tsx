"use client";
import React, { useEffect, useRef, useState } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";

interface VideoAnalyzerProps {
  onFocusUpdate: (focusScore: number) => void;
  isActive: boolean;
}

export default function VideoAnalyzer({ onFocusUpdate, isActive }: VideoAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(false);

  // Tracking metrics
  const totalFramesRef = useRef(0);
  const framesWithFaceRef = useRef(0);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const faceDetection = new FaceDetection({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
    });

    faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5
    });

    faceDetection.onResults((results) => {
      const canvasCtx = canvasRef.current?.getContext('2d');
      if (!canvasCtx || !canvasRef.current || !videoRef.current) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video stream
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      totalFramesRef.current += 1;

      if (results.detections.length > 0) {
        setIsFaceDetected(true);
        framesWithFaceRef.current += 1;
        
        // Draw bounding box for visual feedback
        for (const detection of results.detections) {
          const boundingBox = detection.boundingBox;
          const rectX = boundingBox.xCenter * canvasRef.current.width - (boundingBox.width * canvasRef.current.width) / 2;
          const rectY = boundingBox.yCenter * canvasRef.current.height - (boundingBox.height * canvasRef.current.height) / 2;
          const rectW = boundingBox.width * canvasRef.current.width;
          const rectH = boundingBox.height * canvasRef.current.height;

          canvasCtx.beginPath();
          canvasCtx.rect(rectX, rectY, rectW, rectH);
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = '#4ade80'; // Green when focused
          canvasCtx.stroke();
        }
      } else {
        setIsFaceDetected(false);
        // Red border to indicate lost focus
        canvasCtx.beginPath();
        canvasCtx.rect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.lineWidth = 10;
        canvasCtx.strokeStyle = '#ef4444'; 
        canvasCtx.stroke();
      }
      canvasCtx.restore();

      // Update parent periodically
      if (totalFramesRef.current % 30 === 0) {
        const score = (framesWithFaceRef.current / totalFramesRef.current) * 100;
        onFocusUpdate(score);
      }
    });

    let camera: Camera | null = null;
    
    try {
      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await faceDetection.send({ image: videoRef.current });
          }
        },
        width: 320,
        height: 240
      });
      camera.start();
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setHasCameraError(true);
    }

    return () => {
      if (camera) camera.stop();
      faceDetection.close();
    };
  }, [isActive, onFocusUpdate]);

  if (hasCameraError) {
    return (
      <div className="w-[320px] h-[240px] bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700 text-center p-4">
        <p className="text-gray-400 text-sm">Camera access required for Video Focus tracking.</p>
      </div>
    );
  }

  return (
    <div className="relative w-[320px] h-[240px] rounded-xl overflow-hidden border-2 transition-colors duration-300 shadow-lg mb-6 mx-auto bg-black"
         style={{ borderColor: isFaceDetected ? '#4ade80' : '#ef4444' }}>
      
      {/* Hidden Video Tag required by MediaPipe */}
      <video ref={videoRef} className="hidden" playsInline></video>
      
      {/* The actual canvas rendering the video and bounding boxes */}
      <canvas ref={canvasRef} className="w-full h-full object-cover transform scale-x-[-1]"></canvas>

      <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs font-bold font-mono">
        {isFaceDetected ? <span className="text-green-400">FOCUS ALIGNED</span> : <span className="text-red-400">FOCUS LOST</span>}
      </div>
    </div>
  );
}
