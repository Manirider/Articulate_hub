'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * AI Companion Context - Global State Management
 * 
 * Provides global access to AI companion functionality across the platform,
 * including speech, achievements, guidance, and session management.
 */

export type MessageType = 'greeting' | 'guidance' | 'feedback' | 'achievement' | 'system' | 'motivation';
export type BotEmotion = 'happy' | 'neutral' | 'concerned' | 'excited' | 'proud' | 'encouraging';

export interface CompanionMessage {
  id: string;
  text: string;
  type: MessageType;
  emotion: BotEmotion;
  timestamp: number;
  audioUrl?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: string;
  unlockedAt: number;
}

export interface SessionContext {
  moduleId?: string;
  moduleName?: string;
  sessionType?: 'practice' | 'demo' | 'ai' | 'friends';
  progress: number;
  score?: number;
}

interface AICompanionContextType {
  // State
  isCompanionVisible: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  currentMessage: CompanionMessage | null;
  messageHistory: CompanionMessage[];
  sessionContext: SessionContext | null;
  
  // Actions
  showCompanion: () => void;
  hideCompanion: () => void;
  toggleMute: () => void;
  speak: (text: string, type?: MessageType, emotion?: BotEmotion) => void;
  announceAchievement: (achievement: Achievement) => void;
  announceXP: (amount: number, total: number, levelUp?: boolean) => void;
  announceStreak: (days: number) => void;
  provideGuidance: (context: string) => void;
  provideFeedback: (score: number, feedback: string) => void;
  motivate: (context?: string) => void;
  congratulate: (achievement: string) => void;
  setSessionContext: (context: SessionContext) => void;
  clearSessionContext: () => void;
  
  // Utilities
  getGreeting: () => string;
  getMotivation: () => string;
  getEncouragement: () => string;
  getCelebration: (achievement: string) => string;
}

const AICompanionContext = createContext<AICompanionContextType | undefined>(undefined);

// Message templates
const GREETINGS: Record<BotEmotion, string[]> = {
  happy: [
    "Hello! I'm your AI communication coach. Ready to help you shine! ✨",
    "Welcome back! Let's make today an amazing practice session! 🌟",
    "Hi there! Excited to help you improve your communication skills! 🎯",
    "Hey! Ready to become a more confident speaker? Let's do this! 💪",
  ],
  neutral: [
    "Hello. I'm here to assist with your communication training.",
    "Welcome. Ready when you are.",
    "Hi there. Let's begin your session.",
  ],
  concerned: [
    "Hey, I noticed you haven't practiced in a while. Everything okay? I'm here when you're ready.",
    "Hi there. Remember, consistency is key. Let's get back on track together.",
  ],
  excited: [
    "WOW! Welcome back, superstar! 🎉 Let's crush some goals today!",
    "YESSS! You're here! Time to level up your communication skills! 🚀",
    "AMAZING to see you! Ready for an epic session? Let's GO! ⚡",
  ],
  proud: [
    "Welcome back, champion! Your progress has been incredible! 🏆",
    "Hello there, rising star! Ready to add another win to your streak? ⭐",
    "Hey superstar! Your dedication is inspiring. Let's keep it going! 💫",
  ],
  encouraging: [
    "Hey there! Remember, every expert was once a beginner. You've got this! 💪",
    "Hi! Don't worry about mistakes - they're just learning opportunities in disguise! 🌱",
    "Hello! Progress, not perfection. Let's take this one step at a time! 🎯",
  ],
};

const MOTIVATIONS: string[] = [
  "Believe in yourself! You're capable of amazing things! 🌟",
  "Every practice session makes you stronger. Keep going! 💪",
  "Your voice matters. Speak with confidence! 📢",
  "You've got the skills - now let's show the world! ✨",
  "Remember: confidence is built one session at a time! 🎯",
  "Don't compare yourself to others. Compare yourself to who you were yesterday! 📈",
  "Great communicators aren't born - they're made through practice! 🎓",
  "Take a deep breath. You've prepared for this. You got it! 🌬️",
  "The only way to improve is to keep trying. You're doing great! ⭐",
  "Your potential is limitless. Keep pushing forward! 🚀",
];

