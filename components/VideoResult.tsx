

import React from 'react';
import { DownloadIcon, ReplayIcon } from './IconComponents';

interface VideoResultProps {
  videoUrls: string[];
  onCreateAnother: () => void;
  t: (key: string) => string;
  showDownloadButton: boolean;
}

export const VideoResult: React.FC<VideoResultProps> = ({ videoUrls, onCreateAnother, t, showDownloadButton }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center transition-colors duration-300">
      <h2 
        className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-6 text-center animate-slide-in-from-right"
        style={{ animationDelay: '100ms' }}
      >
        {t('videoReadyTitle')}
      </h2>
      
      <div 
        className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-slide-in-from-right"
        style={{ animationDelay: '200ms' }}
      >
        {videoUrls.map((url, index) => (
            <div 
                key={index}
                className="w-full aspect-video rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 relative group"
            >
                <video src={url} controls autoPlay loop className="w-full h-full object-contain bg-black">
                Your browser does not support the video tag.
                </video>
                {showDownloadButton && (
                    <a
                        href={url}
                        download={`generated-video-${index + 1}.mp4`}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('tooltips.downloadVideo')}
                    >
                        <DownloadIcon />
                    </a>
                )}
            </div>
        ))}
      </div>

      <div 
        className="flex flex-col sm:flex-row gap-4 w-full animate-slide-in-from-right"
        style={{ animationDelay: '300ms' }}
      >
        <button
          onClick={onCreateAnother}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
          title={t('tooltips.createAnother')}
        >
          <ReplayIcon />
          {t('createAnotherButton')}
        </button>
      </div>
    </div>
  );
};
