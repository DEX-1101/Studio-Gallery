
import React, { useState, useRef, useEffect } from 'react';
import type { ImageData } from '../types';
import { UploadIcon, CancelGenerationIcon, ClearInputIcon, MagicWandIcon } from './IconComponents';
import { ImageEditModelSelector } from './ImageEditModelSelector';
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea';

const MAX_IMAGES = 10;
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface NanoBananaFormProps {
  onSubmit: () => void;
  t: (key: string) => string;
  prompt: string;
  setPrompt: (prompt: string) => void;
  images: { data: ImageData; preview: string }[];
  setImages: React.Dispatch<React.SetStateAction<{ data: ImageData; preview: string }[]>>;
  model: string;
  setModel: (model: string) => void;
  isGenerating?: boolean;
  isCancelling?: boolean;
  onCancel: () => void;
}

export const NanoBananaForm: React.FC<NanoBananaFormProps> = ({
  onSubmit,
  t,
  prompt,
  setPrompt,
  images,
  setImages,
  model,
  setModel,
  isGenerating = false,
  isCancelling = false,
  onCancel,
}) => {
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(textareaRef, prompt);
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setImageError(null);
      
      const filesToProcess = Array.from(files);

      for (const file of filesToProcess) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setImageError(t('invalidFileTypeError'));
          if (event.target) event.target.value = '';
          return;
        }
        if (file.size > MAX_SIZE_BYTES) {
          setImageError(t('fileTooLargeError'));
          if (event.target) event.target.value = '';
          return;
        }
      }

      const newImages = filesToProcess.slice(0, MAX_IMAGES - images.length);
      
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setImages(prevImages => [
            ...prevImages,
            {
              data: { base64: base64String, mimeType: file.type },
              preview: URL.createObjectURL(file),
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset the file input value to allow re-selecting the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImageError(null);
    setImages(images.filter((_, i) => i !== index));
  };

  const triggerFileSelect = () => {
    if (isDisabled) return;
    setImageError(null);
    fileInputRef.current?.click();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || images.length === 0 || isGenerating) return;
    onSubmit();
  };

  const handleClear = () => {
    setPrompt('');
    setImages([]);
    setImageError(null);
  };

  return (
    <div className={`p-1 rounded-xl transition-all duration-300 ${isGenerating ? 'tracer-border-active' : ''}`}>
      <div className={`w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl border ${isGenerating ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'} transition-colors duration-300`}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <ImageEditModelSelector model={model} setModel={setModel} t={t} disabled={isDisabled} />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('nanoBananaImageLabel')} ({images.length}/{MAX_IMAGES})
              </label>
              <input
                type="file"
                id="image-upload-nano"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                multiple
                disabled={isDisabled}
              />
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                  {images.map((image, index) => (
                      <div key={index} className="relative group aspect-square">
                          <img src={image.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                          <button 
                              type="button" 
                              onClick={() => removeImage(index)}
                              disabled={isDisabled}
                              className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                              aria-label="Remove image"
                              title={t('tooltips.removeImage')}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                          </button>
                      </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <div
                        onClick={triggerFileSelect}
                        onKeyDown={(e) => { if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); triggerFileSelect(); } }}
                        role="button"
                        tabIndex={isDisabled ? -1 : 0}
                        aria-label={images.length > 0 ? t('nanoBananaChangeButton') : t('nanoBananaUploadButton')}
                        className={`group relative w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isDisabled
                            ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800/50'
                            : 'cursor-pointer hover:border-brand-primary dark:hover:border-brand-primary hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        } border-gray-300 dark:border-gray-600`}
                        title={images.length > 0 ? t('tooltips.addMoreImages') : t('tooltips.uploadInitialImage')}
                    >
                        <div className="text-center text-gray-500 dark:text-gray-400 p-2">
                            <UploadIcon className={`mx-auto h-6 w-6 text-gray-400 ${!isDisabled && 'group-hover:animate-bounce-subtle'}`} />
                            <p className="mt-1 text-xs">
                                {images.length > 0 ? t('nanoBananaChangeButton') : t('nanoBananaUploadButton')}
                            </p>
                        </div>
                    </div>
                  )}
              </div>
              {imageError && <p className="text-sm text-center text-brand-danger mt-4">{imageError}</p>}
              {images.length >= MAX_IMAGES && (
                  <p className="text-sm text-center text-brand-accent mt-2">{t('maxImagesWarning')}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="prompt-nano" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('promptLabel')}
                </label>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isDisabled || (!prompt.trim() && images.length === 0)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('clearInputsButton')}
                >
                  <ClearInputIcon className="h-4 w-4" />
                  {t('clearButton')}
                </button>
              </div>
              <div className="relative">
                <textarea
                  id="prompt-nano"
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('nanoBananaPromptPlaceholder')}
                  rows={3}
                  className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 pb-16 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 resize-none overflow-y-hidden"
                  required
                  disabled={isDisabled}
                />
                {isGenerating && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg pointer-events-none animate-fade-in bg-gradient-to-r from-transparent via-white/20 to-transparent bg-400% animate-shimmer"></div>
                )}
                <div className="absolute bottom-3 right-3">
                  <button
                    type={isGenerating ? "button" : "submit"}
                    onClick={isGenerating ? onCancel : undefined}
                    disabled={isCancelling || (!isGenerating && (!prompt.trim() || images.length === 0))}
                    className={`py-2 px-6 text-white font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-150 ease-in-out active:scale-95 ${
                        isGenerating
                            ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 bg-200% animate-gradient-pulse'
                            : 'bg-gradient-to-r from-yellow-500 to-red-500 bg-200% animate-gradient-pulse'
                    }`}
                    title={isGenerating ? t('tooltips.cancelGeneration') : t('tooltips.generate')}
                  >
                    {isGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                            <CancelGenerationIcon isLarge={isGenerating} />
                            {isCancelling ? t('cancellingGenerationButton') : `${(timer / 1000).toFixed(1)}s`}
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <MagicWandIcon />
                            {t('editButton')}
                        </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};