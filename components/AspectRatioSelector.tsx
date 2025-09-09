
import React from 'react';
import type { AspectRatio } from '../types';

interface AspectRatioOption {
  value: AspectRatio;
  label: string;
}

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  options: AspectRatioOption[];
  disabled?: boolean;
  t: (key: string) => string;
}

const AspectRatioIcon: React.FC<{ ratio: AspectRatio }> = ({ ratio }) => {
  const dimensions = {
    '1:1': { width: 24, height: 24 },
    '16:9': { width: 32, height: 18 },
    '9:16': { width: 18, height: 32 },
    '4:3': { width: 28, height: 21 },
    '3:4': { width: 21, height: 28 },
  };
  const { width, height } = dimensions[ratio];

  return (
    <svg viewBox="0 0 36 36" className="w-8 h-8 mx-auto mb-1" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect 
        x={(36 - width) / 2} 
        y={(36 - height) / 2} 
        width={width} 
        height={height} 
        rx="2" 
        className="stroke-current" 
        strokeWidth="2"
      />
    </svg>
  );
};

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  t,
}) => {
  const tooltipKeys: Record<AspectRatio, string> = {
    '1:1': 'tooltips.aspectRatioSquare',
    '16:9': 'tooltips.aspectRatioLandscape',
    '9:16': 'tooltips.aspectRatioPortrait',
    '4:3': 'tooltips.aspectRatioWide',
    '3:4': 'tooltips.aspectRatioTall',
  };

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          title={t(tooltipKeys[option.value])}
          className={`
            flex-1 min-w-[70px] sm:min-w-[80px] p-2 sm:p-3 border rounded-lg text-center transition-all duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800
            ${disabled 
              ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700' 
              : value === option.value
                ? 'bg-blue-100 dark:bg-blue-900/50 border-brand-primary text-brand-primary font-bold shadow-md scale-105'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
          aria-pressed={value === option.value}
        >
          <AspectRatioIcon ratio={option.value} />
          <span className="text-xs sm:text-sm">{option.label}</span>
        </button>
      ))}
    </div>
  );
};
