/**
 * API Service with Fallback Support
 * 
 * This module provides graceful degradation when the backend is unavailable.
 * It uses localStorage for data persistence in offline/demo mode.
 */

import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Check if backend is available
let backendAvailable = true;
let lastBackendCheck = 0;

export async function isBackendAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - lastBackendCheck < 30000) { // Cache for 30 seconds
    return backendAvailable;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    backendAvailable = response.ok;
  } catch {
    backendAvailable = false;
  }
  
  lastBackendCheck = now;
  return backendAvailable;
}

// Removed hardcoded dummy data for production credibility

export async function apiRequestWithFallback<T>(
  path: string, 
  options: RequestInit = {},
  fallbackData?: T
): Promise<T> {
  const token = typeof window !== 'undefined' ? getToken() : null;
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined)
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    backendAvailable = true;
    return (await response.json()) as T;
    
  } catch (error) {
    console.warn(`[API Fallback] Request failed: ${path}`, error);
    backendAvailable = false;
    
    // Return fallback data if provided
    if (fallbackData !== undefined) {
      console.log('[API Fallback] Using fallback data');
      return fallbackData;
    }
    
    // We no longer return fake/dummy data in production.
    // Let the error propagate so the UI can show a proper offline state.
    
    throw error;
  }
}

// Export original apiRequest for compatibility
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiRequestWithFallback(path, options);
}

// Re-export types from original api.ts
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

// Demo mode indicator
export function isDemoMode(): boolean {
  return !backendAvailable;
}
