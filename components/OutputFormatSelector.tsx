
import React from 'react';

interface OutputFormatSelectorProps {
  value: 'image/jpeg' | 'image/png';
  onChange: (value: 'image/jpeg' | 'image/png') => void;
  disabled?: boolean;
  t: (key: string) => string;
}

export const OutputFormatSelector: React.FC<OutputFormatSelectorProps> = ({ value, onChange, disabled, t }) => {
  const options = [
    { label: 'JPG', value: 'image/jpeg' as const, tooltipKey: 'tooltips.setOutputFormatJpg' },
    { label: 'PNG', value: 'image/png' as const, tooltipKey: 'tooltips.setOutputFormatPng' },
  ];

  return (
    <div className={`flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 transition-opacity ${disabled ? 'opacity-50' : ''}`}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          title={t(option.tooltipKey)}
          className={`w-full px-3 py-1 text-sm font-semibold rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-700 focus:ring-brand-primary ${
            value === option.value
              ? 'bg-white dark:bg-gray-800 text-brand-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
          }`}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
