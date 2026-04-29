import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Communication Coach — Master Your Voice',
  description:
    'Premium AI-powered communication training platform. Practice Group Discussion, Debate, Presentation, JAM sessions, and Interviews with real-time AI coaching, adaptive feedback, and gamified progression.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="relative overflow-x-hidden">
        {/* Ambient background orbs */}
        <div className="bg-orb bg-orb-cyan fixed -left-32 top-20 h-[500px] w-[500px]" />
        <div className="bg-orb bg-orb-violet fixed -right-40 top-[40%] h-[600px] w-[600px]" />
        <div className="bg-orb bg-orb-amber fixed bottom-0 left-[30%] h-[400px] w-[400px]" />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
