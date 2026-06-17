export const SUPPORTED_LANGUAGES = [
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳', rtl: false },
  { code: 'hi', name: 'Hindi',     native: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'ar', name: 'Arabic',    native: 'العربية', flag: '🇦🇪', rtl: true  },
  { code: 'ta', name: 'Tamil',     native: 'தமிழ்',  flag: '🇮🇳', rtl: false },
  { code: 'te', name: 'Telugu',    native: 'తెలుగు', flag: '🇮🇳', rtl: false },
  { code: 'ur', name: 'Urdu',      native: 'اردو',   flag: '🇵🇰', rtl: true  },
  { code: 'fr', name: 'French',    native: 'Français',flag: '🇫🇷', rtl: false },
  { code: 'es', name: 'Spanish',   native: 'Español', flag: '🇪🇸', rtl: false },
];
export const CEFR_LEVELS = [
  { code: 'A1', label: 'Beginner',     color: '#22c55e' },
  { code: 'A2', label: 'Elementary',   color: '#84cc16' },
  { code: 'B1', label: 'Intermediate', color: '#eab308' },
  { code: 'B2', label: 'Upper-Int',    color: '#f97316' },
  { code: 'C1', label: 'Advanced',     color: '#ef4444' },
  { code: 'C2', label: 'Mastery',      color: '#8b5cf6' },
];
export const WORD_CATEGORIES = {
  A1: ['Family','Food','Colors','Numbers','Animals','Daily Life'],
  A2: ['Travel','Shopping','Health','Education','Work'],
  B1: ['Technology','Emotions','Environment','Communication'],
  B2: ['Business','Media','Leadership','Society'],
  C1: ['Academic','Research','Psychology','Economics'],
  C2: ['Literature','Philosophy','Advanced Professional'],
};
export const STATUS_CONFIG = {
  new:      { label: 'New',      color: '#6b7280', icon: '○' },
  learning: { label: 'Learning', color: '#f59e0b', icon: '◑' },
  familiar: { label: 'Familiar', color: '#3b82f6', icon: '◕' },
  mastered: { label: 'Mastered', color: '#22c55e', icon: '●' },
};
export const getLangConfig = (code) => SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
export const getLevelConfig = (code) => CEFR_LEVELS.find(l => l.code === code) || CEFR_LEVELS[0];