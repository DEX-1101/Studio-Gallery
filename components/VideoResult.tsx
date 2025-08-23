import React from 'react';
import { DownloadIcon, ReplayIcon } from './IconComponents';

interface VideoResultProps {
  videoUrl: string;
  onReset: () => void;
  t: (key: string) => string;
}

export const VideoResult: React.FC<VideoResultProps> = ({ videoUrl, onReset, t }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center transition-colors duration-300">
      <h2 
        className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-6 text-center animate-slide-in-from-right"
        style={{ animationDelay: '100ms' }}
      >
        {t('videoReadyTitle')}
      </h2>
      
      <div 
        className="w-full aspect-video rounded-lg overflow-hidden mb-6 border-2 border-gray-200 dark:border-gray-700 animate-slide-in-from-right"
        style={{ animationDelay: '200ms' }}
      >
        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain bg-black">
          Your browser does not support the video tag.
        </video>
      </div>

      <div 
        className="flex flex-col sm:flex-row gap-4 w-full animate-slide-in-from-right"
        style={{ animationDelay: '300ms' }}
      >
        <a
          href={videoUrl}
          download="generated-video.mp4"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-secondary hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95 text-center"
        >
          <DownloadIcon />
          {t('downloadButton')}
        </a>
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
        >
          <ReplayIcon />
          {t('createAnotherButton')}
        </button>
      </div>
    </div>
  );
};