const ENCOURAGEMENTS: string[] = [
  "That was great! Let's build on that momentum! 💫",
  "Excellent effort! I can see you're improving! 📈",
  "Nice work! Your confidence is growing with each attempt! 🌱",
  "Well done! You're developing real skills here! 🎯",
  "Fantastic! You're really getting the hang of this! ⭐",
  "Brilliant! Your hard work is paying off! 💎",
  "Superb! Keep that energy going! ⚡",
  "Outstanding! You're making real progress! 🏆",
  "Impressive! You're becoming more confident by the minute! 💪",
  "Wonderful! Your dedication shows in your performance! ✨",
];

const CELEBRATIONS: string[] = [
  "🎉 INCREDIBLE! You just unlocked {achievement}! You're on fire! 🔥",
  "🏆 AMAZING ACHIEVEMENT! {achievement} unlocked! You should be proud! ⭐",
  "✨ WOW! {achievement} earned! Your dedication is paying off big time! 💎",
  "🚀 PHENOMENAL! {achievement} unlocked! You're reaching new heights! 🌟",
  "💫 SPECTACULAR! {achievement} achieved! You're becoming unstoppable! ⚡",
];

const GUIDANCE_TEMPLATES: Record<string, string[]> = {
  eye_contact: [
    "Try to look directly at the camera - it builds trust with your audience! 👁️",
    "Great content! Now let's work on maintaining that eye contact. You've got this! 👀",
    "Remember: the camera is your audience. Speak to it like a friend! 📷",
  ],
  pace: [
    "You're speaking a bit fast. Try taking a breath between sentences. 🌬️",
    "Slow down slightly - clarity is more important than speed! 🐢",
    "Find your rhythm. A measured pace shows confidence! ⏱️",
  ],
  confidence: [
    "Stand tall! Your posture affects how confident you sound! 💪",
    "Speak with conviction. You know your stuff - show it! 📢",
    "Project your voice. Confidence comes from within! 🎤",
  ],
  filler_words: [
    "I noticed some filler words. Try pausing instead - silence is powerful! 🤫",
    "Replace 'um' and 'uh' with brief pauses. It sounds more polished! ✨",
    "Great ideas! Let's work on removing those filler words for maximum impact! 🎯",
  ],
  general: [
    "You're doing great! Keep that energy up! ⚡",
    "Fantastic progress! Let's maintain this momentum! 📈",
    "Excellent work! Your skills are really developing! 🌟",
  ],
};

const FEEDBACK_TEMPLATES: Record<string, string[]> = {
  excellent: [
    "🏆 OUTSTANDING PERFORMANCE! You absolutely nailed it! This was exceptional! ⭐⭐⭐",
    "🌟 PHENOMENAL! Your communication skills are truly impressive! Keep this up! 💎",
    "⚡ INCREDIBLE! You've mastered this! I'm genuinely impressed! 🎯",
  ],
  good: [
    "⭐ Great job! Solid performance with some really strong moments! Keep practicing! 📈",
    "💪 Well done! You're showing real improvement and confidence! Nice work! 🎓",
    "✨ Good session! I can see your skills developing. Keep this momentum going! 🌱",
  ],
  average: [
    "📊 Decent effort! There's definitely potential here. Let's work on refining a few areas! 🎯",
    "💡 Not bad! With a bit more practice, you'll see significant improvements! Keep going! 🚀",
    "🎓 Room to grow, but you showed some good moments! Let's build on those! 📈",
  ],
  needs_work: [
    "🌱 Every expert starts somewhere. Don't get discouraged - you're learning! Let's review together! 💪",
    "📚 Practice makes progress! Let's identify what to focus on next session! You're capable! 🎯",
    "💪 Keep pushing! Communication skills take time to develop. I believe in you! ⭐",
  ],
};

