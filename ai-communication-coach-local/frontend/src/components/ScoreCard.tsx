"use client";
import React from 'react';

export default function ScoreCard({ title, score, color }: { title: string, score: number, color: string }) {
  // Score is out of 10
  const percentage = (score / 10) * 100;
  
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
      <h4 className="text-gray-400 font-semibold mb-2 uppercase text-xs tracking-wider">{title}</h4>
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
          <circle 
            cx="40" 
            cy="40" 
            r="36" 
            stroke="currentColor" 
            strokeWidth="8" 
            fill="transparent" 
            strokeDasharray={226} 
            strokeDashoffset={226 - (226 * percentage) / 100}
            className={`transition-all duration-1000 ease-out ${color}`} 
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-2xl font-bold text-white">{score}</span>
      </div>
    </div>
  );
}
