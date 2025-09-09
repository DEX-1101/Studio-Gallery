

import React, { useState, useRef, useEffect } from 'react';
import type { ImageData } from '../types';
import { UploadIcon, ReplayIcon, TrashIcon, CancelGenerationIcon, DownloadIcon, ClearInputIcon, MagicWandIcon, CopyIcon, CheckIcon, CloseIcon, PaperclipIcon } from './IconComponents';
import { ImageEditModelSelector } from './ImageEditModelSelector';
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea';
import { ImageViewer } from './ImageViewer';

const MAX_IMAGES = 10;
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface ImageBuilderFlowProps {
  t: (key: string) => string;
  initialImages: { data: ImageData; preview: string }[] | null;
  steps: { prompt: string; resultImage: { data: ImageData; preview: string } }[];
  isLoading: boolean;
  isCancelling: boolean;
  error: string | null;
  onSubmit: (params: { prompt: string; initialImages?: { data: ImageData; preview: string; }[]; additionalImages?: { data: ImageData; preview: string; }[]; }) => void;
  onReset: () => void;
  onDeleteStep: (index: number) => void;
  onRegenerate: (index: number) => void;
  model: string;
  setModel: (model: string) => void;
  onCancel: () => void;
}

// Extracted GlowCard to the top-level of the module to prevent React errors.
const GlowCard: React.FC<{
    children: React.ReactNode; 
    isGlowing: boolean; 
    animationClass: string;
    className?: string;
}> = ({ children, isGlowing, animationClass, className = '' }) => {
  const borderClasses = isGlowing
    ? 'tracer-border-active'
    : 'bg-gray-200 dark:bg-gray-700';

  return (
    <div className={`p-1 rounded-xl transition-all duration-300 ${borderClasses} ${animationClass}`}>
      <div className={`bg-white dark:bg-gray-900 p-3 rounded-lg h-full ${className}`}>
        {children}
      </div>
    </div>
  );
};

