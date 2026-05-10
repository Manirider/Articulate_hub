// API configuration service
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  signup: `${API_BASE_URL}/api/v1/auth/signup`,
  login: `${API_BASE_URL}/api/v1/auth/login`,
  googleLogin: `${API_BASE_URL}/api/v1/auth/google`,
  userStats: `${API_BASE_URL}/api/v1/auth/me`,
  leaderboard: `${API_BASE_URL}/api/v1/analytics/leaderboard`,
  userProgress: `${API_BASE_URL}/api/v1/analytics/overview`,
  modules: `${API_BASE_URL}/api/v1/modules`,
  analytics: `${API_BASE_URL}/api/v1/analytics/overview`,
};

export function getAuthHeader(token: string) {
  return {
    "Authorization": `Bearer ${token}`,
  };
}

export function getJsonHeader() {
  return {
    "Content-Type": "application/json",
  };
}

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("token");
  const headers = {
    ...options.headers,
    ...(token && getAuthHeader(token)),
  };

  return fetch(endpoint, {
    ...options,
    headers,
  });
}
