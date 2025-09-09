


import React, { useState } from 'react';
import { DownloadIcon, ReplayIcon } from './IconComponents';
import { ImageViewer } from './ImageViewer';

interface ImageResultProps {
  imageUrls: string[];
  onCreateAnother: () => void;
  t: (key: string) => string;
  showDownloadButton: boolean;
}

const downloadImage = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
    const extension = mimeType.split('/')[1] || 'jpeg';
    link.download = `generated-image-${Date.now()}-${index}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const ImageResult: React.FC<ImageResultProps> = ({ imageUrls, onCreateAnother, t, showDownloadButton }) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  return (
    <>
      <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center transition-colors duration-300">
        <h2 
          className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-6 text-center animate-slide-in-from-right"
          style={{ animationDelay: '100ms' }}
        >
          {t('imageReadyTitle')}
        </h2>
        
        <div 
          className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-slide-in-from-right"
          style={{ animationDelay: '200ms' }}
        >
          {imageUrls.map((url, index) => (
              <div 
                key={index} 
                className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => setSelectedImageUrl(url)}
                title={t('tooltips.viewImage')}
              >
                  <img 
                      src={url} 
                      alt={`${t('imageResultAlt')} ${index + 1}`} 
                      className="w-full h-full object-contain bg-black transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300" />
                  {showDownloadButton && (
                    <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(url, index + 1)
                        }}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                        title={t('downloadImageButton')}
                    >
                        <DownloadIcon />
                    </button>
                  )}
              </div>
          ))}
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

      {selectedImageUrl && (
        <ImageViewer 
          imageUrl={selectedImageUrl} 
          onClose={() => setSelectedImageUrl(null)} 
          t={t} 
        />
      )}
    </>
  );
};
