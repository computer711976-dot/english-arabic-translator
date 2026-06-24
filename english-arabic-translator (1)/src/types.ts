export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface TranslationRecord {
  id: string;
  text: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  transliteration?: string;
  explanation?: string;
  timestamp: number;
  isFavorite: boolean;
}

export type AppTab = "translate" | "history" | "favorites";

export interface AppSettings {
  darkMode: boolean;
  offlineMode: boolean;
  voiceGender: "male" | "female";
  vibrateFeedback: boolean;
  appLocale: "en" | "ar"; // Dynamic Arabic/English UI localization!
}
