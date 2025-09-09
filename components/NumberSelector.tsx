
import React from 'react';

interface NumberSelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  t: (key: string) => string;
}

export const NumberSelector: React.FC<NumberSelectorProps> = ({ value, onChange, min = 1, max = 4, disabled = false, t }) => {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const tooltipKeys: Record<number, string> = {
    1: 'tooltips.setNumImages1',
    2: 'tooltips.setNumImages2',
    3: 'tooltips.setNumImages3',
    4: 'tooltips.setNumImages4',
  };

  return (
    <div className="flex items-center gap-2">
      {numbers.map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          disabled={disabled}
          title={t(tooltipKeys[num])}
          className={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-brand-primary
            ${disabled
              ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
              : value === num
                ? 'bg-blue-100 dark:bg-blue-900/50 border-brand-primary text-brand-primary shadow-md scale-105'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
          aria-pressed={value === num}
        >
          {num}
        </button>
      ))}
    </div>
  );
};
