import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './IconComponents';

interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface CustomModelSelectorProps {
  options: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  t: (key: string) => string;
}

export const CustomModelSelector: React.FC<CustomModelSelectorProps> = ({
  options,
  value,
  onChange,
  label,
  disabled = false,
  t,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.id === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const gradientTextClasses = "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 bg-200% animate-gradient-pulse";

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-left focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={t('tooltips.selectModel')}
      >
        <span className="flex items-center gap-3">
          {selectedOption.icon}
          <span className={`font-medium ${gradientTextClasses}`}>{selectedOption.name}</span>
        </span>
        <ChevronDownIcon className={`transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in-scale-up"
          role="listbox"
        >
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 ${value === option.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
              role="option"
              aria-selected={value === option.id}
              title={t('tooltips.selectModelOption')}
            >
              <div className="flex-shrink-0 mt-1">{option.icon}</div>
              <div>
                <p className={`font-semibold ${gradientTextClasses}`}>{option.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};