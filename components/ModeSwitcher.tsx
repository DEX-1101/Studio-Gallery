
import React from 'react';
import { AppMode } from '../types';
import { VideoIcon, ImageIcon, MultiImageIcon, SparklesIcon, ImageFusionIcon, SceneBuildIcon } from './IconComponents';

interface ModeSwitcherProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  t: (key: string) => string;
  isDisabled?: boolean;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, setMode, t, isDisabled = false }) => {
  const baseClasses = "flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transform transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed";
  
  const activeClasses = "bg-white dark:bg-gray-800 shadow-lg scale-105 ring-2 ring-brand-primary";
  const inactiveClasses = "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600";
  
  // Define separate active classes for the text (gradient) and the icon (color animation)
  const activeTextClasses = "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 bg-200% animate-gradient-pulse font-extrabold";
  const activeIconClasses = "animate-icon-color-pulse";
  
  const modeConfigs = [
    { key: AppMode.VIDEO, label: t('videoMode'), description: t('videoModeDescription'), icon: <VideoIcon className="h-5 w-5" /> },
    { key: AppMode.IMAGE, label: t('imageMode'), description: t('imageModeDescription'), icon: <ImageIcon className="h-5 w-5" /> },
    { key: AppMode.IMAGE_BUILDER, label: t('imageBuilderMode'), description: t('imageBuilderModeDescription'), icon: <SparklesIcon className="h-5 w-5" /> },
    { key: AppMode.IMAGE_FUSION, label: t('homeCanvasMode'), description: t('homeCanvasModeDescription'), icon: <ImageFusionIcon className="h-5 w-5" /> },
    { key: AppMode.SCENE_BUILD, label: t('sceneBuildMode'), description: t('sceneBuildModeDescription'), icon: <SceneBuildIcon className="h-5 w-5" /> },
  ];

  const activeDescription = modeConfigs.find(m => m.key === mode)?.description ?? '';

  return (
    <div className="w-full max-w-4xl mx-auto my-4 text-center">
      <div className="flex flex-wrap justify-center items-center gap-2">
        {modeConfigs.map(config => {
          const isActive = mode === config.key;

          return (
            <button
              key={config.key}
              onClick={() => setMode(config.key)}
              className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              aria-pressed={isActive}
              disabled={isDisabled}
              title={config.description}
            >
              <span className="flex items-center justify-center gap-2">
                <span className={isActive ? activeIconClasses : ''}>{config.icon}</span>
                <span className={isActive ? activeTextClasses : ''}>{config.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p key={mode} className="mt-3 text-base font-medium h-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 bg-200% animate-gradient-pulse animate-fade-in">
        {activeDescription}
      </p>
    </div>
  );
};