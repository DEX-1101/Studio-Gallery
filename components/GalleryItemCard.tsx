import React from 'react';
import type { GalleryItem } from '../types';
import { DownloadIcon, ReuseIcon, TrashIcon } from './IconComponents';

interface GalleryItemCardProps {
  item: GalleryItem;
  onDelete: (id: string) => void;
  onReuse: (item: GalleryItem) => void;
  t: (key: string) => string;
  style?: React.CSSProperties;
}

export const GalleryItemCard: React.FC<GalleryItemCardProps> = ({ item, onDelete, onReuse, t, style }) => {
  return (
    <div 
        className="bg-gray-100 dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden flex flex-col animate-slide-in-from-right"
        style={style}
    >
      <div className="aspect-video w-full bg-black">
        <video src={item.videoUrl} controls loop className="w-full h-full object-contain" />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow line-clamp-3" title={item.prompt}>
          {item.prompt}
        </p>
        <div className="flex items-center justify-between gap-2 mt-auto">
          <button
            onClick={() => onReuse(item)}
            className="flex items-center justify-center gap-2 p-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95 flex-1 text-xs"
            title={t('reusePrompt')}
          >
            <ReuseIcon />
            <span>{t('reusePrompt')}</span>
          </button>
          <a
            href={item.videoUrl}
            download={`video-${item.id}.mp4`}
            className="flex items-center justify-center p-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
            title={t('downloadButton')}
          >
            <DownloadIcon />
          </a>
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