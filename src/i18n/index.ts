import en from './en.json';
import ka from './ka.json';
import ru from './ru.json';

export type Language = 'en' | 'ka' | 'ru';
export type TranslationKey = keyof typeof en;

const translations: Record<Language, Record<string, string>> = { en, ka, ru };

const FLAG_MAP: Record<Language, string> = {
    en: '🇬🇧',
    ka: '🇬🇪',
    ru: '🇷🇺',
};

const LANGUAGE_NAMES: Record<Language, string> = {
    en: 'English',
    ka: 'ქართული',
    ru: 'Русский',
};

class I18n {
    private currentLanguage: Language = 'en';
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.loadSavedLanguage();
    }

    private loadSavedLanguage(): void {
        const saved = localStorage.getItem('ninja-slicer-language') as Language | null;
        if (saved && translations[saved]) {
            this.currentLanguage = saved;
        } else {
            // Detect from browser
            const browserLang = navigator.language.split('-')[0];
            if (browserLang === 'ka' || browserLang === 'ru') {
                this.currentLanguage = browserLang as Language;
            }
        }
    }

    get language(): Language {
        return this.currentLanguage;
    }

    setLanguage(lang: Language): void {
        if (lang !== this.currentLanguage && translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('ninja-slicer-language', lang);
            this.notifyListeners();
        }
    }

    t(key: TranslationKey): string {
        return translations[this.currentLanguage][key] || translations.en[key] || key;
    }

    getFlag(lang: Language): string {
        return FLAG_MAP[lang];
    }

    getLanguageName(lang: Language): string {
        return LANGUAGE_NAMES[lang];
    }

    getAllLanguages(): Language[] {
        return ['en', 'ka', 'ru'];
    }

    onChange(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(cb => cb());
    }
}

export const i18n = new I18n();
