import { useState, useEffect, useCallback, useMemo } from 'react';

// The error `Failed to resolve module specifier` occurs because browsers,
// without a bundler like Webpack or Vite, cannot directly import JSON files
// as modules. This updated hook fetches the JSON files using the `fetch` API.

type Locale = 'en' | 'id';
type Translations = Record<string, any>;

// A simple in-memory cache to avoid re-fetching language files on every switch.
const translationsCache: Partial<Record<Locale, Translations>> = {};

const getNestedValue = (obj: any, key: string): string => {
  // Handles nested keys like "header.title"
  return key.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const useI18n = () => {
  const [locale, setLocale] = useState<Locale>(() => {
    // Get the saved locale from localStorage or default to 'id'
    const savedLocale = localStorage.getItem('locale');
    return (savedLocale === 'en' || savedLocale === 'id') ? savedLocale : 'id';
  });

  // State to hold the currently active translation dictionary
  const [translations, setTranslations] = useState<Translations | null>(
    translationsCache[locale] || null
  );

  useEffect(() => {
    // Persist locale changes to localStorage
    localStorage.setItem('locale', locale);

    const loadTranslations = async () => {
      // If the language is already in cache, use it directly
      if (translationsCache[locale]) {
        setTranslations(translationsCache[locale]!);
        return;
      }

      // Fetch the JSON file from the public `locales` directory
      try {
        const response = await fetch(`./locales/${locale}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load translations for ${locale}`);
        }
        const data = await response.json();
        translationsCache[locale] = data; // Cache the fetched data
        setTranslations(data);
      } catch (error) {
        console.error(error);
        // Set to an empty object on failure to prevent the app from crashing
        setTranslations({});
      }
    };

    loadTranslations();
  }, [locale]);

  const t = useCallback((key: string): string => {
    // While translations are loading, `translations` will be null.
    // Return an empty string to avoid rendering untranslated keys.
    if (!translations) {
      return '';
    }
    const translation = getNestedValue(translations, key);
    // Fallback to the key itself if a translation is not found.
    // This is helpful for spotting missing translations during development.
    return translation || key;
  }, [translations]);
  
  const loadingMessages = useMemo(() => {
    if (!translations || !translations.loadingMessages) {
        return [];
    }
    return Object.values(translations.loadingMessages) as string[];
  }, [translations]);


  return { t, setLocale, locale, loadingMessages };
};