"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import ScoreCard from "@/components/ScoreCard";
import AvatarUI from "@/components/AvatarUI";
import VideoAnalyzer from "@/components/VideoAnalyzer";

export default function ModulePage() {
  const [transcript, setTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [focusScore, setFocusScore] = useState(0);
  const [streamText, setStreamText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePipelineComplete = (userTranscript: string, evalData: any, resultAudioUrl: string) => {
    setTranscript(userTranscript);
    setEvaluation(evalData);
    setAudioUrl(resultAudioUrl);
    setStreamText(""); // Clear stream once done
    setErrorMsg("");
    
    if (audioRef.current) {
      audioRef.current.src = resultAudioUrl;
      audioRef.current.play().catch(e => console.error("Auto-play blocked:", e));
    }
  };

  const handleError = (msg: string) => {
    setErrorMsg(msg);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsSpeaking(true);
    const handleEnded = () => setIsSpeaking(false);
    const handlePause = () => setIsSpeaking(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl]);

  return (
    <div className="min-h-screen p-8 md:p-16 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <Link href="/dashboard" className="text-gray-400 hover:text-white mb-8 inline-block transition-colors">
          ← Back to Dashboard
        </Link>
        
        <div className="glass-panel w-full p-10 shadow-2xl relative overflow-hidden">
          <h1 className="text-4xl font-extrabold mb-2 text-white text-center">Live Practice Session</h1>
          
          <AvatarUI isSpeaking={isSpeaking} />

          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-8 text-center">
              ⚠️ {errorMsg}
            </div>
          )}

          {isRecording && (
            <div className="mb-6 flex justify-center animate-fade-in">
              <VideoAnalyzer isActive={isRecording} onFocusUpdate={setFocusScore} />
            </div>
          )}

          <div className="mb-10 flex justify-center py-8">
            <AudioRecorder 
              onPipelineComplete={handlePipelineComplete} 
              onError={handleError} 
              onRecordingStateChange={setIsRecording}
              onStreamUpdate={setStreamText}
              focusScore={focusScore}
            />
          </div>

          {streamText && !evaluation && (
            <div className="mt-8 p-6 bg-slate-900 border border-purple-500 rounded-xl shadow-lg animate-fade-in text-left">
              <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2 animate-pulse">
                <span>🤖</span> AI is analyzing your response...
              </h3>
              <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
                {streamText}
              </pre>
            </div>
          )}

          {evaluation && (
            <div className="mt-8 space-y-6 animate-fade-in">
              {/* Scores Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <ScoreCard title="Confidence" score={evaluation.scores?.confidence || 0} color="text-blue-500" />
                <ScoreCard title="Clarity" score={evaluation.scores?.clarity || 0} color="text-purple-500" />
                <ScoreCard title="Content" score={evaluation.scores?.content || 0} color="text-pink-500" />
                <ScoreCard title="Delivery" score={evaluation.scores?.delivery || 0} color="text-indigo-500" />
              </div>

              {/* Feedback Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-green-500/30">
                  <h3 className="text-xl font-bold mb-3 text-green-400 flex items-center gap-2"><span>✨</span> Strengths</h3>
                  <p className="text-gray-300">{evaluation.strengths}</p>
                </div>
                
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-red-500/30">
                  <h3 className="text-xl font-bold mb-3 text-red-400 flex items-center gap-2"><span>📈</span> Weaknesses</h3>
                  <p className="text-gray-300">{evaluation.weaknesses}</p>
                </div>
                
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-yellow-500/30 md:col-span-2">
                  <h3 className="text-xl font-bold mb-3 text-yellow-400 flex items-center gap-2"><span>💡</span> Actionable Suggestions</h3>
                  <p className="text-gray-300">{evaluation.suggestions}</p>
                </div>
              </div>

              {/* Summary / Transcript Row */}
              <div className="p-8 bg-indigo-900/40 rounded-2xl border border-indigo-500/50 shadow-inner mt-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="text-3xl">🎙️</span> 
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Your Transcript</span>
                </h3>
                <p className="mb-6 text-gray-300 italic">"{transcript}"</p>
                
                <hr className="border-indigo-500/30 my-6" />
                
                <h3 className="text-xl font-bold mb-2 text-indigo-300">Coach Summary (Audio Response)</h3>
                <p className="text-white text-lg leading-relaxed font-medium">{evaluation.summary}</p>
              </div>
            </div>
          )}
          
          <audio ref={audioRef} className="hidden" controls />
        </div>
      </div>
    </div>
  );
}
