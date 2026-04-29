import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0A2342',
          sky: '#06b6d4',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
          paper: '#0b0f1a',
          ink: '#e2e8f0',
          muted: '#94a3b8',
        },
      },
      boxShadow: {
        panel: '0 12px 40px rgba(0, 0, 0, 0.4)',
        glow: '0 0 40px rgba(6, 182, 212, 0.15)',
        'glow-violet': '0 0 40px rgba(139, 92, 246, 0.15)',
        'glow-amber': '0 0 40px rgba(245, 158, 11, 0.15)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'border-spin': {
          '100%': { '--angle': '360deg' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        pulseRing: 'pulseRing 1.6s ease-out infinite',
        reveal: 'reveal 0.7s ease forwards',
        'spin-slow': 'spin-slow 12s linear infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
