"use client";
import { useState, useRef } from "react";
import { API_ENDPOINTS } from "@/lib/api";

interface AudioRecorderProps {
  onPipelineComplete: (transcript: string, evaluation: any, audioUrl: string) => void;
  onError: (error: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onStreamUpdate?: (chunk: string) => void;
  focusScore?: number;
}

export default function AudioRecorder({ onPipelineComplete, onError, onRecordingStateChange, onStreamUpdate, focusScore = 0 }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        audioChunks.current = [];
        
        if (audioBlob.size === 0) {
           onError("Audio recording was empty. Please try again.");
           return;
        }

        setProcessing(true);
        try {
          const token = localStorage.getItem("token");
          
          // STEP 1: Transcribe
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const transcribeRes = await fetch(API_ENDPOINTS.transcribe, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
          });
          
          if (!transcribeRes.ok) throw new Error("Transcription failed");
          const { transcript } = await transcribeRes.json();

          // STEP 2: Evaluate via Stream
          const evalRes = await fetch(API_ENDPOINTS.evaluateStream, {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              transcript: transcript,
              module_type: "Interview",
              focus_score: focusScore
            })
          });

          if (!evalRes.ok || !evalRes.body) throw new Error("Stream failed");

          const reader = evalRes.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let fullJsonResponse = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunkText = decoder.decode(value, { stream: true });
            const events = chunkText.split("\n\n");
            
            for (const event of events) {
              if (event.startsWith("data: ")) {
                const dataStr = event.replace("data: ", "");
                try {
                  const data = JSON.parse(dataStr);
                  if (data.chunk) {
                    fullJsonResponse += data.chunk;
                    if (onStreamUpdate) onStreamUpdate(fullJsonResponse);
                  }
                  if (data.status === "complete") {
                    try {
                      const finalJson = JSON.parse(fullJsonResponse);
                      onPipelineComplete(transcript, finalJson, ""); // TTS bypassed for stream mode
                    } catch (e) {
                      console.error("Final parse error:", e);
                      onError("Failed to parse AI evaluation.");
                    }
                  }
                  if (data.error) throw new Error(data.error);
                } catch (e) {
                   // ignoring mid-chunk parse errors on fragmented events
                }
              }
            }
          }

        } catch (error: any) {
          console.error("Pipeline error", error);
          onError(error.message || "Failed to process audio.");
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorder.current.start();
      setRecording(true);
      if (onRecordingStateChange) onRecordingStateChange(true);
    } catch (err) {
      onError("Microphone access denied or not available. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (onRecordingStateChange) onRecordingStateChange(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <button 
        onClick={recording ? stopRecording : startRecording} 
        disabled={processing}
        className={`px-8 py-4 rounded-full text-xl font-bold transition-all shadow-lg ${
          processing ? 'bg-purple-600 cursor-wait animate-pulse' :
          recording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {processing ? "AI is Typing..." : recording ? "Stop Recording" : "Start Practice Session"}
      </button>
    </div>
  );
}
