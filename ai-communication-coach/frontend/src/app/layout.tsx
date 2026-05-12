import { GoogleOAuthProvider } from '@react-oauth/google';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import ParticleField from '@/components/ParticleField';
import { ServiceWorkerManager } from '@/components/ServiceWorkerManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AICompanionProvider } from '@/hooks/useAICompanion';
import { GlobalCompanion } from '@/components/GlobalCompanion';

export const metadata: Metadata = {
  title: 'AI Communication Coach — Master Your Voice',
  description:
    'Premium AI-powered communication training platform. Practice Group Discussion, Debate, Presentation, JAM sessions, and Interviews with real-time AI coaching, adaptive feedback, and gamified progression.',
  keywords: 'AI coaching, communication skills, public speaking, presentation practice, debate training, interview prep, real-time feedback',
  authors: [{ name: 'AI Communication Coach Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aicoach.example.com',
    siteName: 'AI Communication Coach',
    title: 'AI Communication Coach — Master Your Voice',
    description: 'Premium AI-powered communication training platform',
    images: [
      {
        url: 'https://aicoach.example.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Communication Coach Platform',
      },
    ],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f1e' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

  return (
    <html lang="en" className="dark">
      <body className="relative overflow-x-hidden">
        <ErrorBoundary>
          <GoogleOAuthProvider clientId={clientId}>
            <ThemeProvider>
              <AICompanionProvider>
                {/* Ambient particle field */}
                <ParticleField count={50} />
                <ServiceWorkerManager />

                {/* Ambient background orbs */}
                <div className="bg-orb bg-orb-cyan fixed -left-32 top-20 h-[500px] w-[500px]" />
                <div className="bg-orb bg-orb-violet fixed -right-40 top-[40%] h-[600px] w-[600px]" />
                <div className="bg-orb bg-orb-amber fixed bottom-0 left-[30%] h-[400px] w-[400px]" />

                {/* Content */}
                <div className="relative z-10">{children}</div>

                {/* Persistent AI Companion */}
                <GlobalCompanion />
              </AICompanionProvider>
            </ThemeProvider>
          </GoogleOAuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
