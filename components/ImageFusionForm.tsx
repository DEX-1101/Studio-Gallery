

import React, { useState, useRef, useEffect } from 'react';
import type { ImageData, NanoBananaResultPart } from '../types';
// FIX: Corrected import path for Progress type.
import type { Progress } from '../types';
import { UploadIcon, TargetIcon, SpinnerIcon, UndoIcon, RedoIcon, DownloadIcon, PlusCircleIcon, ReplayIcon, CancelGenerationIcon, MagicWandIcon } from './IconComponents';

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface ImageFusionFormProps {
  onSubmit: (data: { product: File, scene: File, dropPosition: { xPercent: number, yPercent: number }}) => void;
  isGenerating: boolean;
  isCancelling: boolean;
  progress: Progress;
  error: string | null;
  t: (key: string) => string;
  productImage: { data: ImageData; preview: string; file: File; } | null;
  sceneImage: { data: ImageData; preview: string; file: File; } | null;
  onProductUpload: (image: { data: ImageData; preview: string; file: File; } | null) => void;
  onSceneUpload: (image: { data: ImageData; preview: string; file: File; } | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  result: NanoBananaResultPart[] | null;
  onStartOver: () => void;
  onUseAsScene: () => void;
  showDownloadButton: boolean;
  onCancel: () => void;
}

const ImageUploader: React.FC<{
    image: { preview: string } | null;
    onImageSelect: (file: File) => void;
    onRemove: () => void;
    title: string;
    tooltip: string;
    t: (key: string) => string;
    disabled: boolean;
}> = ({ image, onImageSelect, onRemove, title, tooltip, t, disabled }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setError(null);
            const file = event.target.files?.[0];
            if (file) {
                if (!ACCEPTED_TYPES.includes(file.type)) {
                    setError(t('invalidFileTypeError'));
                    return;
                }
                if (file.size > MAX_SIZE_BYTES) {
                    setError(t('fileTooLargeError'));
                    return;
                }
                onImageSelect(file);
            }
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ACCEPTED_TYPES.join(',')} className="hidden" disabled={disabled} />
            <div 
                onClick={() => !disabled && fileInputRef.current?.click()}
                className={`group w-full aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 relative ${disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800/50' : 'cursor-pointer hover:border-brand-primary dark:hover:border-brand-primary hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                title={tooltip}
            >
                {image ? (
                    <>
                        <img src={image.preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md p-1" />
                        {!disabled && (
                            <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove image"
                                title={t('tooltips.removeImage')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </>
                ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                        <UploadIcon className={`mx-auto h-8 w-8 text-gray-400 ${!disabled && 'group-hover:animate-bounce-subtle'}`} />
                        <p className="mt-2 text-sm">{t('imageUploadButton')}</p>
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-brand-danger mt-1">{error}</p>}
        </div>
    );
};

const downloadImage = (base64Image: string, mimeType: string) => {
    const extension = mimeType.split('/')[1] || 'png';
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Image}`;
    link.download = `image-fusion-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const ImageFusionForm: React.FC<ImageFusionFormProps> = ({ 
    onSubmit, 
    isGenerating, 
    isCancelling,
    progress, 
    error, 
    t, 
    productImage, 
    sceneImage, 
    onProductUpload, 
    onSceneUpload,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    result,
    onStartOver,
    onUseAsScene,
    showDownloadButton,
    onCancel
}) => {
  const [selectionPoint, setSelectionPoint] = useState<{ x: number, y: number } | null>(null);
  const sceneImageRef = useRef<HTMLImageElement>(null);
  const [showDebug, setShowDebug] = useState(false);
  const isDisabled = isGenerating || isCancelling;
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isGenerating && !isCancelling) {
      const startTime = Date.now();
      intervalId = window.setInterval(() => {
        setTimer(Date.now() - startTime);
      }, 100);
    } else {
      setTimer(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isGenerating, isCancelling]);
  
  const handleImageUpload = (side: 'product' | 'scene') => (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      const imageState = {
        data: { base64: base64String, mimeType: file.type },
        preview: URL.createObjectURL(file),
        file,
      };
      if (side === 'product') {
        onProductUpload(imageState);
      } else {
        onSceneUpload(imageState);
        setSelectionPoint(null);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const handleSceneClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!sceneImageRef.current || isDisabled) return;
      const rect = sceneImageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      setSelectionPoint({ x, y });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!productImage || !sceneImage || !selectionPoint || isDisabled) return;

    onSubmit({
        product: productImage.file,
        scene: sceneImage.file,
        dropPosition: {
            xPercent: selectionPoint.x * 100,
            yPercent: selectionPoint.y * 100
        },
    });
  };

  const handleStartOver = () => {
      setShowDebug(false);
      setSelectionPoint(null);
      onStartOver();
  };

  const handleUseAsScene = () => {
      setShowDebug(false);
      setSelectionPoint(null);
      onUseAsScene();
  };

  const progressKeys = ['resizing', 'marking', 'describing', 'composing', 'cropping'];
  const currentStepKey = progressKeys.find(key => progress[key] === 'in-progress');
  const progressText = currentStepKey ? t(`progress.${currentStepKey}`) : (isCancelling ? t('cancellingGenerationButton') : t('generatingButton'));

  const finalImagePart = result?.find(part => part.text === 'Final Result' && part.inlineData);
  const debugImagePart = result?.find(part => part.text?.includes('Debug') && part.inlineData);

  let debugTitle = debugImagePart?.text || '';
  let debugPrompt = '';
  if (debugImagePart?.text?.includes('|PROMPT|')) {
    const parts = debugImagePart.text.split('|PROMPT|');
    debugTitle = parts[0];
    debugPrompt = parts[1];
  }

  if (result && !isGenerating && finalImagePart?.inlineData) {
    return (
        <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center animate-fade-in-scale-up">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-6 text-center">{t('imageFusionReadyTitle')}</h2>
            
            <div className="w-full space-y-4 mb-6">
                <div className="relative group aspect-video rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    <img 
                        src={`data:${finalImagePart.inlineData.mimeType};base64,${finalImagePart.inlineData.data}`} 
                        alt={t('imageResultAlt')} 
                        className="w-full h-full object-contain bg-black"
                    />
                    {showDownloadButton && (
                        <button
                            onClick={() => downloadImage(finalImagePart.inlineData!.data, finalImagePart.inlineData!.mimeType)}
                            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                            title={t('tooltips.downloadResult')}
                        >
                            <DownloadIcon />
                        </button>
                    )}
                </div>

                {showDebug && debugImagePart?.inlineData && (
                    <div className="animate-fade-in space-y-2">
                         <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-gray-200">{debugTitle}</h3>
                         <div className="aspect-video rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <img 
                                src={`data:${debugImagePart.inlineData.mimeType};base64,${debugImagePart.inlineData.data}`} 
                                alt="Debug view" 
                                className="w-full h-full object-contain bg-black"
                            />
                        </div>
                        {debugPrompt && (
                            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Final Prompt Used by Model:</h4>
                                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">{debugPrompt.trim()}</pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full">
                {debugImagePart && (
                    <button
                        onClick={() => setShowDebug(s => !s)}
                        className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95 text-center"
                        title={t('tooltips.toggleDebugView')}
                    >
                        {showDebug ? t('hideDebugImage') : t('showDebugImage')}
                    </button>
                )}
                <button
                    onClick={handleUseAsScene}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-secondary hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
                    title={t('tooltips.useAsScene')}
                >
                    <PlusCircleIcon />
                    {t('addAnotherProductButton')}
                </button>
                <button
                    onClick={handleStartOver}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
                    title={t('tooltips.startOver')}
                >
                    <ReplayIcon />
                    {t('startOverButton')}
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <div className="flex justify-center items-center gap-4 mb-4">
                <button type="button" onClick={onUndo} disabled={isDisabled || !canUndo} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700" title={t('tooltips.undo')}>
                    <UndoIcon /> {t('undoButton')}
                </button>
                <button type="button" onClick={onRedo} disabled={isDisabled || !canRedo} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700" title={t('tooltips.redo')}>
                    <RedoIcon /> {t('redoButton')}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploader image={productImage} onImageSelect={handleImageUpload('product')} onRemove={() => onProductUpload(null)} title={t('productImageLabel')} tooltip={t('tooltips.uploadProduct')} t={t} disabled={isDisabled} />
              <ImageUploader image={sceneImage} onImageSelect={handleImageUpload('scene')} onRemove={() => onSceneUpload(null)} title={t('sceneImageLabel')} tooltip={t('tooltips.uploadScene')} t={t} disabled={isDisabled} />
            </div>
            
            {sceneImage && (
                <div className="space-y-2 animate-fade-in">
                     <label className="block text-sm font-medium text-center text-gray-700 dark:text-gray-300">{t('selectLocationPrompt')}</label>
                     <div className={`p-1 rounded-xl transition-all duration-300 ${isGenerating ? 'tracer-border-active' : 'bg-transparent'}`}>
                        <div className={`relative w-full ${isDisabled ? 'cursor-wait' : 'cursor-pointer'}`} onClick={handleSceneClick} title={t('tooltips.selectPlacement')}>
                            <img 
                                ref={sceneImageRef} 
                                src={sceneImage.preview} 
                                alt="Scene" 
                                className="w-full h-auto rounded-lg transition-all duration-300"
                            />
                            {selectionPoint && !isGenerating && (
                                <div 
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-fade-in-scale-up"
                                    style={{ left: `${selectionPoint.x * 100}%`, top: `${selectionPoint.y * 100}%` }}
                                >
                                    <div className="w-12 h-12 bg-blue-500/50 rounded-full border-2 border-blue-400 shadow-[0_0_15px_5px_rgba(59,130,246,0.7)] animate-pulse"></div>
                                </div>
                            )}
                            {isGenerating && (
                                <>
                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent bg-400% animate-shimmer"></div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 animate-fade-in">
                                        <p className="font-bold text-lg drop-shadow-md">{t('progress.title')}</p>
                                        <p className="text-sm mt-1 drop-shadow-md">{progressText}...</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {error && <p className="text-sm text-center text-brand-danger mt-2 animate-fade-in">{error}</p>}
        
        <div>
          <button
            type={isGenerating ? "button" : "submit"}
            onClick={isGenerating ? onCancel : undefined}
            disabled={isCancelling || (!isGenerating && (!productImage || !sceneImage || !selectionPoint))}
            className={`w-full py-3 px-4 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-150 ease-in-out active:scale-95 ${
                isGenerating
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 bg-200% animate-gradient-pulse'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 bg-200% animate-gradient-pulse'
            }`}
            title={isGenerating ? t('tooltips.cancelGeneration') : t('tooltips.generateFusion')}
          >
            {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                    <CancelGenerationIcon isLarge={isGenerating} />
                    {isCancelling ? t('cancellingGenerationButton') : `${(timer / 1000).toFixed(1)}s`}
                </span>
            ) : (
                <span className="flex items-center justify-center gap-2">
                  <MagicWandIcon />
                  {t('generateFusionButton')}
                </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};