
import React from 'react';

interface LanguageSwitcherProps {
  currentLocale: string;
  setLocale: (locale: 'en' | 'id') => void;
  disabled?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLocale, setLocale, disabled = false }) => {
  const languages = [
    { code: 'en', name: 'English', short: 'EN' },
    { code: 'id', name: 'Indonesia', short: 'ID' },
  ];

  return (
    <div className="flex justify-center items-center space-x-1 bg-gray-200 dark:bg-gray-700 rounded-full p-1 shadow-inner">
      {languages.map(({ code, name, short }) => {
        const isActive = currentLocale === code;
        
        let dynamicClasses = '';
        if (isActive) {
            if (code === 'en') {
                dynamicClasses = 'bg-gradient-to-r from-blue-500 to-red-500 text-white shadow-md focus:ring-brand-primary';
            } else if (code === 'id') {
                dynamicClasses = 'bg-red-500 text-white shadow-md focus:ring-red-400';
            }
        } else {
            dynamicClasses = 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50 focus:ring-brand-primary';
        }

        return (
            <button
              key={code}
              onClick={() => setLocale(code as 'en' | 'id')}
              disabled={disabled}
              className={`px-3 py-1 text-xs sm:text-sm font-bold rounded-full transform transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-200 dark:focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${dynamicClasses}`}
              title={name}
            >
              {short}
            </button>
        );
      })}
    </div>
  );
};
