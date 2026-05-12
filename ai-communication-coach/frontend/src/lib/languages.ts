/**
 * Frontend language configuration — mirrors backend language registry.
 * Single source of truth for all i18n-related operations on the client.
 */

export type SupportedLanguage = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English', flag: '🇬🇧', direction: 'ltr' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português', flag: '🇧🇷', direction: 'ltr' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文', flag: '🇨🇳', direction: 'ltr' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', direction: 'ltr' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', direction: 'ltr' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', direction: 'ltr' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', direction: 'ltr' },
];

export const DEFAULT_LANGUAGE_CODE = 'en-US';

export function getLanguageByCode(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code);
}

export function getLanguageOrDefault(code?: string | null): SupportedLanguage {
  if (!code) return SUPPORTED_LANGUAGES[0];
  return getLanguageByCode(code) ?? SUPPORTED_LANGUAGES[0];
}

/** Format a date using the user's selected locale */
export function formatDateLocale(date: string | Date, locale: string = DEFAULT_LANGUAGE_CODE): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
