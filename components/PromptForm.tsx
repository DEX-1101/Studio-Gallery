
import React, { useState, useRef, useEffect } from 'react';
import type { ImageData, AspectRatio, VideoResolution } from '../types';
import { UploadIcon, SparklesIcon, CancelGenerationIcon, VideoIcon, ClearInputIcon, MagicWandIcon, SpinnerIcon, CodeIcon } from './IconComponents';
import { enhancePrompt, VIDEO_PROMPT_ENHANCEMENT_INSTRUCTION } from '../services/geminiService';
import { AspectRatioSelector } from './AspectRatioSelector';
import { useAutoResizeTextarea } from '../hooks/useAutoResizeTextarea';
import { CustomModelSelector } from './CustomModelSelector';
import { NumberSelector } from './NumberSelector';

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, setEnabled, disabled }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        disabled={disabled}
        className={`
          relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:focus:ring-offset-gray-800
          ${enabled ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-600'}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
};

interface PromptFormProps {
  onSubmit: () => void;
  t: (key: string) => string;
  prompt: string;
  setPrompt: (prompt: string) => void;
  model: string;
  setModel: (model: string) => void;
  customModel: string;
  setCustomModel: (model: string) => void;
  image: { data: ImageData; preview: string } | null;
  setImage: (image: { data: ImageData; preview: string } | null) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  apiKey: string;
  isGenerating?: boolean;
  isCancelling?: boolean;
  onCancel: () => void;
  duration: number;
  setDuration: (duration: number) => void;
  numberOfVideos: number;
  setNumberOfVideos: (num: number) => void;
  resolution: VideoResolution;
  setResolution: (res: VideoResolution) => void;
  generatePeople: boolean;
  setGeneratePeople: (gen: boolean) => void;
}

export const PromptForm: React.FC<PromptFormProps> = ({
  onSubmit,
  t,
  prompt,
  setPrompt,
  model,
  setModel,
  customModel,
  setCustomModel,
  image,
  setImage,
  aspectRatio,
  setAspectRatio,
  apiKey,
  isGenerating = false,
  isCancelling = false,
  onCancel,
  duration,
  setDuration,
  numberOfVideos,
  setNumberOfVideos,
  resolution,
  setResolution,
  generatePeople,
  setGeneratePeople,
}) => {
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(textareaRef, prompt);
  const [timer, setTimer] = useState(0);

  const isVEO3 = model === 'veo-3.0-generate-preview';
  
  useEffect(() => {
    if (isVEO3) {
      setDuration(8);
      setNumberOfVideos(1);
    } else {
      if (duration !== 5 && duration !== 8) {
        setDuration(5);
      }
    }
  }, [model, isVEO3, setDuration, setNumberOfVideos, duration]);

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

  const videoAspectRatioOptions = [
    { value: '16:9' as AspectRatio, label: t('aspectRatio.landscape') },
    { value: '9:16' as AspectRatio, label: t('aspectRatio.portrait') },
  ];

  const videoModels = [
    { 
      id: 'veo-2.0-generate-001', 
      name: 'VEO 2', 
    },
    { 
      id: 'veo-3.0-generate-preview', 
      name: 'VEO 3 Preview', 
    },
  ].map(m => ({
    ...m,
    description: t(`modelDescription.${m.id.replace(/[\.\-]/g, '_')}`),
    icon: <VideoIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
  }));

  const allVideoModels = [
    ...videoModels,
    {
      id: 'custom',
      name: t('customModelName'),
      description: t('modelDescription.custom'),
      icon: <CodeIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
    }
  ];

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing || isGenerating || !apiKey) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt({ 
        prompt, 
        apiKey, 
        instruction: VIDEO_PROMPT_ENHANCEMENT_INSTRUCTION 
      });
      setPrompt(enhanced);
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
      // Optionally show an error to the user
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // By wrapping the logic in a try/finally, we ensure that the file input's
    // value is cleared after every selection. This is crucial for allowing the
    // user to select the same file again after removing it, as the `onChange`
    // event would not fire otherwise.
    try {
      setImageError(null);
      const file = event.target.files?.[0];
      if (!file) {
        return; // User cancelled the file dialog
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setImageError(t('invalidFileTypeError'));
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setImageError(t('fileTooLargeError'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage({
          data: { base64: base64String, mimeType: file.type },
          preview: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    if (isDisabled) return;
    setImageError(null);
    fileInputRef.current?.click();
  };
  
  const handleRemoveImage = () => {
    setImageError(null);
    setImage(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isGenerating || !prompt.trim() || (model === 'custom' && !customModel.trim())) return;
    onSubmit();
  };
  
  const isDisabled = isGenerating || isCancelling;
  const isSubmitDisabled = isCancelling || (!isGenerating && (!prompt.trim() || (model === 'custom' && !customModel.trim())));


  const handleClear = () => {
    setPrompt('');
    setImage(null);
    setImageError(null);
  };

  const isResolutionDisabled = aspectRatio !== '16:9';

  return (
    <div className={`p-1 rounded-xl transition-all duration-300 ${isGenerating ? 'tracer-border-active' : ''}`}>
      <div className={`w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl border ${isGenerating ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'} transition-colors duration-300`}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('promptLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isDisabled || (!prompt.trim() && !image)}
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
                    id="prompt"
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('promptPlaceholder')}
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
                        disabled={isSubmitDisabled}
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
                                {t('generateButton')}
                            </span>
                        )}
                      </button>
                  </div>
              </div>
              <p className="text-xs text-left text-blue-500 dark:text-blue-400 mt-1">{t('jsonPromptNotice')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('imageLabel')}
                </label>
                <input
                  type="file"
                  id="image-upload"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  disabled={isDisabled}
                />
                <div
                  onClick={triggerFileSelect}
                  onKeyDown={(e) => { if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); triggerFileSelect(); } }}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  aria-label={image ? t('imageChangeButton') : t('imageUploadButton')}
                  title={t('tooltips.uploadReferenceImage')}
                  className={`group relative w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isDisabled
                      ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800/50'
                      : 'cursor-pointer hover:border-brand-primary dark:hover:border-brand-primary hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  } ${image ? 'border-gray-400 dark:border-gray-500' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  {image ? (
                    <>
                      <img src={image.preview} alt="Image preview" className="max-h-full max-w-full object-contain rounded-md p-1" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                        disabled={isDisabled}
                        className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 disabled:opacity-0"
                        aria-label="Remove image"
                        title={t('tooltips.removeImage')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                     <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                        <UploadIcon className={`mx-auto h-8 w-8 text-gray-400 ${!isDisabled && 'group-hover:animate-bounce-subtle'}`} />
                        <p className="mt-2 text-sm">{t('imageUploadButton')}</p>
                     </div>
                  )}
                </div>
                {imageError && <p className="text-sm text-center text-brand-danger mt-2">{imageError}</p>}
              </div>

              <div className="space-y-6">
                <div>
                  <CustomModelSelector
                    label={t('modelLabel')}
                    options={allVideoModels}
                    value={model}
                    onChange={setModel}
                    disabled={isDisabled}
                    t={t}
                  />
                </div>
                {model === 'custom' && (
                  <div className="animate-fade-in">
                    <label htmlFor="custom-model-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('customModelLabel')}
                    </label>
                    <input
                      id="custom-model-id"
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder={t('customModelPlaceholder')}
                      className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200"
                      required
                      disabled={isDisabled}
                    />
                  </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('aspectRatioLabel')}
                    </label>
                    <AspectRatioSelector
                      value={aspectRatio}
                      onChange={setAspectRatio}
                      options={videoAspectRatioOptions}
                      disabled={isDisabled}
                      t={t}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('durationLabel')}
                      </label>
                      <div className={`flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 transition-opacity ${isDisabled || isVEO3 ? 'opacity-50' : ''}`}>
                          {([5, 8] as const).map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDuration(d)}
                                disabled={isDisabled || isVEO3}
                                title={`${t('tooltips.setDuration')} to ${d}s`}
                                className={`w-full px-3 py-1 text-sm font-semibold rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-700 focus:ring-brand-primary ${
                                  duration === d
                                    ? 'bg-white dark:bg-gray-800 text-brand-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                                }`}
                                aria-pressed={duration === d}
                              >
                                {d}s
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('videoResolutionLabel')}
                      </label>
                      <div className={`flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 transition-opacity ${isDisabled || isResolutionDisabled ? 'opacity-50' : ''}`}>
                          {(['720p', '1080p'] as const).map(res => (
                              <button
                                key={res}
                                type="button"
                                onClick={() => setResolution(res)}
                                disabled={isDisabled || isResolutionDisabled}
                                title={t('tooltips.setResolution')}
                                className={`w-full px-3 py-1 text-sm font-semibold rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-700 focus:ring-brand-primary ${
                                  resolution === res
                                    ? 'bg-white dark:bg-gray-800 text-brand-primary shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                                }`}
                                aria-pressed={resolution === res}
                              >
                                {res.toUpperCase()}
                              </button>
                          ))}
                      </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-start">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('numVideosLabel')}
                        </label>
                        <NumberSelector
                            value={numberOfVideos}
                            onChange={setNumberOfVideos}
                            min={1}
                            max={isVEO3 ? 1 : 2}
                            disabled={isDisabled || isVEO3}
                            t={t}
                        />
                    </div>
                    <div>
                        <ToggleSwitch
                            label={t('personGenerationLabel')}
                            enabled={generatePeople}
                            setEnabled={setGeneratePeople}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
