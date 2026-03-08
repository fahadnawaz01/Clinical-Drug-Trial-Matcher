import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locales/en/translation.json';
import translationHI from './locales/hi/translation.json';
import translationMR from './locales/mr/translation.json';
import translationBN from './locales/bn/translation.json';
import translationTA from './locales/ta/translation.json';
import translationTE from './locales/te/translation.json';

// Translation resources
const resources = {
  en: { translation: translationEN },
  hi: { translation: translationHI },
  mr: { translation: translationMR },
  bn: { translation: translationBN },
  ta: { translation: translationTA },
  te: { translation: translationTE },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Fallback language
    lng: 'en', // Default language
    debug: true, // Enable debug to see language changes
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng', // Key to store language in localStorage
    },
    
    react: {
      useSuspense: false, // Disable suspense to avoid loading issues
      bindI18n: 'languageChanged loaded', // Re-render on language change
      bindI18nStore: 'added removed', // Re-render on resource changes
    },
  });

export default i18n;
