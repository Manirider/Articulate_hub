const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export type ModuleItem = {
  id: string;
  name: string;
  description: string;
  submodules: { name: string; description: string }[];
};

export type AnalyticsOverview = {
  sessions_completed: number;
  average_score: number;
  level: number;
  xp: number;
  streak_days: number;
  score_trend: number[];
  leaderboard_rank_hint: number;
  avg_clarity: number;
  avg_confidence: number;
  avg_content: number;
  avg_delivery: number;
};

import { getToken } from './auth';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? getToken() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.detail;
    let message = 'Request failed';
    
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      // Handle FastAPI validation error array: [{"msg": "..."}, ...]
      message = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    } else if (detail && typeof detail === 'object') {
      message = detail.msg || JSON.stringify(detail);
    }
    
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const api = {
  signup: (payload: { email: string; full_name: string; password: string }) =>
    apiRequest<{ access_token: string }>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  login: (payload: { email: string; password: string }) =>
    apiRequest<{ access_token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  googleLogin: (token: string) =>
    apiRequest<{ access_token: string }>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),
  me: () => apiRequest<{ id: string; email: string; full_name: string; level: number; xp: number; streak_days: number }>('/api/v1/auth/me'),
  modules: () => apiRequest<ModuleItem[]>('/api/v1/modules'),
  analytics: () => apiRequest<AnalyticsOverview>('/api/v1/analytics/overview'),
  getLeaderboard: () => apiRequest<{ leaderboard: { rank: number; name: string; xp: number; level: number; sessions: number }[] }>('/api/v1/analytics/leaderboard'),
  createSession: (payload: { module_name: string; submodule_name: string; topic: string }) =>
    apiRequest<{ id: string; status: string }>('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  addTranscript: (sessionId: string, content: string, speaker = 'user') =>
    apiRequest(`/api/v1/sessions/${sessionId}/transcript`, {
      method: 'POST',
      body: JSON.stringify({ content, speaker })
    }),
  completeSession: (sessionId: string) =>
    apiRequest<{
      overall_score: number;
      clarity_score: number;
      confidence_score: number;
      content_score: number;
      delivery_score: number;
      strengths: string[];
      weaknesses: string[];
      improvements: string[];
      explainability: string;
    }>(`/api/v1/sessions/${sessionId}/complete`, { method: 'POST' }),

  // ── Room APIs ──
  createRoom: (payload: { title: string; mode: string; max_participants: number }) =>
    apiRequest<RoomResponse>('/api/v1/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  joinRoom: (code: string) =>
    apiRequest<RoomDetailResponse>('/api/v1/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  getRoom: (roomId: string) =>
    apiRequest<RoomDetailResponse>(`/api/v1/rooms/${roomId}`),
  startRoom: (roomId: string) =>
    apiRequest<{ message: string }>(`/api/v1/rooms/${roomId}/start`, { method: 'POST' }),
  completeRoom: (roomId: string) =>
    apiRequest<{ message: string }>(`/api/v1/rooms/${roomId}/complete`, { method: 'POST' }),
  getRoomReport: (roomId: string) =>
    apiRequest<RoomReportResponse>(`/api/v1/rooms/${roomId}/report`),

  // ── Team APIs ──
  createTeam: (payload: { name: string; description?: string }) =>
    apiRequest<TeamResponse>('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTeams: () => apiRequest<TeamResponse[]>('/api/v1/teams'),
  joinTeam: (invite_code: string) =>
    apiRequest<TeamResponse>('/api/v1/teams/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code }),
    }),
  getTeam: (teamId: string) => apiRequest<TeamResponse>(`/api/v1/teams/${teamId}`),
  getTeamAnalytics: (teamId: string) => apiRequest<TeamAnalytics>(`/api/v1/teams/${teamId}/analytics`),
};

// ── Team Types ──
export type TeamMemberResponse = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_name?: string;
  user_email?: string;
};

export type TeamResponse = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
  members: TeamMemberResponse[];
};

export type TeamMemberAnalytics = {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  role: string;
  joined_at: string;
  sessions_count: number;
  average_score: number | null;
};

export type TeamAnalytics = {
  average_score: number;
  average_clarity: number;
  average_confidence: number;
  average_pacing: number;
  average_vision: number;
  total_sessions: number;
  member_count: number;
  members: TeamMemberAnalytics[];
};

// ── Room Types ──
export type RoomResponse = {
  id: string;
  code: string;
  title: string;
  mode: string;
  max_participants: number;
  status: string;
  host_user_id: string;
  participant_count: number;
};

export type ParticipantInfo = {
  id: string;
  user_id: string;
  display_name: string;
  team: string | null;
  role: string;
};

export type RoomDetailResponse = {
  id: string;
  code: string;
  title: string;
  mode: string;
  max_participants: number;
  status: string;
  host_user_id: string;
  participants: ParticipantInfo[];
};

export type IndividualReport = {
  user_id: string;
  display_name: string;
  confidence_score: number;
  clarity_score: number;
  content_score: number;
  delivery_score: number;
  overall_score: number;
  eye_contact_score: number;
  voice_energy_score: number;
  engagement_score: number;
  speaking_time_seconds: number;
  interruption_count: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

export type GroupMetrics = {
  discussion_balance: number;
  dominant_speaker: string;
  dominant_speaker_name: string;
  engagement_level: string;
  teamwork_quality: number;
  total_duration_seconds: number;
  speaking_distribution: Record<string, number>;
};

export type RoomReportResponse = {
  room_id: string;
  mode: string;
  individual_reports: IndividualReport[];
  group_metrics: GroupMetrics;
  team_reports: { team: string; team_score: number; members: IndividualReport[] }[] | null;
  winner: string | null;
};
