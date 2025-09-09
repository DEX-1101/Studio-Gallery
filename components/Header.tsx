import React from 'react';

interface HeaderProps {
  t: (key: string) => string;
}

export const Header: React.FC<HeaderProps> = ({ t }) => {
  return (
    <header className="w-full text-center my-4 sm:my-8">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold flex items-end justify-center gap-2 sm:gap-4">
        <img 
            src="https://github.com/DEX-1101/VEO3-Generator/raw/refs/heads/main/resource/doro.webp" 
            alt="Doro icon" 
            className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 rounded-full object-cover" 
        />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 leading-tight bg-200% animate-gradient-pulse">
          {t('headerTitle')}
        </span>
      </h1>
      <p className="mt-2 text-base sm:text-lg text-gray-500 dark:text-gray-400">
        {t('headerSubtitle')}
      </p>
    </header>
  );
};