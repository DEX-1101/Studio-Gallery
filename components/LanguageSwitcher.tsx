import React from 'react';

interface LanguageSwitcherProps {
  currentLocale: string;
  setLocale: (locale: 'en' | 'id') => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLocale, setLocale }) => {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'id', name: 'Indonesia' },
  ];

  const baseClasses = "px-4 py-2 text-sm font-medium rounded-md transform transition-transform duration-150 ease-in-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-brand-primary";
  const activeClasses = "bg-brand-primary text-white";
  const inactiveClasses = "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600";

  return (
    <div className="flex justify-center items-center space-x-2 my-4">
      {languages.map(({ code, name }) => (
        <button
          key={code}
          onClick={() => setLocale(code as 'en' | 'id')}
          className={`${baseClasses} ${currentLocale === code ? activeClasses : inactiveClasses}`}
        >
          {name}
        </button>
      ))}
    </div>
  );
};