
import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  onTryAgain: () => void;
  t: (key: string) => string;
}

const ErrorIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onTryAgain, t }) => {
  return (
    <div className="text-center p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-red-200 dark:border-red-800 animate-fade-in-scale-up">
      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/50 mb-4">
        <ErrorIcon />
      </div>
      <h2 className="text-2xl font-bold text-brand-danger mb-4">{t('generationFailedTitle')}</h2>
      <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-md mx-auto">{error}</p>
      <button
        onClick={onTryAgain}
        className="px-6 py-2 bg-brand-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
      >
        {t('tryAgainButton')}
      </button>
    </div>
  );
};
