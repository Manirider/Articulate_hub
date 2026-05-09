/**
 * Confidence Scoring Engine
 * 
 * Multi-modal fusion combining:
 * - Face Analysis (40%): Eye contact, engagement, stability
 * - Voice Analysis (40%): Tone, pace, filler words
 * - Content Analysis (20%): Speech clarity, structure
 * 
 * Final Confidence = 0.4 * Face + 0.4 * Voice + 0.2 * Content
 */

import { FaceAnalysisMetrics } from '@/hooks/useFaceAnalysis';

// Score configuration
export const SCORE_WEIGHTS = {
  face: 0.4,
  voice: 0.4,
  content: 0.2,
};

// Individual metric weights within each category
export const FACE_METRIC_WEIGHTS = {
  eyeContact: 0.35,
  engagement: 0.30,
  stability: 0.20,
  expression: 0.15,
};

export const VOICE_METRIC_WEIGHTS = {
  clarity: 0.30,
  pace: 0.25,
  tone: 0.25,
  fillerWords: 0.20,
};

export const CONTENT_METRIC_WEIGHTS = {
  structure: 0.40,
  relevance: 0.35,
  vocabulary: 0.25,
};

/**
 * Comprehensive confidence score result
 */
export type ConfidenceScore = {
  // Overall scores (0-100)
  overallConfidence: number;
  faceConfidence: number;
  voiceConfidence: number;
  contentConfidence: number;
  
  // Face breakdown
  eyeContactScore: number;
  engagementScore: number;
  stabilityScore: number;
  expressionScore: number;
  
  // Voice breakdown
  voiceClarityScore: number;
  paceScore: number;
  toneScore: number;
  fillerWordScore: number;
  
  // Content breakdown
  structureScore: number;
  relevanceScore: number;
  vocabularyScore: number;
  
  // Status and recommendations
  status: 'excellent' | 'good' | 'average' | 'needs_improvement' | 'poor';
  primaryStrength: string;
  primaryWeakness: string;
  suggestions: string[];
  trend: 'improving' | 'stable' | 'declining';
  
  // Metadata
  timestamp: number;
  sessionDuration: number;
  dataQuality: 'high' | 'medium' | 'low';
};

/**
 * Voice analysis input
 */
export type VoiceAnalysisInput = {
  clarity: number; // 0-100
  pace: number; // words per minute, ideal 120-150
  paceScore: number; // 0-100
  toneVariation: number; // 0-100
  fillerWordCount: number;
  fillerWordRate: number; // per minute
  volumeConsistency: number; // 0-100
  speechDuration: number; // seconds
};

/**
 * Content analysis input
 */
export type ContentAnalysisInput = {
  structure: number; // 0-100
  relevance: number; // 0-100
  vocabulary: number; // 0-100
  coherence: number; // 0-100
  keyPoints: number;
};

/**
 * Calculate face confidence score from metrics
 */
export function calculateFaceConfidence(metrics: FaceAnalysisMetrics): {
  faceConfidence: number;
  eyeContactScore: number;
  engagementScore: number;
  stabilityScore: number;
  expressionScore: number;
} {
  if (!metrics.faceDetected) {
    return {
      faceConfidence: 0,
      eyeContactScore: 0,
      engagementScore: 0,
      stabilityScore: 0,
      expressionScore: 0,
    };
  }

  // Eye contact score (already 0-100)
  const eyeContactScore = metrics.eyeContactScore;

  // Engagement score (already 0-100)
  const engagementScore = metrics.engagementScore;

  // Stability score (convert from movement)
  const stabilityScore = metrics.stillnessScore;

  // Expression score based on confidence indicator
  const expressionScore = metrics.confidenceIndicator;

  // Weighted combination
  const faceConfidence = Math.round(
    eyeContactScore * FACE_METRIC_WEIGHTS.eyeContact +
    engagementScore * FACE_METRIC_WEIGHTS.engagement +
    stabilityScore * FACE_METRIC_WEIGHTS.stability +
    expressionScore * FACE_METRIC_WEIGHTS.expression
  );

  return {
    faceConfidence,
    eyeContactScore,
    engagementScore,
    stabilityScore,
    expressionScore,
  };
}

/**
 * Calculate voice confidence score
 */
