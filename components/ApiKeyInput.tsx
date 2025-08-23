import React, { useState } from 'react';
import { KeyIcon } from './IconComponents';

interface ApiKeyInputProps {
  onSave: (apiKey: string) => void;
  t: (key: string) => string;
  initialKey?: string;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSave, t, initialKey = '' }) => {
  const [key, setKey] = useState(initialKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-200 mb-2">{t('apiKeyTitle')}</h2>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{t('apiKeySubtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <KeyIcon />
           </div>
           <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t('apiKeyPlaceholder')}
            className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 pl-10 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200"
            required
            aria-label="API Key Input"
          />
        </div>
        <button
          type="submit"
          disabled={!key.trim()}
          className="w-full py-3 px-4 bg-brand-primary hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-transform duration-150 ease-in-out active:scale-95"
        >
          {t('apiKeyButton')}
        </button>
      </form>
    </div>
  );
};