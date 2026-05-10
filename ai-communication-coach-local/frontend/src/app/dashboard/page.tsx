"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_ENDPOINTS } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [coachAdvice, setCoachAdvice] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    
    const headers = { "Authorization": `Bearer ${token}` };

    // Fetch user stats
    fetch(API_ENDPOINTS.userStats, { headers })
      .then(res => {
        if (res.status === 401) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => {
         console.error(err);
         if (err.message === "Unauthorized") router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Calculate XP percentage for progress bar
  const getXpPercentage = (xp: number) => {
    if (xp < 100) return (xp / 100) * 100;
    if (xp < 300) return ((xp - 100) / 200) * 100;
    if (xp < 700) return ((xp - 300) / 400) * 100;
    return 100; // Maxed out
  };
  
  const getNextLevelXp = (xp: number) => {
    if (xp < 100) return 100;
    if (xp < 300) return 300;
    if (xp < 700) return 700;
    return "MAX";
  };

  return (
    <div className="min-h-screen p-8 md:p-16">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Personal AI Coach
            </h1>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">Welcome, <strong className="text-white">{stats?.full_name || "Coach"}</strong></span>
              <button onClick={() => { localStorage.removeItem("token"); router.push("/login"); }} className="text-red-400 hover:text-red-300 hover:underline">Logout</button>
            </div>
        </div>
        
        {stats && (
          <div className="flex items-center gap-6 bg-slate-800/80 p-3 rounded-2xl border border-slate-700 shadow-lg">
            {/* Streak Indicator */}
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className={`text-2xl ${stats.streak_days > 0 ? 'animate-pulse' : 'grayscale opacity-50'}`}>🔥</span>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-none">{stats.streak_days}</span>
                <span className="text-gray-400 text-xs uppercase tracking-wider">Day Streak</span>
              </div>
            </div>
            
            <div className="w-px h-10 bg-slate-700"></div>
            
            {/* XP & Level */}
            <div className="flex flex-col min-w-[150px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{stats.level}</span>
                <span className="text-xs text-gray-400">{stats.xp} / {getNextLevelXp(stats.xp)} XP</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-1000" 
                  style={{ width: `${getXpPercentage(stats.xp)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="w-px h-10 bg-slate-700"></div>
            
            {/* Leaderboard Link */}
            <Link href="/leaderboard" className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 hover:bg-yellow-600/30 hover:text-yellow-400 transition-colors tooltip text-xl" title="Leaderboard">
              🏆
            </Link>
          </div>
        )}
      </header>

      {loading ? (
        <div className="glass-panel p-8 text-center text-gray-500 animate-pulse">Loading your personalized dashboard...</div>
      ) : (
        <>
          {/* Quick Start Section */}
          {stats && (
            <section className="mb-8 animate-fade-in">
              <div className="glass-panel p-8 border border-purple-500/30">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="text-3xl">🚀</span> 
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Get Started</span>
                </h2>
                <p className="text-gray-300 mb-6">
                  Welcome! Your AI Coach is ready to help you improve your communication skills. Choose a module to begin your practice session.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/module" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                    Start Practice Session
                  </Link>
                  <Link href="/leaderboard" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">
                    View Leaderboard
                  </Link>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
