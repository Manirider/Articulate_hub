"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(API_ENDPOINTS.leaderboard, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (err.message === "Unauthorized") router.push("/login");
        setLoading(false);
      });
  }, [router]);

  return (
    <div className="min-h-screen p-8 md:p-16 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <Link href="/dashboard" className="text-gray-400 hover:text-white mb-8 inline-block transition-colors">
          ← Back to Dashboard
        </Link>
        
        <div className="glass-panel w-full p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
          
          <h1 className="text-4xl font-extrabold mb-8 text-center flex items-center justify-center gap-3">
            <span className="text-4xl">🏆</span> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">Global Leaderboard</span>
          </h1>

          {loading ? (
            <div className="text-center text-gray-500 animate-pulse py-10">Fetching rankings...</div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((user, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    user.username === 'ai_user' 
                      ? 'bg-blue-900/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]' 
                      : 'bg-slate-800/50 border-slate-700'
                  } transition-transform`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-800' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-slate-700 text-gray-300'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className={`font-bold ${user.username === 'ai_user' ? 'text-blue-400' : 'text-white'}`}>
                        {user.username} {user.username === 'ai_user' && "(You)"}
                      </h3>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">{user.level}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-blue-500">
                      {user.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