const XP_ANNOUNCEMENTS: string[] = [
  "🎉 +{amount} XP earned! You're {total} XP closer to your next level! 📈",
  "💎 BOOM! +{amount} XP gained! Keep stacking those points! 🚀",
  "⭐ Awesome! +{amount} XP added to your total! You're leveling up! 📊",
  "🏆 Nice! +{amount} XP earned! Your dedication shows! 💪",
];

const LEVEL_UP_ANNOUNCEMENTS: string[] = [
  "🎊 LEVEL UP! You've reached Level {level}! Your skills are evolving! 🚀",
  "⭐⭐⭐ CONGRATULATIONS! Level {level} unlocked! You're unstoppable! 🏆",
  "🔥 INCREDIBLE! Welcome to Level {level}! Your journey continues! ⚡",
];

const STREAK_ANNOUNCEMENTS: Record<number, string[]> = {
  3: ["🔥 3-day streak! You're building great habits! Keep it going! 💪"],
  7: ["⚡ WOW! 7-day streak! A whole week of dedication! Amazing! 🌟"],
  14: ["💎 14-day streak! Two weeks of pure commitment! You're incredible! 🏆"],
  30: ["🚀 PHENOMENAL! 30-day streak! A month of excellence! Legendary! ⭐⭐⭐"],
  60: ["👑 UNSTOPPABLE! 60-day streak! You're a true communication master! 💎"],
  100: ["🏆 LEGENDARY! 100-day streak! This is absolutely incredible! 🌟🔥✨"],
};

