const API_BASE_URL = '';

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

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('acc_token') : null;
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
    throw new Error(payload.detail || 'Request failed');
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
  me: () => apiRequest<{ email: string; full_name: string; level: number; xp: number; streak_days: number }>('/api/v1/auth/me'),
  modules: () => apiRequest<ModuleItem[]>('/api/v1/modules'),
  analytics: () => apiRequest<AnalyticsOverview>('/api/v1/analytics/overview'),
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
    }>(`/api/v1/sessions/${sessionId}/complete`, { method: 'POST' })
};
