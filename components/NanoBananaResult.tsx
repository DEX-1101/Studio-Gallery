


import React from 'react';
import { ReplayIcon, DownloadIcon } from './IconComponents';
import type { NanoBananaResultPart } from '../types';

interface NanoBananaResultProps {
  resultParts: NanoBananaResultPart[];
  onCreateAnother: () => void;
  t: (key: string) => string;
  model?: string;
  showDownloadButton: boolean;
}

const downloadImage = (base64Image: string, mimeType: string) => {
    const extension = mimeType.split('/')[1] || 'png';
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Image}`;
    link.download = `edited-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const NanoBananaResult: React.FC<NanoBananaResultProps> = ({ resultParts, onCreateAnother, t, model, showDownloadButton }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center transition-colors duration-300">
      <h2 
        className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-2 text-center animate-slide-in-from-right"
        style={{ animationDelay: '100ms' }}
      >
        {t('nanoBananaResultTitle')}
      </h2>
      
      {model && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">Generated with: <span className="font-semibold">{model}</span></p>}

      <div 
        className="w-full space-y-4 mb-6 animate-slide-in-from-right"
        style={{ animationDelay: '200ms' }}
      >
        {resultParts.map((part, index) => {
            if (part.text) {
                return (
                    <div key={index} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{part.text}</p>
                    </div>
                )
            }
            if (part.inlineData) {
                return (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <img 
                            src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                            alt={`Generated content ${index + 1}`} 
                            className="w-full h-full object-contain bg-black"
                        />
                         {showDownloadButton && (
                            <button
                                onClick={() => downloadImage(part.inlineData!.data, part.inlineData!.mimeType)}
                                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                                title={t('tooltips.downloadResult')}
                            >
                                <DownloadIcon />
                            </button>
                         )}
                    </div>
                )
            }
            return null;
        })}
      </div>

      <div 
        className="w-full animate-slide-in-from-right"
        style={{ animationDelay: '300ms' }}
      >
        <button
          onClick={onCreateAnother}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
          title={t('tooltips.createAnother')}
        >
          <ReplayIcon />
          {t('createAnotherButton')}
        </button>
      </div>
    </div>
  );
};
