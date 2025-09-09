


import React from 'react';
import { ReplayIcon, DownloadIcon, PlusCircleIcon } from './IconComponents';
import type { NanoBananaResultPart } from '../types';

interface HomeCanvasResultProps {
  resultParts: NanoBananaResultPart[];
  onStartOver: () => void;
  onUseAsScene: () => void;
  t: (key: string) => string;
  model?: string;
}

const downloadImage = (base64Image: string, mimeType: string) => {
    const extension = mimeType.split('/')[1] || 'png';
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Image}`;
    link.download = `home-canvas-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const HomeCanvasResult: React.FC<HomeCanvasResultProps> = ({ resultParts, onStartOver, onUseAsScene, t, model }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center transition-colors duration-300">
      <h2 
        className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-2 text-center animate-slide-in-from-right"
        style={{ animationDelay: '100ms' }}
      >
        {t('homeCanvasReadyTitle')}
      </h2>
      
      {model && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">Generated with: <span className="font-semibold">{model}</span></p>}

      <div 
        className="w-full space-y-4 mb-6 animate-slide-in-from-right"
        style={{ animationDelay: '200ms' }}
      >
        {resultParts.map((part, index) => {
          if (part.text) {
            return (
              <h3 key={index} className="text-xl font-semibold text-center text-gray-800 dark:text-gray-200 pt-4 first:pt-0">
                {part.text}
              </h3>
            );
          }
          if (part.inlineData) {
            return (
              <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                <img 
                  src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                  alt={t('imageResultAlt')} 
                  className="w-full h-full object-contain bg-black"
                />
                <button
                  onClick={() => downloadImage(part.inlineData!.data, part.inlineData!.mimeType)}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  title={t('downloadImageButton')}
                >
                  <DownloadIcon />
                </button>
              </div>
            );
          }
          return null;
        })}
      </div>

      <div 
        className="flex flex-col sm:flex-row gap-4 w-full animate-slide-in-from-right"
        style={{ animationDelay: '300ms' }}
      >
        <button
          onClick={onUseAsScene}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-secondary hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
        >
          <PlusCircleIcon />
          {t('addAnotherProductButton')}
        </button>
         <button
          onClick={onStartOver}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
        >
          <ReplayIcon />
          {t('startOverButton')}
        </button>
      </div>
    </div>
  );
};