export function calculateVoiceConfidence(voice: VoiceAnalysisInput): {
  voiceConfidence: number;
  voiceClarityScore: number;
  paceScore: number;
  toneScore: number;
  fillerWordScore: number;
} {
  // Clarity score
  const voiceClarityScore = voice.clarity;

  // Pace score (ideal is 120-150 WPM)
  const paceScore = voice.paceScore;

  // Tone variation score
  const toneScore = voice.toneVariation;

  // Filler word score (inverse of filler word rate)
  // 0 fillers = 100, 10+ per minute = 0
  const fillerWordScore = Math.max(0, 100 - (voice.fillerWordRate * 10));

  // Weighted combination
  const voiceConfidence = Math.round(
    voiceClarityScore * VOICE_METRIC_WEIGHTS.clarity +
    paceScore * VOICE_METRIC_WEIGHTS.pace +
    toneScore * VOICE_METRIC_WEIGHTS.tone +
    fillerWordScore * VOICE_METRIC_WEIGHTS.fillerWords
  );

  return {
    voiceConfidence,
    voiceClarityScore,
    paceScore,
    toneScore,
    fillerWordScore,
  };
}

/**
 * Calculate content confidence score
 */
export function calculateContentConfidence(content: ContentAnalysisInput): {
  contentConfidence: number;
  structureScore: number;
  relevanceScore: number;
  vocabularyScore: number;
} {
  const structureScore = content.structure;
  const relevanceScore = content.relevance;
  const vocabularyScore = content.vocabulary;

  // Weighted combination
  const contentConfidence = Math.round(
    structureScore * CONTENT_METRIC_WEIGHTS.structure +
    relevanceScore * CONTENT_METRIC_WEIGHTS.relevance +
    vocabularyScore * CONTENT_METRIC_WEIGHTS.vocabulary
  );

  return {
    contentConfidence,
    structureScore,
    relevanceScore,
    vocabularyScore,
  };
}

/**
 * Calculate comprehensive confidence score with multi-modal fusion
 */
export function calculateConfidenceScore(
  faceMetrics: FaceAnalysisMetrics,
  voiceInput: VoiceAnalysisInput,
  contentInput: ContentAnalysisInput,
  sessionDuration: number,
  previousScores?: number[]
): ConfidenceScore {
  // Calculate individual category scores
  const face = calculateFaceConfidence(faceMetrics);
  const voice = calculateVoiceConfidence(voiceInput);
  const content = calculateContentConfidence(contentInput);

  // Multi-modal fusion
  const overallConfidence = Math.round(
    face.faceConfidence * SCORE_WEIGHTS.face +
    voice.voiceConfidence * SCORE_WEIGHTS.voice +
    content.contentConfidence * SCORE_WEIGHTS.content
  );

  // Determine status
  let status: ConfidenceScore['status'];
  if (overallConfidence >= 85) status = 'excellent';
  else if (overallConfidence >= 70) status = 'good';
  else if (overallConfidence >= 55) status = 'average';
  else if (overallConfidence >= 40) status = 'needs_improvement';
  else status = 'poor';

  // Determine trend
  let trend: ConfidenceScore['trend'] = 'stable';
  if (previousScores && previousScores.length >= 3) {
    const recent = previousScores.slice(-3);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgOlder = previousScores.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, previousScores.length - 3);
    
    if (avgRecent > avgOlder + 5) trend = 'improving';
    else if (avgRecent < avgOlder - 5) trend = 'declining';
  }

  // Identify primary strength
  const scores = [
    { name: 'Eye Contact', score: face.eyeContactScore },
    { name: 'Engagement', score: face.engagementScore },
    { name: 'Voice Clarity', score: voice.voiceClarityScore },
    { name: 'Content Structure', score: content.structureScore },
    { name: 'Stability', score: face.stabilityScore },
  ];
  const sortedScores = scores.sort((a, b) => b.score - a.score);
  const primaryStrength = sortedScores[0].name;
  const primaryWeakness = sortedScores[sortedScores.length - 1].name;

  // Generate suggestions
  const suggestions = generateSuggestions(
    face,
    voice,
    content,
    faceMetrics
  );

  // Determine data quality
  const dataQuality: ConfidenceScore['dataQuality'] = 
    faceMetrics.faceDetected && voiceInput.speechDuration > 10
      ? 'high'
      : faceMetrics.faceDetected || voiceInput.speechDuration > 5
      ? 'medium'
      : 'low';

  return {
    overallConfidence,
    faceConfidence: face.faceConfidence,
    voiceConfidence: voice.voiceConfidence,
    contentConfidence: content.contentConfidence,
    
    eyeContactScore: face.eyeContactScore,
    engagementScore: face.engagementScore,
    stabilityScore: face.stabilityScore,
    expressionScore: face.expressionScore,
    
    voiceClarityScore: voice.voiceClarityScore,
    paceScore: voice.paceScore,
    toneScore: voice.toneScore,
    fillerWordScore: voice.fillerWordScore,
    
    structureScore: content.structureScore,
    relevanceScore: content.relevanceScore,
    vocabularyScore: content.vocabularyScore,
    
    status,
    primaryStrength,
    primaryWeakness,
    suggestions,
    trend,
    timestamp: Date.now(),
    sessionDuration,
    dataQuality,
  };
}

