'use client';

import { useCallback, useState } from 'react';
import { api } from '@/services/api';

type LanguageInfo = {
  code: string;
  name: string;
  native_name: string;
  flag: string;
  direction: string;
};

/**
 * Hook for managing language selection across the platform.
 * Persists selection to localStorage and provides a consistent API.
 */
export function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en-US';
    return localStorage.getItem('acc_language') || 'en-US';
  });

  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLanguages = useCallback(async () => {
    if (languages.length > 0) return languages;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/v1/config/languages`
      );
      if (response.ok) {
        const data = await response.json();
        setLanguages(data.languages || []);
        return data.languages || [];
      }
    } catch {
      // Fallback - use client-side data
    } finally {
      setIsLoading(false);
    }
    return [];
  }, [languages]);

  const setLanguage = useCallback((code: string) => {
    setCurrentLanguage(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('acc_language', code);
    }
  }, []);

  return {
    currentLanguage,
    languages,
    isLoading,
    setLanguage,
    fetchLanguages,
  };
}
