'use client';

import { AICompanion } from './AICompanion';
import { useAICompanion } from '@/hooks/useAICompanion';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * GlobalCompanion - Persistent AI Companion across all pages
 * 
 * Automatically provides contextual greetings and guidance
 * based on the current page and user activity.
 */
export function GlobalCompanion() {
  const { speak, setSessionContext, isCompanionVisible } = useAICompanion();
  const pathname = usePathname();

  // Page-specific greetings
  useEffect(() => {
    if (!isCompanionVisible) return;

    const timer = setTimeout(() => {
      switch (pathname) {
        case '/':
          speak(
            "Welcome to AI Communication Coach! I'm your personal AI assistant. Ready to help you become a confident communicator!",
            'greeting',
            'excited'
          );
          break;
        case '/auth':
          speak(
            "Hi there! Sign in to start your communication journey. I'm here to guide you every step of the way!",
            'greeting',
            'happy'
          );
          break;
        case '/dashboard':
          speak(
            "Welcome to your dashboard! Here you can track your progress and start new practice sessions. What would you like to work on today?",
            'guidance',
            'happy'
          );
          break;
        case '/analytics':
          speak(
            "Check out your analytics! I can see you've been making great progress. Let's review your strengths and areas to improve!",
            'guidance',
            'proud'
          );
          break;
        case '/leaderboard':
          speak(
            "The leaderboard shows top performers! Keep practicing and you'll climb the ranks. I believe in you!",
            'motivation',
            'encouraging'
          );
          break;
        case '/profile':
          speak(
            "This is your profile page! Customize your settings and view your achievements. You're doing amazing!",
            'guidance',
            'happy'
          );
          break;
        case '/team':
          speak(
            "Welcome to your team page! Collaborate with others and learn together. Teamwork makes the dream work!",
            'guidance',
            'excited'
          );
          break;
        default:
          if (pathname.startsWith('/modules/')) {
            const moduleName = pathname.split('/')[2];
            const moduleMessages: Record<string, string> = {
              'group-discussion': "Group Discussion module! Perfect for practicing collaborative communication. Let's learn to express ideas clearly in groups!",
              'debate': "Debate module! Time to sharpen your argumentative skills. Remember to stay respectful while making strong points!",
              'presentation': "Presentation module! Let's work on delivering compelling presentations with confidence and clarity!",
              'jam': "JAM module! Just A Minute - perfect for quick thinking and concise speaking. You've got this!",
              'interview': "Interview module! Practice common interview questions and nail your next job interview!",
            };
            const message = moduleMessages[moduleName] || "Welcome to this module! I'm here to guide you through the practice session.";
            speak(message, 'guidance', 'excited');
          } else if (pathname.startsWith('/room/')) {
            speak(
              "You've joined a group session! I'll be monitoring the discussion and providing feedback. Have a great conversation!",
              'guidance',
              'happy'
            );
            setSessionContext({
              sessionType: 'friends',
              progress: 0,
            });
          } else if (pathname.startsWith('/session/')) {
            speak(
              "Practice session started! I'll be watching your performance and providing real-time feedback. Show me what you've got!",
              'guidance',
              'encouraging'
            );
            setSessionContext({
              sessionType: 'practice',
              progress: 0,
            });
          }
      }
    }, 1500); // Delay to let page load

    return () => clearTimeout(timer);
  }, [pathname, speak, setSessionContext, isCompanionVisible]);

  return <AICompanion mode="floating" />;
}
