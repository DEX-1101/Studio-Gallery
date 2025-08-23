import React from 'react';

interface LoadingScreenProps {
  t: (key: string) => string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ t }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg transition-colors duration-300">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('loadingTitle')}</h2>
      <div className="w-full max-w-sm">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div className="w-1/2 h-full bg-purple-600 rounded-full animate-indeterminate-bar"></div>
        </div>
      </div>
      <div className="w-full max-w-sm h-24 mt-4 relative overflow-x-clip">
        <img 
          src="https://github.com/DEX-1101/VEO3-Generator/raw/refs/heads/main/resource/doro.webp" 
          alt="Loading animation"
          className="h-20 w-20 object-contain absolute animate-run-left"
          style={{ top: '50%' }}
        />
      </div>
    </div>
  );
};