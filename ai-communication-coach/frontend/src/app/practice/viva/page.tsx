'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, CheckCircle, AlertTriangle, ArrowRight, BookOpen, BrainCircuit, Sparkles, Clock } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ParticleField } from '@/components/ParticleField';

// Types matching backend API
interface VivaQuestionsResponse {
  questions: string[];
  ai_model?: string;
  processing_time_ms?: number;
}

interface VivaFeedbackResponse {
  content_quality_score: number;
  confidence_score: number;
  clarity_score: number;
  feedback: string;
  ai_model?: string;
  processing_time_ms?: number;
}

interface ApiError {
  error: string;
  message: string;
  detail?: string;
  docs_url?: string;
}

export default function VivaPracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<VivaFeedbackResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Please complete a practice session first.");
      setIsLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required. Please sign in.');
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/viva_questions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errorData: ApiError = await res.json().catch(() => ({ error: 'UNKNOWN', message: 'Unknown error' }));
          
          if (res.status === 503 && errorData.error === 'AI_SERVICE_UNAVAILABLE') {
            throw new Error(
              'AI service is not configured. Please set up your OPENAI_API_KEY to use Viva/Q&A features.'
            );
          }
          if (res.status === 400) {
            throw new Error(errorData.detail || 'No transcript available. Complete a practice session first.');
          }
          throw new Error(errorData.message || `Failed to fetch questions (${res.status})`);
        }

        const data: VivaQuestionsResponse = await res.json();
        setQuestions(data.questions);
        setAiModel(data.ai_model || null);
        setProcessingTime(data.processing_time_ms || null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [sessionId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleAudioSubmit(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript("Recording in progress... Speak clearly.");
      setFeedback(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied or unavailable. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscript("Processing audio transcription...");
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

      // 1. Transcribe Audio
      const formData = new FormData();
      formData.append('file', audioBlob, 'viva_answer.webm');

      const sttRes = await fetch(`${API_BASE}/api/v1/sessions/transcribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!sttRes.ok) {
        const errorData = await sttRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Transcription service unavailable');
      }

      const sttData = await sttRes.json();
      const spokenText = sttData.text;

      if (!spokenText || spokenText.trim().length < 10) {
        setTranscript("Could not detect speech. Please try again and speak clearly.");
        setIsProcessing(false);
        return;
      }

      setTranscript(spokenText);

      // 2. Evaluate Answer with AI
      const evalRes = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/viva_feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: questions[currentQuestionIndex],
          answer: spokenText
        })
      });

      if (!evalRes.ok) {
        const errorData: ApiError = await evalRes.json().catch(() => ({ error: 'UNKNOWN', message: 'Evaluation failed' }));
        
        if (evalRes.status === 503) {
          throw new Error('AI evaluation service temporarily unavailable. Please try again.');
        }
        throw new Error(errorData.message || 'Failed to evaluate answer');
      }

      const evalData: VivaFeedbackResponse = await evalRes.json();
      setFeedback(evalData);
      setAiModel(evalData.ai_model || aiModel);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTranscript('');
      setFeedback(null);
    } else {
      router.push('/dashboard');
    }
  };

  const retryFetch = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading AI-generated questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden selection:bg-indigo-500/30">
      <ParticleField />
      <Navbar />

      <main className="relative z-10 container mx-auto px-6 py-24 flex flex-col items-center">
        <div className="max-w-4xl w-full">

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Viva & Q&A Defense
                </h1>
                <p className="text-gray-400 mt-2">
                  Defend your ideas against AI-generated examiner questions.
                </p>
              </div>
              {aiModel && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  {aiModel}
                </div>
              )}
            </div>
            {processingTime && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                Processed in {processingTime.toFixed(0)}ms
              </div>
            )}
          </div>

          {error ? (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 backdrop-blur-xl">
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" /> Error
              </h3>
              <p className="text-sm mb-4">{error}</p>
              <button
                onClick={retryFetch}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Question Panel */}
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl flex flex-col justify-between h-[500px] shadow-[0_0_40px_rgba(99,102,241,0.05)]">
                <div>
                  <div className="flex items-center gap-3 text-indigo-400 mb-6">
                    <BrainCircuit className="w-6 h-6" />
                    <span className="font-semibold tracking-wider text-sm uppercase">AI Examiner</span>
                    <span className="ml-auto text-xs font-mono text-gray-500">
                      Q {currentQuestionIndex + 1} / {questions.length}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestionIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-2xl font-medium leading-relaxed"
                    >
                      &ldquo;{questions[currentQuestionIndex]}&rdquo;
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-12 flex flex-col items-center gap-6">
                  <div className="relative">
                    {isRecording && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"
                      />
                    )}
                    {isProcessing && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-indigo-500"
                      />
                    )}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={!!feedback || isProcessing}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                          : isProcessing
                            ? 'bg-gray-800 cursor-not-allowed'
                            : feedback
                              ? 'bg-gray-800 cursor-not-allowed opacity-50'
                              : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.3)]'
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-8 h-8 fill-current" />
                      ) : isProcessing ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-400 font-medium text-center">
                    {isRecording
                      ? "Recording your answer... Speak clearly."
                      : isProcessing
                        ? "Processing with AI..."
                        : feedback
                          ? "Answer evaluated"
                          : "Tap microphone to answer"
                    }
                  </p>
                </div>
              </div>

              {/* Feedback Panel */}
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl h-[500px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 text-pink-400 mb-6">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-semibold tracking-wider text-sm uppercase">AI Evaluation</span>
                </div>

                {transcript && !isProcessing && (
                  <div className="mb-8">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Your Answer</h4>
                    <p className="text-gray-300 text-sm italic border-l-2 border-indigo-500/30 pl-4 py-1">{transcript}</p>
                  </div>
                )}

                {feedback ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center">
                        <span className="text-3xl font-bold text-indigo-400">{Math.round(feedback.content_quality_score)}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide mt-1">Content</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center">
                        <span className="text-3xl font-bold text-purple-400">{Math.round(feedback.confidence_score)}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide mt-1">Confidence</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center">
                        <span className="text-3xl font-bold text-pink-400">{Math.round(feedback.clarity_score)}</span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide mt-1">Clarity</span>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                      <h4 className="text-sm font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> AI Coaching Feedback
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{feedback.feedback}</p>
                    </div>

                    {feedback.ai_model && (
                      <div className="text-xs text-gray-500 text-center">
                        Evaluated by {feedback.ai_model}
                        {feedback.processing_time_ms && ` • ${feedback.processing_time_ms.toFixed(0)}ms`}
                      </div>
                    )}

                    <button
                      onClick={nextQuestion}
                      className="w-full py-4 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.03)]"
                    >
                      {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Viva'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm text-center px-8">
                      {isProcessing
                        ? "AI is analyzing your response..."
                        : "Submit your verbal response to receive AI coaching feedback on your defense."
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
