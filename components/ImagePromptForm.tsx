

import React, { useState, useRef, useEffect } from 'react';
import type { AspectRatio, ImageResolution } from '../types';
import { SparklesIcon, CancelGenerationIcon, ImageIcon, ClearInputIcon, MagicWandIcon } from './IconComponents';
import { enhancePrompt } from '../services/geminiService';
import { AspectRatioSelector } from './AspectRatioSelector';
import { OutputFormatSelector } from './OutputFormatSelector';
import { NumberSelector } from './NumberSelector';
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea';
import { CustomModelSelector } from './CustomModelSelector';

interface ImagePromptFormProps {
  onSubmit: () => void;
  t: (key: string) => string;
  prompt: string;
  setPrompt: (prompt: string) => void;
  model: string;
  setModel: (model: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  numberOfImages: number;
  setNumberOfImages: (num: number) => void;
  resolution: ImageResolution;
  setResolution: (res: ImageResolution) => void;
  apiKey: string;
  isGenerating?: boolean;
  isCancelling?: boolean;
  outputMimeType: 'image/jpeg' | 'image/png';
  setOutputMimeType: (type: 'image/jpeg' | 'image/png') => void;
  onCancel: () => void;
}

const imageModels = [
    { id: 'imagen-3.0-generate-002', name: 'Imagen 3' },
    { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast' },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4' },
    { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4 Ultra' },
];

export const ImagePromptForm: React.FC<ImagePromptFormProps> = ({
  onSubmit,
  t,
  prompt,
  setPrompt,
  model,
  setModel,
  aspectRatio,
  setAspectRatio,
  numberOfImages,
  setNumberOfImages,
  resolution,
  setResolution,
  apiKey,
  isGenerating = false,
  isCancelling = false,
  outputMimeType,
  setOutputMimeType,
  onCancel,
}) => {
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
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

  const imageAspectRatioOptions = [
    { value: '1:1' as AspectRatio, label: t('aspectRatio.square') },
    { value: '16:9' as AspectRatio, label: t('aspectRatio.landscape') },
    { value: '9:16' as AspectRatio, label: t('aspectRatio.portrait') },
    { value: '4:3' as AspectRatio, label: t('aspectRatio.wide') },
    { value: '3:4' as AspectRatio, label: t('aspectRatio.tall') },
  ];
  
  const imageModelOptions = imageModels.map(m => ({
    id: m.id,
    name: m.name,
    description: t(`modelDescription.${m.id.replace(/[\.\-]/g, '_')}`),
    icon: <ImageIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
  }));

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing || isDisabled || !apiKey) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt({ prompt, apiKey });
      setPrompt(enhanced);
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
      // Optionally, show an error to the user
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isDisabled) return;
    onSubmit();
  };

  const handleClear = () => {
    setPrompt('');
  };

  return (
    <div className={`p-1 rounded-xl transition-all duration-300 ${isGenerating ? 'tracer-border-active' : ''}`}>
      <div className={`w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl border ${isGenerating ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'} transition-colors duration-300`}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="prompt-image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('promptLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isDisabled || !prompt.trim()}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('clearInputsButton')}
                  >
                    <ClearInputIcon className="h-4 w-4" />
                    {t('clearButton')}
                  </button>
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={!prompt.trim() || isEnhancing || isDisabled || !apiKey}
                    className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-md transform transition-transform duration-150 ease-in-out hover:from-purple-600 hover:to-pink-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('enhancePromptButton')}
                  >
                    <SparklesIcon />
                    {isEnhancing ? t('enhancingPromptButton') : t('enhancePromptButton')}
                  </button>
                </div>
              </div>
              <div className="relative">
                <textarea
                  id="prompt-image"
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('imagePromptPlaceholder')}
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
                    disabled={isCancelling || (!isGenerating && !prompt.trim())}
                    className={`py-2 px-6 text-white font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-150 ease-in-out active:scale-95 ${
                        isGenerating 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 bg-200% animate-gradient-pulse'
                            : 'bg-gradient-to-r from-blue-500 to-green-500 bg-200% animate-gradient-pulse'
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
                            {t('generateImageButton')}
                        </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div>
                <CustomModelSelector
                  label={t('modelLabel')}
                  options={imageModelOptions}
                  value={model}
                  onChange={setModel}
                  disabled={isDisabled}
                  t={t}
                />
              </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('numImagesLabel')}
                  </label>
                  <NumberSelector
                    value={numberOfImages}
                    onChange={setNumberOfImages}
                    disabled={isDisabled}
                    t={t}
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('outputFormatLabel')}
                  </label>
                  <OutputFormatSelector 
                    value={outputMimeType}
                    onChange={setOutputMimeType}
                    disabled={isDisabled}
                    t={t}
                  />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('aspectRatioLabel')}
                </label>
                <AspectRatioSelector
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  options={imageAspectRatioOptions}
                  disabled={isDisabled}
                  t={t}
                />
              </div>
              <div>
                <label htmlFor="resolution" className="block text-sm font-medium mb-2 text-gray-400 dark:text-gray-500">
                    {t('resolutionLabel')}
                </label>
                <select
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as ImageResolution)}
                  disabled
                  className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="1k">1K (Standard)</option>
                  <option value="2k">2K (HD)</option>
                </select>
                <p className="text-xs text-brand-accent mt-1">{t('resolutionUnsupportedWarning')}</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};