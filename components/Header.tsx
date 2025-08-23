import React from 'react';

interface HeaderProps {
  t: (key: string) => string;
}

export const Header: React.FC<HeaderProps> = ({ t }) => {
  return (
    <header className="w-full text-center my-8">
      <h1 className="text-4xl sm:text-5xl font-extrabold flex items-center justify-center gap-4">
        <img 
            src="https://github.com/DEX-1101/VEO3-Generator/raw/refs/heads/main/resource/doro.webp" 
            alt="Doro icon" 
            className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover" 
        />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
          {t('headerTitle')}
        </span>
      </h1>
      <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
        {t('headerSubtitle')}
      </p>
    </header>
  );
};
