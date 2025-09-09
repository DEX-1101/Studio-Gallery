

import React from 'react';
import type { GalleryItem } from '../types';
import { GalleryItemCard } from './GalleryItemCard';
import { CloseIcon } from './IconComponents';

interface GalleryProps {
  isOpen: boolean;
  onClose: () => void;
  items: GalleryItem[];
  onDelete: (id: string) => void;
  onReuse: (item: GalleryItem) => void;
  t: (key: string) => string;
  apiKey: string;
}

export const Gallery: React.FC<GalleryProps> = ({ isOpen, onClose, items, onDelete, onReuse, t, apiKey }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-in-from-right"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-200">{t('galleryTitle')}</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close gallery"
            title={t('tooltips.closeGallery')}
          >
            <CloseIcon />
          </button>
        </header>
        <main className="overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">{t('emptyGallery')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, index) => (
                <GalleryItemCard 
                  key={item.id} 
                  item={item} 
                  onDelete={onDelete}
                  onReuse={onReuse}
                  t={t}
                  apiKey={apiKey}
                  style={{ animationDelay: `${100 + index * 80}ms` }}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