/**
 * Generate contextual suggestions based on analysis
 */
function generateSuggestions(
  face: ReturnType<typeof calculateFaceConfidence>,
  voice: ReturnType<typeof calculateVoiceConfidence>,
  content: ReturnType<typeof calculateContentConfidence>,
  faceMetrics: FaceAnalysisMetrics
): string[] {
  const suggestions: string[] = [];

  // Eye contact suggestions
  if (face.eyeContactScore < 60) {
    if (faceMetrics.gazeDirection === 'left' || faceMetrics.gazeDirection === 'right') {
      suggestions.push('Try to look directly at the camera to build better connection with your audience');
    } else if (faceMetrics.gazeDirection === 'down') {
      suggestions.push('Keep your head up and maintain eye contact with the camera');
    } else {
      suggestions.push('Practice maintaining steady eye contact with the camera');
    }
  } else if (face.eyeContactScore > 85) {
    suggestions.push('Excellent eye contact! You\'re building strong connection');
  }

  // Engagement suggestions
  if (face.engagementScore < 60) {
    suggestions.push('Show more engagement through facial expressions and active listening cues');
  }

  // Stability suggestions
  if (face.stabilityScore < 50) {
    if (faceMetrics.excessiveMovement) {
      suggestions.push('Try to minimize excessive head movement - it can be distracting');
    } else {
      suggestions.push('Maintain a stable posture to project confidence');
    }
  }

  // Voice suggestions
  if (voice.fillerWordScore < 60) {
    suggestions.push('Reduce filler words ("um", "uh", "like") - take pauses instead');
  }
  if (voice.paceScore < 60) {
    if (voice.paceScore < 40) {
      suggestions.push('Slow down your speaking pace for better clarity');
    } else {
      suggestions.push('Speed up slightly to maintain audience engagement');
    }
  }
  if (voice.toneScore < 60) {
    suggestions.push('Add more vocal variety - vary your pitch and emphasis');
  }

  // Content suggestions
  if (content.structureScore < 60) {
    suggestions.push('Structure your points more clearly with clear openings and conclusions');
  }

  // Limit to top 3 most important suggestions
  return suggestions.slice(0, 3);
}

/**
 * Calculate real-time confidence from face metrics only
 * (Used when voice/content data is not yet available)
 */
export function calculateRealtimeFaceConfidence(
  faceMetrics: FaceAnalysisMetrics,
  sessionDuration: number
): Partial<ConfidenceScore> {
  const face = calculateFaceConfidence(faceMetrics);

  // For real-time, we weight face more heavily since it's the only data source
  const overallConfidence = Math.round(face.faceConfidence * 0.8 + 20); // Boost slightly for single-source

  let status: ConfidenceScore['status'];
  if (overallConfidence >= 80) status = 'excellent';
  else if (overallConfidence >= 65) status = 'good';
  else if (overallConfidence >= 50) status = 'average';
  else if (overallConfidence >= 35) status = 'needs_improvement';
  else status = 'poor';

  const suggestions: string[] = [];
  
  if (face.eyeContactScore < 60) {
    suggestions.push('Maintain better eye contact with the camera');
  }
  if (face.stabilityScore < 60) {
    suggestions.push('Keep your head position stable');
  }
  if (face.engagementScore < 60) {
    suggestions.push('Show more active engagement');
  }

  return {
    overallConfidence,
    faceConfidence: face.faceConfidence,
    voiceConfidence: 0,
    contentConfidence: 0,
    eyeContactScore: face.eyeContactScore,
    engagementScore: face.engagementScore,
    stabilityScore: face.stabilityScore,
    expressionScore: face.expressionScore,
    status,
    primaryStrength: face.eyeContactScore > face.engagementScore ? 'Eye Contact' : 'Engagement',
    primaryWeakness: face.stabilityScore < face.eyeContactScore ? 'Stability' : 'Eye Contact',
    suggestions,
    trend: 'stable',
    timestamp: Date.now(),
    sessionDuration,
    dataQuality: faceMetrics.faceDetected ? 'medium' : 'low',
  };
}

/**
 * Get color coding for confidence scores
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#eab308'; // yellow-500
  if (score >= 40) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Average';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}/100`;
}
