

import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon, ZoomInIcon, ZoomOutIcon, ReplayIcon, DownloadIcon } from './IconComponents';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
  t: (key: string) => string;
}

const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
    const extension = mimeType.split('/')[1] || 'jpeg';
    link.download = `generated-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose, t }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;
  const ZOOM_SENSITIVITY = 0.1;

  const handleZoom = (direction: 'in' | 'out', amount: number = 0.2) => {
    let newScale = direction === 'in' ? scale + amount : scale - amount;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    if (newScale === scale) return;

    // Reset position if zooming out and image is smaller than container
    if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
    }
    
    setScale(newScale);
  };
  
  const handleReset = () => {
      setScale(1);
      setPosition({ x: 0, y: 0 });
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (scale <= 1) return;
    setIsDragging(true);
    setStartDrag({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1) return;
    const newX = e.clientX - startDrag.x;
    const newY = e.clientY - startDrag.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? 'out' : 'in';
      handleZoom(direction, ZOOM_SENSITIVITY);
  }
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cursorClass = scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in';
  
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={t('imageResultAlt')}
          className={`max-w-full max-h-full object-contain transition-transform duration-100 ease-out ${cursorClass}`}
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
          draggable="false"
        />
      </div>

      {/* Controls */}
      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 bg-opacity-70 text-white rounded-full p-2 flex items-center gap-2 shadow-lg animate-fade-in-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => handleZoom('out')} className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50" title={t('zoomOutButton')} aria-label={t('zoomOutButton')} disabled={scale <= MIN_SCALE}>
          <ZoomOutIcon />
        </button>
        <span className="text-sm font-mono w-12 text-center select-none">{(scale * 100).toFixed(0)}%</span>
         <button onClick={() => handleZoom('in')} className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50" title={t('zoomInButton')} aria-label={t('zoomInButton')} disabled={scale >= MAX_SCALE}>
          <ZoomInIcon />
        </button>
        <div className="border-l border-white/20 h-6 mx-1"></div>
        <button onClick={handleReset} className="p-2 hover:bg-white/20 rounded-full transition-colors" title={t('resetZoomButton')} aria-label={t('resetZoomButton')}>
          <ReplayIcon />
        </button>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
            onClick={(e) => { e.stopPropagation(); downloadImage(imageUrl); }}
            className="p-2 bg-gray-900 bg-opacity-70 text-white rounded-full hover:bg-white/20 transition-colors"
            aria-label={t('downloadImageButton')}
            title={t('downloadImageButton')}
        >
            <DownloadIcon />
        </button>
        <button
            onClick={onClose}
            className="p-2 bg-gray-900 bg-opacity-70 text-white rounded-full hover:bg-white/20 transition-colors"
            aria-label={t('closeButton')}
            title={t('tooltips.closeViewer')}
        >
            <CloseIcon />
        </button>
      </div>
    </div>
  );
};