export const ImageBuilderFlow: React.FC<ImageBuilderFlowProps> = ({
  t,
  initialImages,
  steps,
  isLoading,
  isCancelling,
  error,
  onSubmit,
  onReset,
  onDeleteStep,
  onRegenerate,
  model,
  setModel,
  onCancel,
}) => {
  const [prompt, setPrompt] = useState('');
  const [localInitialImages, setLocalInitialImages] = useState<{ data: ImageData; preview: string }[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const flowEndRef = useRef<HTMLDivElement>(null);
  
  const initialTextareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(initialTextareaRef, prompt);
  const followupTextareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(followupTextareaRef, prompt);
  
  const isDisabled = isLoading || isCancelling;
  const [timer, setTimer] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [additionalImages, setAdditionalImages] = useState<{ data: ImageData; preview: string }[]>([]);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);

  // Effect to clear the form after a new step is successfully generated and added.
  const prevStepsLength = useRef(steps.length);
  useEffect(() => {
      if (steps.length > prevStepsLength.current) {
          // A new step was added, so clear the prompt and any attached images for the next input.
          setPrompt('');
          additionalImages.forEach(img => URL.revokeObjectURL(img.preview));
          setAdditionalImages([]);
      }
      prevStepsLength.current = steps.length;
  }, [steps, additionalImages]);


  const downloadImage = (imageUrl: string, name: string | number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
    const extension = mimeType.split('/')[1] || 'jpeg';
    link.download = `iterative-edit-${name}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  useEffect(() => {
    let intervalId: number | undefined;
    if (isLoading && !isCancelling) {
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
  }, [isLoading, isCancelling]);

  useEffect(() => {
    // Scroll to the latest part of the conversation smoothly
    flowEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps, isLoading]);

  // Effect to handle reset
  useEffect(() => {
    // When the parent component resets the flow by setting initialImages to null,
    // this effect ensures the local state of the initial form is also cleared,
    // presenting a fresh start to the user.
    if (initialImages === null) {
      localInitialImages.forEach(img => URL.revokeObjectURL(img.preview));
      setLocalInitialImages([]);
      setPrompt('');
      setImageError(null);
    }
    // This effect is intentionally dependent only on `initialImages` to detect the reset signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialImages]);

  const handleDelete = (index: number) => {
    setDeletingIndex(index);
    setTimeout(() => {
      onDeleteStep(index);
      setDeletingIndex(null);
    }, 300); // Corresponds to the fade-out animation duration
  };

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

      const newImages = filesToProcess.slice(0, MAX_IMAGES - localInitialImages.length);
      
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setLocalInitialImages(prevImages => [
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
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleAdditionalImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

      const newImages = filesToProcess.slice(0, MAX_IMAGES - additionalImages.length);
      
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setAdditionalImages(prevImages => [
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
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveAdditionalImage = (index: number) => {
      setImageError(null);
      const imageToRemove = additionalImages[index];
      if(imageToRemove) {
          URL.revokeObjectURL(imageToRemove.preview);
      }
      setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    setImageError(null);
    setLocalInitialImages(localInitialImages.filter((_, i) => i !== index));
  };

  const triggerFileSelect = () => {
    if (isDisabled) return;
    fileInputRef.current?.click();
  }

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || localInitialImages.length === 0 || isDisabled) return;
    // FIX: Pass a single object to onSubmit to match the new signature.
    onSubmit({ prompt, initialImages: localInitialImages });
  };
  
  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isDisabled) return;
    // FIX: Pass a single object to onSubmit to match the new signature.
    onSubmit({ prompt, additionalImages });
  };
  
  const handleClearInitial = () => {
    setPrompt('');
    localInitialImages.forEach(img => URL.revokeObjectURL(img.preview));
    setLocalInitialImages([]);
    setImageError(null);
  };

  const handleResetFlow = () => {
      setPrompt('');
      additionalImages.forEach(img => URL.revokeObjectURL(img.preview));
      setAdditionalImages([]);
      onReset();
  };

  // If there's no session started yet, show the initial form.
  if (!initialImages) {
    return (
      <>
        <div className={`p-1 rounded-xl transition-all duration-300 ${isLoading ? 'tracer-border-active' : ''}`}>
          <div className={`w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border ${isLoading ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'}`}>
            <form onSubmit={handleInitialSubmit}>
              <div className="space-y-6">
                <ImageEditModelSelector model={model} setModel={setModel} t={t} disabled={isDisabled} />
                <div className="animate-fade-in-scale-up">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('imageBuilderInitialImageLabel')} ({localInitialImages.length}/{MAX_IMAGES})
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    disabled={isDisabled}
                    multiple
                  />
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                      {localInitialImages.map((image, index) => (
                          <div 
                            key={index} 
                            className="relative group aspect-square"
                          >
                              <img src={image.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button 
                                      type="button" 
                                      onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                      disabled={isDisabled}
                                      className="bg-black/50 text-white rounded-full p-2 hover:bg-red-500 hover:scale-110 transition-all disabled:opacity-0"
                                      aria-label="Remove image"
                                      title={t('tooltips.removeImage')}
                                  >
                                      <CloseIcon className="h-5 w-5"/>
                                  </button>
                              </div>
                          </div>
                      ))}
                      {localInitialImages.length < MAX_IMAGES && (
                        <div
                            onClick={triggerFileSelect}
                            onKeyDown={(e) => { if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); triggerFileSelect(); } }}
                            role="button"
                            tabIndex={isDisabled ? -1 : 0}
                            aria-label={localInitialImages.length > 0 ? t('imageBuilder.addMoreButton') : t('imageBuilder.uploadButton')}
                            className={`group relative w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300 ${
                              isDisabled
                                ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800/50'
                                : 'cursor-pointer hover:border-brand-primary dark:hover:border-brand-primary hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            } border-gray-300 dark:border-gray-600`}
                            title={localInitialImages.length > 0 ? t('tooltips.addMoreImages') : t('tooltips.uploadInitialImage')}
                        >
                            <div className="text-center text-gray-500 dark:text-gray-400 p-2">
                                <UploadIcon className={`mx-auto h-6 w-6 text-gray-400 ${!isDisabled && 'group-hover:animate-bounce-subtle'}`} />
                                <p className="mt-1 text-xs">
                                    {localInitialImages.length > 0 ? t('imageBuilder.addMoreButton') : t('imageBuilder.uploadButton')}
                                </p>
                            </div>
                        </div>
                      )}
                  </div>
                  {imageError && <p className="text-sm text-center text-brand-danger mt-4">{imageError}</p>}
                  {localInitialImages.length >= MAX_IMAGES && (
                      <p className="text-sm text-center text-brand-accent mt-2">{t('maxImagesWarning')}</p>
                  )}
                </div>

                <div className="animate-fade-in-scale-up" style={{ animationDelay: '100ms' }}>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="prompt-builder-initial" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('promptLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={handleClearInitial}
                      disabled={isDisabled || (!prompt.trim() && localInitialImages.length === 0)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('clearInputsButton')}
                    >
                      <ClearInputIcon className="h-4 w-4" />
                      {t('clearButton')}
                    </button>
                  </div>
                  <div className="relative">
                      <textarea
                          id="prompt-builder-initial"
                          ref={initialTextareaRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={t('imageBuilderInitialPromptPlaceholder')}
                          rows={3}
                          disabled={isDisabled}
                          className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 pb-16 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 resize-none overflow-y-hidden"
                          required
                      />
                      {isLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg pointer-events-none animate-fade-in bg-gradient-to-r from-transparent via-white/20 to-transparent bg-400% animate-shimmer"></div>
                      )}
                      <div className="absolute bottom-3 right-3">
                          <button
                              type={isLoading ? "button" : "submit"}
                              onClick={isLoading ? onCancel : undefined}
                              disabled={isCancelling || (!isLoading && (!prompt.trim() || localInitialImages.length === 0))}
                              className={`py-2 px-6 text-white font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-150 ease-in-out active:scale-95 ${
                                  isLoading
                                      ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 bg-200% animate-gradient-pulse'
                                      : 'bg-gradient-to-r from-purple-500 to-pink-500 bg-200% animate-gradient-pulse'
                              }`}
                              title={isLoading ? t('tooltips.cancelGeneration') : t('tooltips.generateInitialImage')}
                          >
                              {isLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                      <CancelGenerationIcon isLarge={isLoading} />
                                      {isCancelling ? t('cancellingGenerationButton') : `${(timer / 1000).toFixed(1)}s`}
                                  </span>
                              ) : (
                                  <span className="flex items-center justify-center gap-2">
                                      <MagicWandIcon />
                                      {t('imageBuilderStartButton')}
                                  </span>
                              )}
                          </button>
                      </div>
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-center text-brand-danger mt-2 animate-fade-in">{error}</p>}
            </form>
          </div>
        </div>
      </>
    );
  }

  // If a session has started, show the conversation flow.
  return (
     <>
      <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('imageBuilderMode')}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
              Model: {model}
            </span>
          </div>
          <div className="space-y-6">
              {/* Initial Image */}
              <GlowCard isGlowing={isLoading && steps.length === 0} animationClass="">
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Initial Image{initialImages.length > 1 ? 's' : ''}</p>
                  <div className={`grid gap-2 ${initialImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {initialImages.map((image, index) => (
                          <div 
                            key={index} 
                            className="relative group rounded-md overflow-hidden"
                          >
                              <img src={image.preview} alt={`Initial image ${index + 1}`} className="rounded-md w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none h-1/4" />
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); downloadImage(image.preview, `initial-${index}`); }}
                                      className="bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-green-500 hover:scale-110 transition-all"
                                      title={t('tooltips.downloadStep')}
                                  >
                                      <DownloadIcon />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </GlowCard>
              
              {/* Steps */}
              {steps.map((step, index) => (
                  <GlowCard 
                      key={index} 
                      isGlowing={isLoading && index === steps.length - 1}
                      animationClass={deletingIndex === index ? 'animate-fade-out-scale-down' : ''}
                      className="animate-fade-in-scale-up"
                  >
                      <div className="relative group rounded-md overflow-hidden">
                          <img src={step.resultImage.preview} alt={`Result of: ${step.prompt}`} className="rounded-md w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                          
                          {/* Overlay for text and buttons */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              {/* Top gradient for prompt readability */}
                              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

                              {/* Prompt at the top */}
                              <div className="absolute top-2 left-2 right-2 flex justify-between items-start gap-2">
                                  <p className="flex-grow text-sm font-normal italic text-white break-words drop-shadow-md line-clamp-2">"{step.prompt}"</p>
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(step.prompt, index); }}
                                      className="flex-shrink-0 p-1.5 text-white bg-black bg-opacity-50 rounded-full transition-all hover:bg-opacity-75"
                                      title={copiedIndex === index ? "Copied!" : "Copy prompt"}
                                  >
                                      {copiedIndex === index ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
                                  </button>
                              </div>
                              
                              {/* Bottom gradient for button readability */}
                              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                              
                              {/* Action buttons at the bottom */}
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 transition-all duration-300">
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onRegenerate(index); }}
                                      disabled={isDisabled || index !== steps.length - 1}
                                      className="bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-blue-500 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                      title={index === steps.length - 1 ? t('tooltips.regenerateStep') : t('tooltips.regenerateStepDisabled')}
                                  >
                                      <ReplayIcon />
                                  </button>
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); downloadImage(step.resultImage.preview, index + 1); }}
                                      className="bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-green-500 hover:scale-110 transition-all"
                                      title={t('tooltips.downloadStep')}
                                  >
                                      <DownloadIcon />
                                  </button>
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                      disabled={isDisabled}
                                      className="bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-red-500 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                      title={t('tooltips.deleteStep')}
                                  >
                                      <TrashIcon />
                                  </button>
                              </div>
                          </div>
                      </div>
                  </GlowCard>
              ))}
              <div ref={flowEndRef} />
          </div>
          
          {/* Follow-up Form */}
          <div className="mt-8">
              {imageError && <p className="text-sm text-center text-brand-danger mb-2">{imageError}</p>}
              {error && <p className="text-sm text-center text-brand-danger mb-4 animate-fade-in">{error}</p>}
              
              {additionalImages.length > 0 && (
                  <div className="mb-4 p-2 border-2 border-dashed rounded-lg animate-fade-in-scale-up">
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {additionalImages.map((image, index) => (
                              <div key={index} className="relative group aspect-square">
                                  <img src={image.preview} alt={`Additional preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                  <button 
                                      type="button" 
                                      onClick={() => handleRemoveAdditionalImage(index)}
                                      disabled={isDisabled}
                                      className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                                      title={t('tooltips.removeImage')}
                                  >
                                      <CloseIcon className="h-4 w-4" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

             <form onSubmit={handleFollowUpSubmit}>
                  <div className="relative">
                      <textarea
                          ref={followupTextareaRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={t('imageBuilderFollowUpPromptPlaceholder')}
                          rows={1}
                          disabled={isDisabled}
                          className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 pr-64 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary resize-none overflow-y-hidden"
                          aria-label={t('imageBuilderFollowUpPromptPlaceholder')}
                          required
                      />
                      <input type="file" ref={additionalImagesInputRef} onChange={handleAdditionalImagesChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={isDisabled} multiple />
                      {isLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg pointer-events-none animate-fade-in bg-gradient-to-r from-transparent via-white/20 to-transparent bg-400% animate-shimmer"></div>
                      )}
                      <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-2">
                          <button
                              type="button"
                              onClick={() => additionalImagesInputRef.current?.click()}
                              disabled={isDisabled}
                              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded-full"
                              title={t('tooltips.attachImage')}
                          >
                              <PaperclipIcon className="h-4 w-4" />
                          </button>
                          
                          {prompt && !isDisabled && (
                              <button
                                type="button"
                                onClick={() => setPrompt('')}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded-full"
                                aria-label={t('clearButton')}
                                title={t('clearButton')}
                              >
                                <ClearInputIcon className="h-4 w-4" />
                              </button>
                          )}
                          <button
                              type={isLoading ? "button" : "submit"}
                              onClick={isLoading ? onCancel : undefined}
                              disabled={isCancelling || (!isLoading && !prompt.trim())}
                              className={`py-2 px-4 text-white font-bold rounded-lg shadow-md disabled:opacity-50 transform transition-all duration-150 ease-in-out active:scale-95 whitespace-nowrap ${
                                  isLoading
                                      ? 'bg-gradient-to-r from-red-500 to-pink-500'
                                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                              }`}
                              title={isLoading ? t('tooltips.cancelGeneration') : t('tooltips.generateFollowUp')}
                          >
                              {isLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                      <CancelGenerationIcon />
                                      {isCancelling ? t('cancellingGenerationButton') : `${(timer / 1000).toFixed(1)}s`}
                                  </span>
                              ) : (
                                  <span className="flex items-center justify-center gap-2">
                                      <MagicWandIcon />
                                      {t('sendFollowUpButton')}
                                  </span>
                              )}
                          </button>
                      </div>
                  </div>
             </form>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
               <button
                  onClick={handleResetFlow}
                  disabled={isDisabled}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('tooltips.startNewBuild')}
              >
                  <ReplayIcon /> {t('createAnotherButton')}
              </button>
          </div>
       </div>
     </>
  );
};