export function AICompanionProvider({ children }: { children: ReactNode }) {
  const [isCompanionVisible, setIsCompanionVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<CompanionMessage | null>(null);
  const [messageHistory, setMessageHistory] = useState<CompanionMessage[]>([]);
  const [sessionContext, setSessionContextState] = useState<SessionContext | null>(null);

  // Text-to-speech
  const synthesizeSpeech = useCallback((text: string, emotion: BotEmotion = 'neutral') => {
    if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure based on emotion
    switch (emotion) {
      case 'excited':
        utterance.rate = 1.1;
        utterance.pitch = 1.15;
        break;
      case 'happy':
        utterance.rate = 1;
        utterance.pitch = 1.1;
        break;
      case 'proud':
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        break;
      case 'concerned':
        utterance.rate = 0.9;
        utterance.pitch = 0.95;
        break;
      case 'encouraging':
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        break;
      default:
        utterance.rate = 0.95;
        utterance.pitch = 1;
    }
    
    utterance.volume = 0.8;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google')) || 
                          voices.find(v => v.name.includes('Samantha')) ||
                          voices.find(v => v.name.includes('Victoria')) ||
                          voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Speak a message
  const speak = useCallback((text: string, type: MessageType = 'system', emotion: BotEmotion = 'neutral') => {
    const message: CompanionMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      emotion,
      timestamp: Date.now(),
    };

    setCurrentMessage(message);
    setMessageHistory(prev => [...prev.slice(-9), message]);
    synthesizeSpeech(text, emotion);
  }, [synthesizeSpeech]);

  // Show/hide
  const showCompanion = useCallback(() => setIsCompanionVisible(true), []);
  const hideCompanion = useCallback(() => setIsCompanionVisible(false), []);
  const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

  // Set session context
  const setSessionContext = useCallback((context: SessionContext) => {
    setSessionContextState(context);
  }, []);

  const clearSessionContext = useCallback(() => {
    setSessionContextState(null);
  }, []);

  // Announce achievement
  const announceAchievement = useCallback((achievement: Achievement) => {
    const template = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
    const text = template.replace('{achievement}', achievement.title);
    speak(text, 'achievement', 'proud');
  }, [speak]);

  // Announce XP
  const announceXP = useCallback((amount: number, total: number, levelUp?: boolean) => {
    if (levelUp) {
      const level = Math.floor(total / 100) + 1;
      const template = LEVEL_UP_ANNOUNCEMENTS[Math.floor(Math.random() * LEVEL_UP_ANNOUNCEMENTS.length)];
      const text = template.replace('{level}', level.toString());
      speak(text, 'achievement', 'excited');
    } else {
      const template = XP_ANNOUNCEMENTS[Math.floor(Math.random() * XP_ANNOUNCEMENTS.length)];
      const text = template
        .replace('{amount}', amount.toString())
        .replace('{total}', total.toString());
      speak(text, 'achievement', 'happy');
    }
  }, [speak]);

  // Announce streak
  const announceStreak = useCallback((days: number) => {
    const announcements = STREAK_ANNOUNCEMENTS[days as keyof typeof STREAK_ANNOUNCEMENTS];
    if (announcements) {
      const text = announcements[Math.floor(Math.random() * announcements.length)];
      speak(text, 'achievement', 'excited');
    } else if (days > 3) {
      speak(`🔥 ${days}-day streak! Incredible dedication! Keep it up! 💪`, 'achievement', 'proud');
    }
  }, [speak]);

  // Provide guidance
  const provideGuidance = useCallback((context: string) => {
    const templates = GUIDANCE_TEMPLATES[context as keyof typeof GUIDANCE_TEMPLATES] || GUIDANCE_TEMPLATES.general;
    const text = templates[Math.floor(Math.random() * templates.length)];
    speak(text, 'guidance', 'encouraging');
  }, [speak]);

  // Provide feedback
  const provideFeedback = useCallback((score: number, feedback: string) => {
    let category: keyof typeof FEEDBACK_TEMPLATES = 'needs_work';
    if (score >= 85) category = 'excellent';
    else if (score >= 70) category = 'good';
    else if (score >= 55) category = 'average';

    const templates = FEEDBACK_TEMPLATES[category];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const text = `${template} ${feedback}`;
    
    const emotion: BotEmotion = score >= 70 ? 'proud' : score >= 55 ? 'encouraging' : 'concerned';
    speak(text, 'feedback', emotion);
  }, [speak]);

  // Motivate
  const motivate = useCallback((context?: string) => {
    const text = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    speak(text, 'motivation', 'encouraging');
  }, [speak]);

  // Congratulate
  const congratulate = useCallback((achievement: string) => {
    const text = `🎉 Congratulations on ${achievement}! That's fantastic! Keep up the amazing work! ⭐`;
    speak(text, 'achievement', 'excited');
  }, [speak]);

  // Utility functions
  const getGreeting = useCallback(() => {
    const emotion: BotEmotion = 'happy';
    const options = GREETINGS[emotion];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const getMotivation = useCallback(() => {
    return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
  }, []);

  const getEncouragement = useCallback(() => {
    return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
  }, []);

  const getCelebration = useCallback((achievement: string) => {
    const template = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
    return template.replace('{achievement}', achievement);
  }, []);

  const value: AICompanionContextType = {
    isCompanionVisible,
    isMuted,
    isSpeaking,
    currentMessage,
    messageHistory,
    sessionContext,
    showCompanion,
    hideCompanion,
    toggleMute,
    speak,
    announceAchievement,
    announceXP,
    announceStreak,
    provideGuidance,
    provideFeedback,
    motivate,
    congratulate,
    setSessionContext,
    clearSessionContext,
    getGreeting,
    getMotivation,
    getEncouragement,
    getCelebration,
  };

  return (
    <AICompanionContext.Provider value={value}>
      {children}
    </AICompanionContext.Provider>
  );
}

export function useAICompanion() {
  const context = useContext(AICompanionContext);
  if (context === undefined) {
    throw new Error('useAICompanion must be used within an AICompanionProvider');
  }
  return context;
}
