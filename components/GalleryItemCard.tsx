import React, { useState, useEffect } from 'react';
import type { GalleryItem } from '../types';
import { DownloadIcon, ReplayIcon, TrashIcon, ImageIcon, SparklesIcon } from './IconComponents';

interface GalleryItemCardProps {
  item: GalleryItem;
  onDelete: (id: string) => void;
  onReuse: (item: GalleryItem) => void;
  t: (key: string) => string;
  style?: React.CSSProperties;
  apiKey: string;
}

export const GalleryItemCard: React.FC<GalleryItemCardProps> = ({ item, onDelete, onReuse, t, style, apiKey }) => {
  const isVideo = item.type === 'video';
  const isImage = item.type === 'image';
  // FIX: Corrected a type comparison that was causing an error due to a missing type in the GalleryItem union. The type has been added in types.ts.
  const isNano = item.type === 'nano_banana';
  const isBuilder = item.type === 'image_builder';
  const isImageFusion = item.type === 'image_fusion';

  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(isVideo);

  useEffect(() => {
    if (item.type !== 'video' || !apiKey) return;

    let objectUrl: string;
    let isMounted = true;

    const fetchAndSetVideo = async () => {
      setIsVideoLoading(true);
      try {
        const response = await fetch(`${item.videoUrl}&key=${apiKey}`);
        if (!response.ok) {
          throw new Error('Failed to fetch video for gallery');
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setVideoObjectUrl(objectUrl);
        }
      } catch (err) {
        console.error("Error fetching gallery video:", err);
        if (isMounted) {
          setVideoObjectUrl(null); // Indicate failure
        }
      } finally {
        if (isMounted) {
          setIsVideoLoading(false);
        }
      }
    };

    fetchAndSetVideo();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item, apiKey]);

  const downloadDataUrl = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getBuilderDisplayImage = () => {
    if (item.type !== 'image_builder') return null;
    const lastStepImage = item.steps[item.steps.length - 1]?.resultImage;
    const imageToShow = lastStepImage || item.initialImage;
    return `data:${imageToShow.mimeType};base64,${imageToShow.base64}`;
  };

  const getImageFusionDisplayImage = () => {
    if (item.type !== 'image_fusion') return null;
    const imagePart = item.resultParts.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    return `data:${item.sceneImage.mimeType};base64,${item.sceneImage.base64}`; // Fallback to scene
  };
  
  const getNanoDisplayImage = () => {
    if (item.type !== 'nano_banana') return null;
    const imagePart = item.resultParts.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    if (item.inputImages.length > 0) { // Fallback to input
        return `data:${item.inputImages[0].mimeType};base64,${item.inputImages[0].base64}`;
    }
    return null;
  };

  const modelToDisplay =
    (item.type === 'image' && item.model) ||
    (item.type === 'nano_banana' && item.model) ||
    (item.type === 'image_builder' && item.model) ||
    (item.type === 'image_fusion' && item.model);

  const renderDownloadButton = () => {
    if (item.type === 'video') {
      return (
        <a
          href={videoObjectUrl || '#'}
          download={`video-${item.id}.mp4`}
          className={`flex items-center justify-center p-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95 ${!videoObjectUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={t('downloadButton')}
          onClick={(e) => !videoObjectUrl && e.preventDefault()}
        >
          <DownloadIcon />
        </a>
      );
    }

    let url: string | null = null;
    let filename = `generated-${item.id}`;

    if (item.type === 'image') {
      url = item.imageUrls[0];
      filename += '.jpeg';
    } else if (item.type === 'nano_banana') {
      const imagePart = item.resultParts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        const ext = imagePart.inlineData.mimeType.split('/')[1] || 'png';
        url = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        filename = `edited-${item.id}.${ext}`;
      }
    } else if (item.type === 'image_builder') {
      url = getBuilderDisplayImage();
      if (url) {
        const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
        const ext = mimeType.split('/')[1] || 'png';
        filename = `build-${item.id}.${ext}`;
      }
    } else if (item.type === 'image_fusion') {
      url = getImageFusionDisplayImage();
      if (url) {
        const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
        const ext = mimeType.split('/')[1] || 'png';
        filename = `fusion-${item.id}.${ext}`;
      }
    }

    if (url) {
      const finalUrl = url;
      return (
        <button
          onClick={() => downloadDataUrl(finalUrl, filename)}
          className="flex items-center justify-center p-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
          title={t('downloadImageButton')}
        >
          <DownloadIcon />
        </button>
      );
    }
    return null;
  };

  const nanoDisplayUrl = getNanoDisplayImage();

  const getCardTitle = () => {
    if (item.type === 'image_builder') return `Initial: ${item.steps[0]?.prompt}`;
    if (item.type === 'image_fusion') return t('imageFusionResultTitle');
    return item.prompt;
  };

  const getCardText = () => {
    if (item.type === 'image_builder') return `"${item.steps[item.steps.length - 1]?.prompt || 'Initial Image'}"`;
    if (item.type === 'image_fusion') return t('imageFusionResultTitle');
    if (item.type === 'nano_banana') return item.prompt;
    return item.prompt;
  };

  return (
    <div 
        className="bg-gray-100 dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden flex flex-col animate-slide-in-from-right"
        style={style}
    >
      <div className="aspect-video w-full bg-black relative">
        {isVideo ? (
            <>
              {isVideoLoading && (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              {videoObjectUrl && !isVideoLoading && (
                <video src={videoObjectUrl} controls loop className="w-full h-full object-contain" />
              )}
              {!videoObjectUrl && !isVideoLoading && (
                <div className="w-full h-full flex items-center justify-center bg-black text-white p-2 text-center text-xs">
                  {t('videoFailedToLoad')}
                </div>
              )}
            </>
        ) : isImage ? (
            <>
                <img src={item.imageUrls[0]} alt={item.prompt} className="w-full h-full object-contain" />
                {item.imageUrls.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <ImageIcon />
                        <span>+{item.imageUrls.length - 1}</span>
                    </div>
                )}
            </>
        ) : isNano ? (
            <>
              {nanoDisplayUrl ? (
                <img src={nanoDisplayUrl} alt={item.prompt} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black text-white p-2 text-center text-xs">No image to display.</div>
              )}
              {item.resultParts.filter(p => p.inlineData).length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <ImageIcon />
                      <span>+{item.resultParts.filter(p => p.inlineData).length - 1}</span>
                  </div>
              )}
            </>
        ) : isBuilder ? (
            <>
              <img src={getBuilderDisplayImage()!} alt="Image builder final result" className="w-full h-full object-contain" />
               <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <SparklesIcon />
                  <span>{item.steps.length} steps</span>
              </div>
            </>
        ) : isImageFusion ? (
            <>
                <img src={getImageFusionDisplayImage()!} alt="Fused image" className="w-full h-full object-contain" />
            </>
        ): null}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        {(item.type === 'image' || modelToDisplay) && (
            <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
              {item.type === 'image' && (
                  <>
                    <span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{item.aspectRatio}</span>
                    <span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{item.resolution.toUpperCase()}</span>
                  </>
              )}
              {modelToDisplay && (
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full" title={modelToDisplay}>
                    {t(`modelName.${modelToDisplay.replace(/\./g, '_').replace(/-/g, '_')}`) !== `modelName.${modelToDisplay.replace(/\./g, '_').replace(/-/g, '_')}`
                      ? t(`modelName.${modelToDisplay.replace(/\./g, '_').replace(/-/g, '_')}`)
                      : modelToDisplay}
                  </span>
              )}
            </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow line-clamp-3" title={getCardTitle()}>
          {getCardText()}
        </p>
        <div className="flex items-center justify-between gap-2 mt-auto">
          <button
            onClick={() => onReuse(item)}
            className="flex items-center justify-center gap-2 p-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95 flex-1 text-xs"
            title={t('reusePrompt')}
          >
            <ReplayIcon />
            <span>{t('reusePrompt')}</span>
          </button>
          
          {renderDownloadButton()}

          <button
            onClick={() => onDelete(item.id)}
            className="flex items-center justify-center p-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
            title={t('deleteVideo')}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
};