"use client";
import React from 'react';

export default function AvatarUI({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center my-8">
      <div className="relative flex items-center justify-center w-48 h-48">
        
        {/* Pulse Animations (Only active when speaking) */}
        {isSpeaking && (
          <>
            <div className="absolute w-full h-full bg-blue-500 rounded-full mix-blend-screen animate-ping opacity-30"></div>
            <div className="absolute w-56 h-56 bg-purple-500 rounded-full mix-blend-screen animate-pulse opacity-20" style={{ animationDuration: '1.5s' }}></div>
            
            {/* Fake waveform bars around avatar */}
            <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-50">
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-2 bg-pink-400 rounded-full animate-bounce" 
                        style={{ height: `${20 + Math.random() * 60}px`, animationDelay: `${i * 0.1}s` }}
                    ></div>
                ))}
            </div>
          </>
        )}
        
        {/* Static Avatar Circle */}
        <div className={`relative z-10 w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(120,0,255,0.4)] transition-transform duration-300 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
          <span className="text-6xl">🤖</span>
        </div>
      </div>
      
      <p className={`mt-6 text-xl font-medium transition-opacity duration-300 ${isSpeaking ? 'text-blue-300 opacity-100' : 'text-gray-500 opacity-50'}`}>
        {isSpeaking ? "Coach is speaking..." : "Coach is listening"}
      </p>
    </div>
  );
}
