

import React from 'react';
import { ReplayIcon, DownloadIcon } from './IconComponents';
import type { NanoBananaResultPart } from '../types';

interface ImageFusionResultProps {
  resultParts: NanoBananaResultPart[];
  onCreateAnother: () => void;
  t: (key: string) => string;
}

const downloadImage = (base64Image: string, mimeType: string) => {
    const extension = mimeType.split('/')[1] || 'png';
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Image}`;
    link.download = `fused-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const ImageFusionResult: React.FC<ImageFusionResultProps> = ({ resultParts, onCreateAnother, t }) => {
    const finalImagePart = resultParts.find(part => part.inlineData);

    return (
        <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center transition-colors duration-300">
            <h2 
              className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-6 text-center animate-slide-in-from-right"
              style={{ animationDelay: '100ms' }}
            >
              {t('imageFusionReadyTitle')}
            </h2>
            
            {finalImagePart?.inlineData && (
                <div 
                  className="w-full relative group aspect-video rounded-lg overflow-hidden mb-6 border-2 border-gray-200 dark:border-gray-700 animate-slide-in-from-right"
                  style={{ animationDelay: '200ms' }}
                >
                    <img 
                        src={`data:${finalImagePart.inlineData.mimeType};base64,${finalImagePart.inlineData.data}`} 
                        alt={t('imageResultAlt')} 
                        className="w-full h-full object-contain bg-black"
                    />
                    <button
                        onClick={() => downloadImage(finalImagePart.inlineData!.data, finalImagePart.inlineData!.mimeType)}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('tooltips.downloadResult')}
                    >
                        <DownloadIcon />
                    </button>
                </div>
            )}
            
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
