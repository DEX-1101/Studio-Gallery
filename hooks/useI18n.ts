
import { useState, useEffect, useCallback } from 'react';

type Translations = Record<string, any>;
type Locale = 'en' | 'id';

const getNestedValue = (obj: any, key: string): string => {
  return key.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const useI18n = () => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    return savedLocale || 'en';
  });
  const [translations, setTranslations] = useState<Translations | null>(null);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`./locales/${locale}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load translations for ${locale}`);
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error(error);
        // Fallback to English if the selected locale fails.
        if (locale !== 'en') {
          console.warn('Falling back to English translations.');
          setLocaleState('en');
        } else {
          setTranslations({});
        }
      }
    };

    loadTranslations();
  }, [locale]); // Rerun effect when locale changes.

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem('locale', newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: string): string => {
    if (!translations) {
      return '';
    }
    const translation = getNestedValue(translations, key);
    return translation || key;
  }, [translations]);

  return { t, setLocale, locale };
};
