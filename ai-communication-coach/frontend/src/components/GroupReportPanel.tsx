'use client';

import { CheckCircle, AlertCircle, Trophy, Users, Clock, BarChart3, Mic, Eye, Zap } from 'lucide-react';
import { ScoreCard } from '@/components/ScoreCard';
import type { IndividualReport, GroupMetrics } from '@/services/api';

type Props = {
  individualReports: IndividualReport[];
  groupMetrics: GroupMetrics;
  teamReports?: { team: string; team_score: number; members: IndividualReport[] }[] | null;
  winner?: string | null;
  mode: string;
};

export function GroupReportPanel({ individualReports, groupMetrics, teamReports, winner, mode }: Props) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="glass rounded-2xl p-8 text-center">
        <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-slate-100">Session Complete</h2>
        <p className="mt-1 text-slate-400">AI analysis of your group discussion</p>

        {winner && mode.startsWith('team') && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-6 py-2 border border-amber-500/30">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-bold text-amber-400">
              {winner === 'tie' ? "It's a Tie!" : `Team ${winner} Wins!`}
            </span>
          </div>
        )}
      </div>

      {/* Group Metrics */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-cyan-400" /> Group Performance
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard label="Discussion Balance" value={groupMetrics.discussion_balance} icon="⚖️" color="cyan" />
          <ScoreCard label="Teamwork Quality" value={groupMetrics.teamwork_quality} icon="🤝" color="violet" />
          <ScoreCard
            label="Engagement"
            value={groupMetrics.engagement_level === 'high' ? 85 : groupMetrics.engagement_level === 'moderate' ? 55 : 25}
            icon="🔥"
            color="amber"
          />
          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] uppercase text-slate-500 tracking-wider">Dominant Speaker</p>
            <p className="text-lg font-bold text-slate-200 mt-1">{groupMetrics.dominant_speaker_name || 'N/A'}</p>
          </div>
        </div>

        {/* Speaking Distribution */}
        <div className="mt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Speaking Distribution</p>
          <div className="space-y-2">
            {individualReports.map((r) => {
              const pct = groupMetrics.speaking_distribution[r.user_id] ?? 0;
              return (
                <div key={r.user_id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-28 truncate">{r.display_name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-800/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Reports (if team mode) */}
      {teamReports && teamReports.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {teamReports.map((team) => (
            <div key={team.team} className={`glass rounded-2xl p-6 border-2 ${
              winner === team.team
                ? 'border-amber-500/30 shadow-lg shadow-amber-500/5'
                : 'border-slate-700/20'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`text-lg font-bold ${
                  team.team === 'A' ? 'text-cyan-400' : 'text-rose-400'
                }`}>
                  Team {team.team}
                  {winner === team.team && <Trophy className="inline h-4 w-4 ml-2 text-amber-400" />}
                </h4>
                <span className="text-2xl font-bold gradient-text">{team.team_score.toFixed(1)}</span>
              </div>
              {team.members.map((m) => (
                <div key={m.user_id} className="rounded-xl bg-slate-800/30 p-3 mb-2 last:mb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{m.display_name}</span>
                    <span className="text-sm font-bold gradient-text">{m.overall_score.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Individual Reports */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-400" /> Individual Reports
        </h3>

        {individualReports.map((report) => (
          <div key={report.user_id} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-100">{report.display_name}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {report.speaking_time_seconds.toFixed(0)}s spoken
                  </span>
                  <span className="flex items-center gap-1">
                    <Mic className="h-3 w-3" /> {report.interruption_count} interruptions
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold gradient-text">{report.overall_score.toFixed(1)}</span>
                <span className="text-xs text-slate-500 block">/ 100</span>
              </div>
            </div>

            {/* Score cards */}
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 mb-4">
              <MiniScore label="Clarity" value={report.clarity_score} />
              <MiniScore label="Confidence" value={report.confidence_score} />
              <MiniScore label="Content" value={report.content_score} />
              <MiniScore label="Delivery" value={report.delivery_score} />
            </div>

            {/* Multi-modal metrics */}
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-cyan-400" /> Eye Contact: {report.eye_contact_score.toFixed(0)}
              </span>
              <span className="flex items-center gap-1">
                <Mic className="h-3 w-3 text-violet-400" /> Voice Energy: {report.voice_energy_score.toFixed(0)}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" /> Engagement: {report.engagement_score.toFixed(0)}
              </span>
            </div>

            {/* Feedback sections */}
            <div className="grid gap-3 sm:grid-cols-3">
              <FeedbackList title="Strengths" items={report.strengths} color="emerald" icon={<CheckCircle className="h-3.5 w-3.5" />} />
              <FeedbackList title="Improve" items={report.weaknesses} color="rose" icon={<AlertCircle className="h-3.5 w-3.5" />} />
              <FeedbackList title="Actions" items={report.suggestions} color="amber" icon={<Zap className="h-3.5 w-3.5" />} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? 'text-emerald-400 bg-emerald-500/10' :
    value >= 50 ? 'text-amber-400 bg-amber-500/10' :
    'text-rose-400 bg-rose-500/10';
  return (
    <div className={`rounded-xl p-2.5 text-center ${color}`}>
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-bold">{value.toFixed(1)}</p>
    </div>
  );
}

function FeedbackList({
  title,
  items,
  color,
  icon,
}: {
  title: string;
  items: string[];
  color: string;
  icon: React.ReactNode;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10',
    rose: 'text-rose-400 bg-rose-500/5 border-rose-500/10',
    amber: 'text-amber-400 bg-amber-500/5 border-amber-500/10',
  };
  const cls = colorClasses[color] || colorClasses.emerald;

  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-xs font-bold flex items-center gap-1.5 mb-2">
        {icon} {title}
      </p>
      <ul className="space-y-1">
        {items.slice(0, 3).map((item, i) => (
          <li key={i} className="text-[11px] text-slate-400">• {item}</li>
        ))}
      </ul>
    </div>
  );
}
