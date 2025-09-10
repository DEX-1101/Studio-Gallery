

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PromptForm } from './components/PromptForm';
import { ImagePromptForm } from './components/ImagePromptForm';
import { ImageBuilderFlow } from './components/ImageBuilderFlow';
import { ImageFusionForm } from './components/ImageFusionForm';
import { ChatForm } from './components/ChatForm';
import { VideoResult } from './components/VideoResult';
import { ImageResult } from './components/ImageResult';
import { NanoBananaResult } from './components/NanoBananaResult';
import { ApiKeyInput } from './components/ApiKeyInput';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { GithubIcon, PowerIcon, UploadIcon, ClearInputIcon, MagicWandIcon, CancelGenerationIcon, ReplayIcon, DownloadIcon, VideoIcon, CloseIcon, CodeIcon, ChatIcon } from './components/IconComponents';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { ErrorDisplay } from './components/ErrorDisplay';
import { generateVideoFromPrompt, generateImagesFromPrompt, editImageWithNanoBanana, generateCompositeImage, enhancePrompt } from './services/geminiService';
import type { ImageData, AspectRatio, NanoBananaResultPart, GenerateImageParams, EnhancePromptParams, Progress, ImageResolution, VideoResolution } from './types';
import { AppState, AppMode } from './types';
import { useI18n } from './hooks/useI18n';
import { useTheme } from './hooks/useTheme';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { DirectoryPicker } from './components/DirectoryPicker';
import { useFileSystem } from './hooks/useFileSystem';
import { Toast } from './components/Toast';
import { useAutoResizeTextarea } from './hooks/useAutoResizeTextarea';
import { CustomModelSelector } from './components/CustomModelSelector';

// Helper to convert a data URL string back to a File object
const dataURLtoFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
};

// Helper to convert data URL to Blob
const dataURLtoBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};


// --- START: Scene Builder Debug Dialog Component ---

interface DebugInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  image: ImageData | null;
  t: (key: string) => string;
}

const DebugInfoDialog: React.FC<DebugInfoDialogProps> = ({ isOpen, onClose, prompt, image, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-in-from-right" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-200">{t('debugInfo.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <CloseIcon />
          </button>
        </header>
        <main className="overflow-y-auto p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">{t('debugInfo.inputImageLabel')}</h3>
            {image ? (
              <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Input for generation" className="max-w-full max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900" />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">{t('debugInfo.noImageUsed')}</p>
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">{t('debugInfo.fullPromptLabel')}</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono break-all">{prompt}</pre>
          </div>
        </main>
      </div>
    </div>
  );
};


// --- START: Scene Builder Flow Component ---

interface SceneBuilderFlowProps {
  t: (key: string) => string;
  steps: { action: string; videoUrl: string; fullPrompt: string; inputImage: ImageData | null }[];
  isLoading: boolean;
  isCancelling: boolean;
  status: string | null;
  error: string | null;
  onInitialSubmit: (params: { character: string, action: string, extra: string, initialImage?: { data: ImageData; preview: string } }) => void;
  onFollowUpSubmit: (params: { action: string }) => void;
  onReset: () => void;
  model: string;
  setModel: (model: string) => void;
  onCancel: () => void;
}

const SceneBuilderFlow: React.FC<SceneBuilderFlowProps> = ({
  t,
  steps,
  isLoading,
  isCancelling,
  status,
  error,
  onInitialSubmit,
  onFollowUpSubmit,
  onReset,
  model,
  setModel,
  onCancel,
}) => {
  const [character, setCharacter] = useState('');
  const [action, setAction] = useState('');
  const [extra, setExtra] = useState('');
  const [localInitialImage, setLocalInitialImage] = useState<{ data: ImageData; preview: string } | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ prompt: string; image: ImageData | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flowEndRef = useRef<HTMLDivElement>(null);

  const characterRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(characterRef, character);
  const actionRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(actionRef, action);
  const extraRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(extraRef, extra);
  const followupActionRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(followupActionRef, action);

  const isDisabled = isLoading || isCancelling;
  const [timer, setTimer] = useState(0);
  
  const videoModels = [
    { id: 'veo-2.0-generate-001', name: 'VEO 2' },
    { id: 'veo-3.0-generate-preview', name: 'VEO 3 Preview' },
    { id: 'veo-3.0-generate-001', name: 'VEO 3' },
    { id: 'veo-3.0-fast-generate-001', name: 'VEO 3 Fast' },
  ].map(m => ({
    ...m,
    description: t(`modelDescription.${m.id.replace(/[\.\-]/g, '_')}`),
    icon: <VideoIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
  }));

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
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading, isCancelling]);

  useEffect(() => {
    flowEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps, isLoading]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setLocalInitialImage({
          data: { base64: base64String, mimeType: file.type },
          preview: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    if (isDisabled) return;
    fileInputRef.current?.click();
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!character.trim() || !action.trim() || isDisabled) return;
    onInitialSubmit({ character, action, extra, initialImage: localInitialImage });
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim() || isDisabled) return;
    onFollowUpSubmit({ action });
  };

  const handleClearInitial = () => {
    setCharacter('');
    setAction('');
    setExtra('');
    if (localInitialImage) {
        URL.revokeObjectURL(localInitialImage.preview);
    }
    setLocalInitialImage(null);
  };

  if (steps.length === 0) {
    return (
      <div className={`p-1 rounded-xl transition-all duration-300 ${isLoading ? 'tracer-border-active' : ''}`}>
        <div className={`w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-2xl border ${isLoading ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'}`}>
          <form onSubmit={handleInitialSubmit} className="space-y-6">
            <CustomModelSelector label={t('modelLabel')} options={videoModels} value={model} onChange={setModel} disabled={isDisabled} t={t} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="animate-fade-in-scale-up space-y-4">
                  <div>
                    <label htmlFor="character" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sceneBuild.characterLabel')}</label>
                    <textarea id="character" ref={characterRef} value={character} onChange={(e) => setCharacter(e.target.value)} placeholder={t('sceneBuild.characterPlaceholder')} rows={2} disabled={isDisabled} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary resize-none overflow-y-hidden" required />
                  </div>
                  <div>
                    <label htmlFor="action" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sceneBuild.actionLabel')}</label>
                    <textarea id="action" ref={actionRef} value={action} onChange={(e) => setAction(e.target.value)} placeholder={t('sceneBuild.actionPlaceholder')} rows={2} disabled={isDisabled} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary resize-none overflow-y-hidden" required />
                  </div>
                  <div>
                    <label htmlFor="extra" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sceneBuild.extraLabel')}</label>
                    <textarea id="extra" ref={extraRef} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={t('sceneBuild.extraPlaceholder')} rows={2} disabled={isDisabled} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary resize-none overflow-y-hidden" />
                  </div>
              </div>

              <div className="animate-fade-in-scale-up" style={{ animationDelay: '100ms' }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('imageLabel')}</label>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={isDisabled} />
                <div onClick={triggerFileSelect} className={`group w-full aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${isDisabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800/50' : 'cursor-pointer hover:border-brand-primary dark:hover:border-brand-primary hover:bg-gray-50 dark:hover:bg-gray-700/50'}`} title={t('tooltips.uploadInitialImage')}>
                  {localInitialImage ? <img src={localInitialImage.preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md p-1 animate-fade-in" /> : <div className="text-center text-gray-500 dark:text-gray-400"><UploadIcon className="mx-auto h-8 w-8 text-gray-400 group-hover:animate-bounce-subtle" /><p className="mt-2 text-sm">{t('imageUploadButton')}</p></div>}
                </div>
              </div>
            </div>

            <div className="animate-fade-in-scale-up pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4" style={{ animationDelay: '200ms' }}>
              <button type="button" onClick={handleClearInitial} disabled={isDisabled || (!character && !action && !extra && !localInitialImage)} className="flex items-center gap-1 px-3 py-1 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-full shadow-sm transform transition-transform duration-150 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-500 active:scale-95 disabled:opacity-50" title={t('clearInputsButton')}><ClearInputIcon className="h-4 w-4" />{t('clearButton')}</button>
              <button type={isLoading ? "button" : "submit"} onClick={isLoading ? onCancel : undefined} disabled={isCancelling || (!isLoading && (!character.trim() || !action.trim()))} className={`py-2 px-6 text-white font-bold rounded-lg shadow-md disabled:opacity-50 transform transition-all duration-150 ease-in-out active:scale-95 ${isLoading ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`} title={isLoading ? t('tooltips.cancelGeneration') : t('tooltips.generateInitialImage')}>
                {isLoading ? <span className="flex items-center justify-center gap-2"><CancelGenerationIcon /> {isCancelling ? t('cancellingGenerationButton') : `${(timer / 1000).toFixed(1)}s`}</span> : <span className="flex items-center justify-center gap-2"><MagicWandIcon /> {t('sceneBuildStartButton')}</span>}
              </button>
            </div>
            {error && <p className="text-sm text-center text-brand-danger mt-2 animate-fade-in">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('sceneBuildMode')}</h3>
          <button onClick={onReset} disabled={isDisabled} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors transform active:scale-95 disabled:opacity-50" title={t('tooltips.startNewBuild')}><ReplayIcon /> {t('startNewSceneBuild')}</button>
        </div>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="p-1 rounded-xl bg-gray-200 dark:bg-gray-700 animate-fade-in-scale-up">
              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg h-full space-y-2">
                <p className="text-sm font-normal italic text-gray-500 dark:text-gray-400">"{step.action}"</p>
                <div className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
                    <video src={step.videoUrl} controls loop autoPlay muted className="w-full h-full object-contain" />
                    <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setDebugInfo({ prompt: step.fullPrompt, image: step.inputImage })} className="bg-black bg-opacity-50 text-white rounded-full p-1.5" title={t('debugInfo.button')}><CodeIcon /></button>
                      <a href={step.videoUrl} download={`scene-step-${index + 1}.mp4`} className="bg-black bg-opacity-50 text-white rounded-full p-1.5" title={t('downloadButton')}><DownloadIcon /></a>
                    </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="animate-fade-in-scale-up">
              <div className="p-1 rounded-xl tracer-border-active">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg h-full flex flex-col items-center justify-center aspect-video">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 animate-pulse">{status || t('generatingButton')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Time elapsed: {(timer / 1000).toFixed(1)}s</p>
                </div>
              </div>
            </div>
          )}
          <div ref={flowEndRef} />
        </div>
        <div className="mt-8">
          {error && <p className="text-sm text-center text-brand-danger mb-4 animate-fade-in">{error}</p>}
          <form onSubmit={handleFollowUpSubmit}>
            <div className="relative">
              <textarea ref={followupActionRef} value={action} onChange={(e) => setAction(e.target.value)} placeholder={t('sceneBuildFollowUpPromptPlaceholder')} rows={3} disabled={isDisabled} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 pr-40 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary resize-none" required />
              <div className="absolute bottom-3 right-3">
                <button type={isLoading ? "button" : "submit"} onClick={isLoading ? onCancel : undefined} disabled={isCancelling || (!isLoading && !action.trim())} className={`py-2 px-6 text-white font-bold rounded-lg shadow-md disabled:opacity-50 transform transition-all duration-150 ease-in-out active:scale-95 whitespace-nowrap ${isLoading ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`} title={isLoading ? t('tooltips.cancelGeneration') : t('tooltips.generateFollowUp')}>
                  {isLoading ? <span className="flex items-center justify-center gap-2"><CancelGenerationIcon /> {isCancelling ? t('cancellingGenerationButton') : `${(timer / 1000).toFixed(1)}s`}</span> : <span className="flex items-center justify-center gap-2"><MagicWandIcon /> {t('sendFollowUpSceneButton')}</span>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <DebugInfoDialog
        isOpen={!!debugInfo}
        onClose={() => setDebugInfo(null)}
        prompt={debugInfo?.prompt || ''}
        image={debugInfo?.image || null}
        t={t}
      />
    </>
  );
};


// --- END: Scene Builder Flow Component ---


const App: React.FC = () => {
  const { t, setLocale, locale } = useI18n();
  const [theme, toggleTheme] = useTheme();
  
  const envApiKey = (window as any).process?.env?.API_KEY || null;

  // App State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [appMode, setAppMode] = useState<AppMode>(() => {
    const savedMode = localStorage.getItem('app-mode') as AppMode | null;
    return savedMode || AppMode.VIDEO;
  });
  
  // API Key
  const [apiKey, setApiKey] = useState<string>(() => envApiKey || localStorage.getItem('gemini-api-key') || '');
  
  // Results
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageFusionResult, setImageFusionResult] = useState<NanoBananaResultPart[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAutoSaveSuccess, setLastAutoSaveSuccess] = useState<boolean>(false);


  // Video Form State
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [videoModel, setVideoModel] = useState<string>('veo-2.0-generate-001');
  const [customVideoModel, setCustomVideoModel] = useState<string>('');
  const [videoImage, setVideoImage] = useState<{ data: ImageData, preview: string } | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<AspectRatio>('16:9');
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [videoNumberOfVideos, setVideoNumberOfVideos] = useState<number>(1);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>('720p');
  const [videoGeneratePeople, setVideoGeneratePeople] = useState<boolean>(true);
  
  // Image Form State
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [imageModel, setImageModel] = useState<string>('imagen-4.0-generate-001');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [resolution, setResolution] = useState<ImageResolution>('1k');
  const [imageOutputMimeType, setImageOutputMimeType] = useState<'image/jpeg' | 'image/png'>('image/jpeg');

  // Image Edit States (Image Builder, Image Fusion)
  const [editModel, setEditModel] = useState<string>('gemini-2.5-flash-image-preview');
  
  // Image Builder State
  const [isImageBuilderLoading, setIsImageBuilderLoading] = useState<boolean>(false);
  const [imageBuilderInitialImages, setImageBuilderInitialImages] = useState<{ data: ImageData, preview: string }[] | null>(null);
  const [imageBuilderSteps, setImageBuilderSteps] = useState<{ prompt: string; resultImage: { data: ImageData; preview: string }; additionalImagesUsed?: { data: ImageData; preview: string }[] }[]>([]);
  const [imageBuilderSessionId, setImageBuilderSessionId] = useState<string | null>(null);
  
  // Image Fusion State
  const [imageFusionProduct, setImageFusionProduct] = useState<{ data: ImageData, preview: string, file: File } | null>(null);
  const [imageFusionScene, setImageFusionScene] = useState<{ data: ImageData, preview: string, file: File } | null>(null);
  const [isImageFusionGenerating, setIsImageFusionGenerating] = useState<boolean>(false);
  const [imageFusionProgress, setImageFusionProgress] = useState<Progress>({});
  const [imageFusionHistory, setImageFusionHistory] = useState<{ data: ImageData; preview: string; file: File; }[]>([]);
  const [imageFusionHistoryIndex, setImageFusionHistoryIndex] = useState<number>(-1);

  // Scene Build State
  const [sceneBuildInitialImage, setSceneBuildInitialImage] = useState<{ data: ImageData, preview: string } | null>(null);
  const [sceneBuildCharacter, setSceneBuildCharacter] = useState<string>('');
  const [sceneBuildExtra, setSceneBuildExtra] = useState<string>('');
  const [sceneBuildSteps, setSceneBuildSteps] = useState<{ action: string; videoUrl: string; lastFrameData: ImageData; fullPrompt: string; inputImage: ImageData | null; }[]>([]);
  const [isSceneBuildLoading, setIsSceneBuildLoading] = useState<boolean>(false);
  const [sceneBuildStatus, setSceneBuildStatus] = useState<string | null>(null);
  const [sceneBuildModel, setSceneBuildModel] = useState<string>('veo-2.0-generate-001');


  // Animation, Dialogs & Notifications
  const [animationClass, setAnimationClass] = useState('animate-slide-in-from-right');
  const [apiKeyAnimationClass, setApiKeyAnimationClass] = useState('animate-slide-in-from-right');
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [isGlobalResetConfirmOpen, setIsGlobalResetConfirmOpen] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Chat Panel State
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  
  // File System
  const { directoryHandle, directoryName, selectDirectory, saveFile, isSupported: isFileSystemApiSupported } = useFileSystem();

  // Cancellation
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  
  const isEnvKeyInUse = !!envApiKey && apiKey === envApiKey;
  const isGeneratingSceneBuild = appState === AppState.LOADING && appMode === AppMode.SCENE_BUILD;
  const isAppBusy = appState === AppState.LOADING || isImageBuilderLoading || isImageFusionGenerating || isSceneBuildLoading || isCancelling;

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (!isDesktop && isMobileChatOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }

    return () => {
        document.body.style.overflow = '';
    };
  }, [isDesktop, isMobileChatOpen]);


  const handleCancelGeneration = () => {
    if (abortController) {
      setIsCancelling(true);
      abortController.abort("User cancelled generation");
    }
  };

  const transitionToState = useCallback((newState: AppState, direction: 'forward' | 'backward' = 'forward', onTransition?: () => void) => {
    const outClass = direction === 'forward' ? 'animate-slide-out-to-left' : 'animate-slide-out-to-right';
    const inClass = direction === 'forward' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left';

    setAnimationClass(outClass);
    setTimeout(() => {
        onTransition?.();
        setAppState(newState);
        setAnimationClass(inClass);
    }, 300);
  }, []);

  useEffect(() => {
    if (appMode !== AppMode.CHAT) {
        localStorage.setItem('app-mode', appMode);
    }
  }, [appMode]);

  useEffect(() => {
    if (apiKey && !isEnvKeyInUse) {
      localStorage.setItem('gemini-api-key', apiKey);
    } else {
      localStorage.removeItem('gemini-api-key');
    }
  }, [apiKey, isEnvKeyInUse]);
  
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasUnsavedChanges = 
        videoPrompt.trim() !== '' ||
        videoImage !== null ||
        imagePrompt.trim() !== '' ||
        imageBuilderInitialImages !== null ||
        imageBuilderSteps.length > 0 ||
        imageFusionProduct !== null ||
        imageFusionScene !== null ||
        sceneBuildSteps.length > 0;

      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    videoPrompt, 
    videoImage, 
    imagePrompt, 
    imageBuilderInitialImages,
    imageBuilderSteps, 
    imageFusionProduct, 
    imageFusionScene,
    sceneBuildSteps,
  ]);
  
  useEffect(() => {
    if (toast && toast.type !== 'info') {
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    setApiKeyAnimationClass('animate-slide-out-to-left');
    setTimeout(() => {
        setShowApiKeyInput(false);
        setApiKeyAnimationClass('animate-slide-in-from-right');
    }, 300);
  };
  
  const handleChangeApiKey = () => {
    setApiKeyAnimationClass('animate-slide-out-to-left');
    setTimeout(() => {
        setShowApiKeyInput(true);
        setApiKeyAnimationClass('animate-slide-in-from-right');
    }, 300);
  };

  const preflightCheck = (): boolean => {
    if (!apiKey) {
        setError(t('apiKeyError'));
        transitionToState(AppState.ERROR);
        return false;
    }
    setError(null);
    return true;
  };

  const handleImageBuilderSubmit = async ({
    prompt,
    initialImages,
    additionalImages,
  }: {
    prompt: string;
    initialImages?: { data: ImageData; preview: string }[];
    additionalImages?: { data: ImageData; preview: string }[];
  }) => {
    if (!preflightCheck()) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsImageBuilderLoading(true);
    setError(null);

    const isFirstStep = imageBuilderSteps.length === 0;

    let sourceImagesData: ImageData[];

    if (isFirstStep) {
      const imagesToUse = initialImages || imageBuilderInitialImages;
      if (!imagesToUse || imagesToUse.length === 0) {
        setError(t('imageBuilderMissingImageError'));
        setIsImageBuilderLoading(false);
        return;
      }
      sourceImagesData = imagesToUse.map((img) => img.data);
      if (initialImages) {
        setImageBuilderInitialImages(initialImages);
      }
    } else {
      const lastStepImage = imageBuilderSteps[imageBuilderSteps.length - 1].resultImage;
      if (!lastStepImage) {
        setError(t('imageBuilderMissingImageError'));
        setIsImageBuilderLoading(false);
        return;
      }
      sourceImagesData = [lastStepImage.data];
      if (additionalImages && additionalImages.length > 0) {
        sourceImagesData.push(...additionalImages.map((img) => img.data));
      }
    }

    try {
      const resultParts = await editImageWithNanoBanana({
        prompt,
        images: sourceImagesData,
        apiKey,
        model: editModel,
        signal: controller.signal,
      });
      const newImagePart = resultParts.find((part) => part.inlineData);
      const textPart = resultParts.find((part) => part.text);

      if (!newImagePart || !newImagePart.inlineData) {
        const modelMessage = textPart ? `${t('modelErrorPrefix')} "${textPart.text}"` : t('modelDidNotReturnImageError');
        throw new Error(modelMessage);
      }

      const newImageData = newImagePart.inlineData;
      const newStep = {
        prompt,
        resultImage: {
          data: { base64: newImageData.data, mimeType: newImageData.mimeType },
          preview: `data:${newImageData.mimeType};base64,${newImageData.data}`,
        },
        additionalImagesUsed: additionalImages,
      };

      const currentSessionId = imageBuilderSessionId || `item-${Date.now()}`;
      if (!imageBuilderSessionId) {
        setImageBuilderSessionId(currentSessionId);
      }

      const updatedSteps = [...imageBuilderSteps, newStep];
      setImageBuilderSteps(updatedSteps);

      if (directoryHandle) {
        const blob = await dataURLtoBlob(newStep.resultImage.preview);
        const filename = `iterative-edit-${currentSessionId}-step-${updatedSteps.length}.jpeg`;
        const success = await saveFile(blob, filename);
        setToast({ message: t(success ? 'fileSavedSuccess' : 'fileSaveFailed'), type: success ? 'success' : 'error' });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Image builder step cancelled.');
        if (isFirstStep) {
          setImageBuilderInitialImages(null);
        }
        return;
      }
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      console.error(err);
      setError(errorMessage);
      if (isFirstStep) {
        setImageBuilderInitialImages(null);
      }
    } finally {
      setIsImageBuilderLoading(false);
      setAbortController(null);
      setIsCancelling(false);
    }
  };
  
  const handleImageBuilderRegenerate = async (index: number) => {
    if (!preflightCheck()) return;
  
    const stepToRegenerate = imageBuilderSteps[index];
    if (!stepToRegenerate) {
        setError("Could not find the step to regenerate.");
        return;
    }
  
    const controller = new AbortController();
    setAbortController(controller);
    setIsImageBuilderLoading(true);
    setError(null);
  
    // To regenerate a step, the input should be the same as the original generation.
    // This means using the result from the previous step (or initial images for the first step).
    let sourceImagesData: ImageData[];

    if (index === 0) {
      // If regenerating the first step, use the initial set of images.
      if (!imageBuilderInitialImages || imageBuilderInitialImages.length === 0) {
        setError(t('imageBuilderMissingImageError'));
        setIsImageBuilderLoading(false);
        return;
      }
      sourceImagesData = imageBuilderInitialImages.map((img) => img.data);
    } else {
      // For any subsequent step, use the result from the step just before it.
      const prevStepImage = imageBuilderSteps[index - 1]?.resultImage;
      if (!prevStepImage) {
        setError(t('imageBuilderMissingImageError'));
        setIsImageBuilderLoading(false);
        return;
      }
      sourceImagesData = [prevStepImage.data];
    }
    
    // Also include any additional images that were used when this step was first created.
    if (stepToRegenerate.additionalImagesUsed && stepToRegenerate.additionalImagesUsed.length > 0) {
        sourceImagesData.push(...stepToRegenerate.additionalImagesUsed.map((img) => img.data));
    }
  
    try {
        const resultParts = await editImageWithNanoBanana({
            prompt: stepToRegenerate.prompt,
            images: sourceImagesData,
            apiKey,
            model: editModel,
            signal: controller.signal,
        });
        const newImagePart = resultParts.find(part => part.inlineData);
        const textPart = resultParts.find(part => part.text);
  
        if (!newImagePart || !newImagePart.inlineData) {
            const modelMessage = textPart ? `${t('modelErrorPrefix')} "${textPart.text}"` : t('modelDidNotReturnImageError');
            throw new Error(modelMessage);
        }
  
        const newImageData = newImagePart.inlineData;
        const updatedStepResult = {
            data: { base64: newImageData.data, mimeType: newImageData.mimeType },
            preview: `data:${newImageData.mimeType};base64,${newImageData.data}`
        };
  
        const updatedSteps = [...imageBuilderSteps];
        updatedSteps[index] = { ...updatedSteps[index], resultImage: updatedStepResult };
        setImageBuilderSteps(updatedSteps);
  
        if (directoryHandle) {
            const blob = await dataURLtoBlob(updatedStepResult.preview);
            const filename = `iterative-edit-${imageBuilderSessionId}-step-${index + 1}-regen.jpeg`;
            const success = await saveFile(blob, filename);
            setToast({ message: t(success ? 'fileSavedSuccess' : 'fileSaveFailed'), type: success ? 'success' : 'error' });
        }
  
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.log('Image builder regeneration cancelled.');
            return;
        }
        const errorMessage = err instanceof Error ? err.message : t('unknownError');
        console.error(err);
        setError(errorMessage);
    } finally {
        setIsImageBuilderLoading(false);
        setAbortController(null);
        setIsCancelling(false);
    }
  };
  
  const handleDeleteImageBuilderStep = (indexToDelete: number) => {
    const updatedSteps = imageBuilderSteps.filter((_, index) => index !== indexToDelete);
    setImageBuilderSteps(updatedSteps);
  };
  
  const handleStartNewImageBuilder = () => {
      if (imageBuilderInitialImages) {
        imageBuilderInitialImages.forEach(img => URL.revokeObjectURL(img.preview));
      }
      setImageBuilderInitialImages(null);
      setImageBuilderSteps([]);
      setImageBuilderSessionId(null);
      setError(null);
  };

  const handleSceneUpload = (newScene: { data: ImageData; preview: string; file: File; } | null) => {
      if (newScene) {
          const newHistory = [newScene];
          setImageFusionHistory(newHistory);
          setImageFusionHistoryIndex(0);
          setImageFusionScene(newScene);
      } else {
          setImageFusionScene(null);
          setImageFusionHistory([]);
          setImageFusionHistoryIndex(-1);
      }
  };

  const handleUndo = () => {
      if (imageFusionHistoryIndex > 0) {
          const newIndex = imageFusionHistoryIndex - 1;
          setImageFusionHistoryIndex(newIndex);
          setImageFusionScene(imageFusionHistory[newIndex]);
          setImageFusionProduct(null);
      }
  };

  const handleRedo = () => {
      if (imageFusionHistoryIndex < imageFusionHistory.length - 1) {
          const newIndex = imageFusionHistoryIndex + 1;
          setImageFusionHistoryIndex(newIndex);
          setImageFusionScene(imageFusionHistory[newIndex]);
          setImageFusionProduct(null);
      }
  };
  
  const handleUseFusionAsScene = async () => {
      if (!imageFusionResult) return;
  
      const finalImagePart = imageFusionResult.find(part => part.text === 'Final Result' && part.inlineData);
      const primaryImagePart = finalImagePart || imageFusionResult.find(part => part.inlineData);
      
      if (!primaryImagePart || !primaryImagePart.inlineData) return;
      
      const { data, mimeType } = primaryImagePart.inlineData;
      const dataUrl = `data:${mimeType};base64,${data}`;
      
      const newSceneFile = await dataURLtoFile(dataUrl, `scene-${Date.now()}.${mimeType.split('/')[1] || 'jpeg'}`);
      
      const newSceneState = {
          data: { base64: data, mimeType },
          preview: dataUrl,
          file: newSceneFile,
      };
  
      const newHistory = imageFusionHistory.slice(0, imageFusionHistoryIndex + 1);
      const updatedHistory = [...newHistory, newSceneState];
      
      setImageFusionHistory(updatedHistory);
      setImageFusionHistoryIndex(updatedHistory.length - 1);
      setImageFusionScene(newSceneState);
      setImageFusionProduct(null);
      setImageFusionResult(null);
  };

  const handleImageFusionSubmit = async (params: {
    product: File,
    scene: File,
    dropPosition: { xPercent: number, yPercent: number },
  }) => {
    const { product, scene, dropPosition } = params;
    if (!preflightCheck()) return;

    const controller = new AbortController();
    setAbortController(controller);
    setError(null);
    setImageFusionResult(null);
    setIsImageFusionGenerating(true);
    setLastAutoSaveSuccess(false);
    
    const steps = ['resizing', 'marking', 'describing', 'composing', 'cropping'];
    const initialProgress = steps.reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {});
    setImageFusionProgress(initialProgress);

    try {
      const onProgressCallback = (stepKey: 'resizing' | 'marking' | 'describing' | 'composing' | 'cropping' | 'done') => {
        if (stepKey === 'done') return;
        
        setImageFusionProgress(prev => {
            const newProgress = {...prev};
            const currentIndex = steps.indexOf(stepKey);
            for (let i = 0; i < currentIndex; i++) {
                newProgress[steps[i]] = 'completed';
            }
            newProgress[stepKey] = 'in-progress';
            return newProgress;
        });
      };

      const { finalImageUrl, debugImageUrl, finalPrompt } = await generateCompositeImage({
        objectImage: product,
        environmentImage: scene,
        dropPosition,
        apiKey,
        onProgress: onProgressCallback,
        signal: controller.signal,
      });

      const finalProgress = steps.reduce((acc, key) => ({ ...acc, [key]: 'completed' }), {});
      setImageFusionProgress(finalProgress);

      const finalImageMimeType = finalImageUrl.match(/data:(.*);base64,/)?.[1] ?? 'image/jpeg';
      const finalImageBase64 = finalImageUrl.split(',')[1];
      
      const debugImageMimeType = debugImageUrl.match(/data:(.*);base64,/)?.[1] ?? 'image/jpeg';
      const debugImageBase64 = debugImageUrl.split(',')[1];
  
      const debugText = `Debug View (with marker)|PROMPT|${finalPrompt}`;

      const resultParts: NanoBananaResultPart[] = [
        { text: debugText, inlineData: { mimeType: debugImageMimeType, data: debugImageBase64 } },
        { text: 'Final Result', inlineData: { mimeType: finalImageMimeType, data: finalImageBase64 } },
      ];
      
      setImageFusionResult(resultParts);
      
      if (directoryHandle) {
        const blob = await dataURLtoBlob(finalImageUrl);
        const filename = `image-fusion-${Date.now()}.jpeg`;
        const success = await saveFile(blob, filename);
        setToast({ message: t(success ? 'fileSavedSuccess' : 'fileSaveFailed'), type: success ? 'success' : 'error' });
        setLastAutoSaveSuccess(success);
      }
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Image fusion cancelled.');
        setImageFusionProgress({});
        return;
      }
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      console.error(err);
      setError(errorMessage);
      setImageFusionProgress({});
    } finally {
        setIsImageFusionGenerating(false);
        setAbortController(null);
        setIsCancelling(false);
    }
  };

  const extractLastFrameFromVideo = (videoUrl: string): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.crossOrigin = "anonymous";
        video.playsInline = true;

        video.onloadedmetadata = () => {
            video.currentTime = video.duration > 0.1 ? video.duration - 0.1 : 0;
        };

        video.onseeked = () => {
            setTimeout(() => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject('Could not get canvas context');
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                const base64 = dataUrl.split(',')[1];
                resolve({ base64, mimeType: 'image/jpeg' });
            }, 100);
        };

        video.onerror = (e) => {
            console.error("Video error:", e);
            reject(`Error loading video for frame extraction. Error: ${video.error?.message}`);
        };
        
        video.src = videoUrl;
        video.play().catch(err => {
            console.warn("Video play promise rejected (this is often ok)", err);
        });
    });
  };
  
// FIX: Updated function signature to accept a single object parameter and destructure internally to resolve argument mismatch error.
const runSceneBuildStep = async (params: { prompt: string; action: string; inputImage?: ImageData; }) => {
      const { prompt, action, inputImage } = params;
      const controller = new AbortController();
      setAbortController(controller);
      setIsSceneBuildLoading(true);
      setError(null);
      setLastAutoSaveSuccess(false);
      
      try {
        setSceneBuildStatus(t('sceneBuildProgress.generatingVideo', { current: sceneBuildSteps.length + 1, total: '?' }));

        const downloadLinks = await generateVideoFromPrompt({
            prompt: prompt,
            model: sceneBuildModel,
            image: inputImage,
            apiKey,
            aspectRatio: undefined,
            signal: controller.signal,
            numberOfVideos: 1,
        });

        if (downloadLinks.length === 0) {
            throw new Error("Scene builder step failed: Model did not return a video.");
        }
        const downloadLink = downloadLinks[0];

        const response = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!response.ok) throw new Error(`Failed to fetch video file. Status: ${response.status}`);
        
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        
        if (controller.signal.aborted) throw new DOMException('Aborted by user', 'AbortError');
        
        setSceneBuildStatus(t('sceneBuildProgress.extractingFrame', { videoNum: sceneBuildSteps.length + 1 }));
        
        const lastFrameData = await extractLastFrameFromVideo(videoUrl);

        const newStep = { action: action, videoUrl, lastFrameData, fullPrompt: prompt, inputImage: inputImage || null };
        const updatedSteps = [...sceneBuildSteps, newStep];
        setSceneBuildSteps(updatedSteps);

        if (directoryHandle) {
            const filename = `scene-build-${Date.now()}-step-${updatedSteps.length}.mp4`;
            const success = await saveFile(videoBlob, filename);
            setToast({ message: t(success ? 'fileSavedSuccess' : 'fileSaveFailed'), type: success ? 'success' : 'error' });
            setLastAutoSaveSuccess(success);
        }

      } catch (err) {
        throw err; // Rethrow to be caught by the calling function
      } finally {
        setIsSceneBuildLoading(false);
        setSceneBuildStatus(null);
        setAbortController(null);
        setIsCancelling(false);
      }
  };

// FIX: Updated function signature to accept a single object parameter and destructure internally to resolve argument mismatch error.
const handleSceneBuildInitialStep = async (params: { character: string; action: string; extra: string; initialImage?: { data: ImageData; preview: string; }; }) => {
    const { character, action, extra, initialImage } = params;
    if (!preflightCheck()) return;
    
    setSceneBuildCharacter(character);
    setSceneBuildExtra(extra);
    if (initialImage) {
        setSceneBuildInitialImage(initialImage);
    }
    
    const combinedPrompt = `${character} ${action} ${extra}`.trim();

    try {
// FIX: Updated call to runSceneBuildStep to pass a single object argument to match the function's signature.
        await runSceneBuildStep({ prompt: combinedPrompt, action, inputImage: initialImage?.data });
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.log('Scene build step cancelled.');
        } else {
            const errorMessage = err instanceof Error ? err.message : t('unknownError');
            console.error(err);
            setError(errorMessage);
        }
        // If the first step fails, reset everything
        if (initialImage) URL.revokeObjectURL(initialImage.preview);
        setSceneBuildInitialImage(null);
        setSceneBuildCharacter('');
        setSceneBuildExtra('');
    }
  };

// FIX: Updated function signature to accept a single object parameter and destructure internally to resolve argument mismatch error.
const handleSceneBuildFollowUpStep = async (params: { action: string; }) => {
    const { action } = params;
    if (!preflightCheck()) return;
  
    const lastStep = sceneBuildSteps[sceneBuildSteps.length - 1];
    if (!lastStep) {
      setError('Cannot perform follow-up: No previous step found.');
      return;
    }
  
    const combinedPrompt = `${sceneBuildCharacter} ${action} ${sceneBuildExtra}`.trim();
  
    try {
// FIX: Updated call to runSceneBuildStep to pass a single object argument to match the function's signature.
      await runSceneBuildStep({ prompt: combinedPrompt, action, inputImage: lastStep.lastFrameData });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Scene build step cancelled.');
      } else {
        const errorMessage = err instanceof Error ? err.message : t('unknownError');
        console.error(err);
        setError(errorMessage);
      }
    }
  };
  
  const handleStartNewSceneBuild = () => {
      if (sceneBuildInitialImage) {
        URL.revokeObjectURL(sceneBuildInitialImage.preview);
      }
      sceneBuildSteps.forEach(step => URL.revokeObjectURL(step.videoUrl));
      setSceneBuildInitialImage(null);
      setSceneBuildSteps([]);
      setError(null);
      setSceneBuildCharacter('');
      setSceneBuildExtra('');
  };

  const handleSubmit = async () => {
    if (!preflightCheck()) return;

    if (appMode === AppMode.VIDEO) {
      if (videoModel === 'custom' && !customVideoModel.trim()) {
        setError(t('customModelIdError'));
        return;
      }
    }

    // Note: SCENE_BUILD is handled via its own component and doesn't use this main submit handler.
    const controller = new AbortController();
    setAbortController(controller);
    setVideoUrls([]);
    setImageUrls([]);
    setImageFusionResult(null);
    setLastAutoSaveSuccess(false);
    
    setAppState(AppState.LOADING);

    try {
        let autoSaveSuccess = false;
        if (appMode === AppMode.VIDEO) {
            const modelToUse = videoModel === 'custom' ? customVideoModel : videoModel;
            const downloadLinks = await generateVideoFromPrompt({ 
                prompt: videoPrompt,
                model: modelToUse,
                image: videoImage?.data,
                apiKey,
                aspectRatio: (modelToUse.startsWith('veo-')) ? videoAspectRatio : undefined,
                signal: controller.signal,
                durationSecs: videoDuration,
                numberOfVideos: videoNumberOfVideos,
                resolution: videoResolution,
                generatePeople: videoGeneratePeople,
            });
            
            const videoBlobs = await Promise.all(
                downloadLinks.map(async (link) => {
                    const response = await fetch(`${link}&key=${apiKey}`);
                    if (!response.ok) {
                        console.error(`Failed to fetch video file from ${link}. Status: ${response.status}`);
                        return null;
                    }
                    return response.blob();
                })
            );
            
            const validBlobs = videoBlobs.filter((blob): blob is Blob => blob !== null);
            if (validBlobs.length === 0) {
                throw new Error("Failed to fetch any video files after generation.");
            }
        
            if (directoryHandle) {
                let savedCount = 0;
                for (let i = 0; i < validBlobs.length; i++) {
                    const filename = `${videoPrompt.substring(0, 20).replace(/\s/g, '_') || 'video'}-${Date.now()}-${i + 1}.mp4`;
                    if (await saveFile(validBlobs[i], filename)) {
                        savedCount++;
                    }
                }
                autoSaveSuccess = savedCount === validBlobs.length;
            }
            
            const objectUrls = validBlobs.map(blob => URL.createObjectURL(blob));
            setVideoUrls(objectUrls);

        } else if (appMode === AppMode.IMAGE) {
            const images = await generateImagesFromPrompt({
                prompt: imagePrompt,
                model: imageModel,
                aspectRatio,
                numberOfImages,
                resolution,
                apiKey,
                outputMimeType: imageOutputMimeType,
                signal: controller.signal,
            });
            setImageUrls(images);
            
            if (directoryHandle) {
                let savedCount = 0;
                for (let i = 0; i < images.length; i++) {
                    const blob = await dataURLtoBlob(images[i]);
                    const extension = imageOutputMimeType.split('/')[1] || 'jpeg';
                    const filename = `${imagePrompt.substring(0, 20).replace(/\s/g, '_') || 'image'}-${Date.now()}-${i + 1}.${extension}`;
                    if (await saveFile(blob, filename)) {
                        savedCount++;
                    }
                }
                autoSaveSuccess = savedCount === images.length;
            }
        }
        
        if (directoryHandle) {
            setToast({ message: t(autoSaveSuccess ? 'fileSavedSuccess' : 'fileSaveFailed'), type: autoSaveSuccess ? 'success' : 'error' });
        }
        setLastAutoSaveSuccess(autoSaveSuccess);
        transitionToState(AppState.SUCCESS);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Generation cancelled.');
        transitionToState(AppState.IDLE, 'backward');
        return;
      }
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      console.error(err);
      setError(errorMessage);
      transitionToState(AppState.ERROR);
    } finally {
      setAbortController(null);
      setIsCancelling(false);
    }
  };

  const clearAllInputs = () => {
    // Revoke any existing object URLs to prevent memory leaks
    videoUrls.forEach(url => URL.revokeObjectURL(url));
    if (videoImage) URL.revokeObjectURL(videoImage.preview);
    if (imageBuilderInitialImages) {
        imageBuilderInitialImages.forEach(img => URL.revokeObjectURL(img.preview));
    }
    imageBuilderSteps.forEach(step => URL.revokeObjectURL(step.resultImage.preview));
    if (imageFusionProduct) URL.revokeObjectURL(imageFusionProduct.preview);
    if (imageFusionScene) URL.revokeObjectURL(imageFusionScene.preview);
    imageFusionHistory.forEach(item => URL.revokeObjectURL(item.preview));
    if (sceneBuildInitialImage) URL.revokeObjectURL(sceneBuildInitialImage.preview);
    sceneBuildSteps.forEach(step => URL.revokeObjectURL(step.videoUrl));

    // Reset state
    setVideoUrls([]);
    setImageUrls([]);
    setImageFusionResult(null);
    setError(null);
    
    setVideoPrompt('');
    setVideoImage(null);
    setVideoModel('veo-2.0-generate-001');
    setCustomVideoModel('');
    setVideoAspectRatio('16:9');
    setVideoDuration(5);
    setVideoNumberOfVideos(1);
    setVideoResolution('720p');
    setVideoGeneratePeople(true);

    setImagePrompt('');
    setImageModel('imagen-4.0-generate-001');
    setAspectRatio('1:1');
    setNumberOfImages(1);
    setResolution('1k');
    setImageOutputMimeType('image/jpeg');
    
    setEditModel('gemini-2.5-flash-image-preview');
    
    setImageBuilderInitialImages(null);
    setImageBuilderSteps([]);
    
    setImageFusionProduct(null);
    setImageFusionScene(null);
    setIsImageFusionGenerating(false);
    setImageFusionProgress({});
    setImageFusionHistory([]);
    setImageFusionHistoryIndex(-1);

    setSceneBuildInitialImage(null);
    setSceneBuildSteps([]);
    setSceneBuildStatus(null);
    setSceneBuildCharacter('');
    setSceneBuildExtra('');
  };

  const handleCreateAnother = () => {
    transitionToState(AppState.IDLE, 'backward', () => {
      videoUrls.forEach(url => URL.revokeObjectURL(url));
      setVideoUrls([]);
      setImageUrls([]);
      setImageFusionResult(null);
      setError(null);
    });
  };
  
  const handleTryAgain = () => {
    transitionToState(AppState.IDLE, 'backward', () => setError(null));
  };

  const proceedWithModeChange = (newMode: AppMode) => {
    // When switching main view, always close the chat panel
    setIsChatPanelOpen(false);
    setIsMobileChatOpen(false);
    
    const modes = [AppMode.VIDEO, AppMode.IMAGE, AppMode.IMAGE_BUILDER, AppMode.IMAGE_FUSION, AppMode.SCENE_BUILD];
    const currentIndex = modes.indexOf(appMode);
    const newIndex = modes.indexOf(newMode);
    const isSlidingRight = newIndex > currentIndex;
    
    const outClass = isSlidingRight ? 'animate-slide-out-to-left' : 'animate-slide-out-to-right';
    const inClass = isSlidingRight ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left';

    setAnimationClass(outClass);
    
    setTimeout(() => {
      clearAllInputs();
      setAppMode(newMode);
      setAppState(AppState.IDLE);
      setAnimationClass(inClass);
    }, 300);
  };

  const handleModeChange = (newMode: AppMode) => {
    if (newMode === appMode) return;

    const hasUnsavedChanges = 
      videoPrompt.trim() !== '' ||
      videoImage !== null ||
      imagePrompt.trim() !== '' ||
      imageBuilderSteps.length > 0 ||
      imageBuilderInitialImages !== null ||
      imageFusionProduct !== null ||
      imageFusionScene !== null ||
      sceneBuildSteps.length > 0 ||
      sceneBuildInitialImage !== null;

    if (hasUnsavedChanges) {
      setPendingMode(newMode);
      setIsConfirmationOpen(true);
    } else {
      proceedWithModeChange(newMode);
    }
  };

  const handleConfirmSwitch = () => {
    setIsConfirmationOpen(false);
    if (pendingMode) {
      proceedWithModeChange(pendingMode);
      setPendingMode(null);
    }
  };

  const handleCancelSwitch = () => {
    setIsConfirmationOpen(false);
    setPendingMode(null);
  };
  
  const handleConfirmGlobalReset = () => {
    clearAllInputs();
    setAppMode(AppMode.VIDEO);
    setAppState(AppState.IDLE);
    setIsGlobalResetConfirmOpen(false);
  };


  const renderContent = () => {
    if (appState === AppState.ERROR && appMode !== AppMode.SCENE_BUILD && appMode !== AppMode.IMAGE_BUILDER) {
      return (
        <ErrorDisplay
          error={error}
          onTryAgain={handleTryAgain}
          t={t}
        />
      );
    }
  
    const isGenerating = appState === AppState.LOADING;
  
    switch (appMode) {
      case AppMode.VIDEO:
        if (appState === AppState.SUCCESS && videoUrls.length > 0) {
          return <VideoResult videoUrls={videoUrls} onCreateAnother={handleCreateAnother} t={t} showDownloadButton={!lastAutoSaveSuccess} />;
        }
        return (
          <PromptForm
            onSubmit={handleSubmit}
            t={t}
            prompt={videoPrompt}
            setPrompt={setVideoPrompt}
            model={videoModel}
            setModel={setVideoModel}
            customModel={customVideoModel}
            setCustomModel={setCustomVideoModel}
            image={videoImage}
            setImage={setVideoImage}
            aspectRatio={videoAspectRatio}
            setAspectRatio={setVideoAspectRatio}
            duration={videoDuration}
            setDuration={setVideoDuration}
            numberOfVideos={videoNumberOfVideos}
            setNumberOfVideos={setVideoNumberOfVideos}
            resolution={videoResolution}
            setResolution={setVideoResolution}
            generatePeople={videoGeneratePeople}
            setGeneratePeople={setVideoGeneratePeople}
            apiKey={apiKey}
            isGenerating={isGenerating}
            isCancelling={isCancelling}
            onCancel={handleCancelGeneration}
          />
        );
      
      case AppMode.IMAGE:
        if (appState === AppState.SUCCESS && imageUrls.length > 0) {
          return <ImageResult imageUrls={imageUrls} onCreateAnother={handleCreateAnother} t={t} showDownloadButton={!lastAutoSaveSuccess} />;
        }
        return (
          <ImagePromptForm
            onSubmit={handleSubmit}
            t={t}
            prompt={imagePrompt}
            setPrompt={setImagePrompt}
            model={imageModel}
            setModel={setImageModel}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            numberOfImages={numberOfImages}
            setNumberOfImages={setNumberOfImages}
            resolution={resolution}
            setResolution={setResolution}
            apiKey={apiKey}
            isGenerating={isGenerating}
            isCancelling={isCancelling}
            outputMimeType={imageOutputMimeType}
            setOutputMimeType={setImageOutputMimeType}
            onCancel={handleCancelGeneration}
          />
        );

      case AppMode.IMAGE_BUILDER:
        return (
          <ImageBuilderFlow
              t={t}
              initialImages={imageBuilderInitialImages}
              steps={imageBuilderSteps}
              isLoading={isImageBuilderLoading}
              isCancelling={isCancelling}
              error={error}
              onSubmit={(params) => handleImageBuilderSubmit(params)}
              onReset={handleStartNewImageBuilder}
              onDeleteStep={handleDeleteImageBuilderStep}
              onRegenerate={handleImageBuilderRegenerate}
              model={editModel}
              setModel={setEditModel}
              onCancel={handleCancelGeneration}
          />
        );
      
      case AppMode.IMAGE_FUSION:
        return (
          <ImageFusionForm
              onSubmit={(params) => handleImageFusionSubmit(params)}
              isGenerating={isImageFusionGenerating}
              isCancelling={isCancelling}
              progress={imageFusionProgress}
              error={error}
              t={t}
              productImage={imageFusionProduct}
              sceneImage={imageFusionScene}
              onProductUpload={setImageFusionProduct}
              onSceneUpload={handleSceneUpload}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={imageFusionHistoryIndex > 0}
              canRedo={imageFusionHistoryIndex < imageFusionHistory.length - 1}
              result={imageFusionResult}
              onStartOver={handleCreateAnother}
              onUseAsScene={handleUseFusionAsScene}
              showDownloadButton={!lastAutoSaveSuccess}
              onCancel={handleCancelGeneration}
          />
        );
        
      case AppMode.SCENE_BUILD:
        return (
          <SceneBuilderFlow
            t={t}
            steps={sceneBuildSteps}
            isLoading={isSceneBuildLoading}
            isCancelling={isCancelling}
            status={sceneBuildStatus}
            error={error}
            onInitialSubmit={handleSceneBuildInitialStep}
            onFollowUpSubmit={handleSceneBuildFollowUpStep}
            onReset={handleStartNewSceneBuild}
            model={sceneBuildModel}
            setModel={setSceneBuildModel}
            onCancel={handleCancelGeneration}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col items-center p-2 sm:p-4 md:p-6">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher setLocale={setLocale} currentLocale={locale} disabled={isAppBusy} />
        <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} disabled={isAppBusy} t={t} />
        <a
            href="https://github.com/DEX-1101/VEO3-Generator"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transform transition-transform duration-150 ease-in-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-brand-primary shadow-lg"
            aria-label={t('sourceCodeButton')}
            title={t('sourceCodeButton')}
        >
            <GithubIcon />
        </a>
        <button
            onClick={() => setIsGlobalResetConfirmOpen(true)}
            disabled={isAppBusy}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transform transition-all duration-150 ease-in-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-red-400 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('resetButtonTooltip')}
            title={t('resetButtonTooltip')}
        >
            <PowerIcon />
        </button>
      </div>

      <Header t={t} />
      
      <div className="w-full max-w-7xl mx-auto flex-grow flex items-start gap-6 mt-6">
        <main className="flex-grow flex flex-col">
            {showApiKeyInput ? (
            <div className={`w-full max-w-md mx-auto ${apiKeyAnimationClass}`}>
                <ApiKeyInput onSave={handleSaveApiKey} t={t} initialKey={apiKey} envApiKey={envApiKey} />
            </div>
            ) : (
            <div className={`w-full ${apiKeyAnimationClass}`}>
                <div className="w-full max-w-md mx-auto mb-6">
                <div className="text-center p-4 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                        {isEnvKeyInUse ? t('apiKeySetFromEnv') : t('apiKeySet')}
                        <button 
                            onClick={handleChangeApiKey} 
                            disabled={isAppBusy}
                            className="ml-2 font-semibold text-green-700 dark:text-green-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('tooltips.changeKey')}
                        >
                            {t('changeKey')}
                        </button>
                    </p>
                </div>
                </div>
                
                <ModeSwitcher 
                    mode={appMode} 
                    setMode={handleModeChange} 
                    t={t} 
                    isDisabled={isAppBusy}
                />
                <div className={animationClass}>
                    {renderContent()}
                </div>
            </div>
            )}
        </main>

        {isDesktop && (
            <aside className={`
                flex-shrink-0 transition-all duration-500 ease-in-out
                ${isChatPanelOpen ? 'w-full max-w-md lg:w-2/5 xl:w-1/3' : 'w-0'}
                overflow-hidden
            `}>
                {isChatPanelOpen && (
                    <div className="h-[80vh] sticky top-6 animate-slide-in-from-right">
                        <ChatForm 
                            t={t} 
                            apiKey={apiKey} 
                            imageGenModel={imageModel} 
                            imageGenAspectRatio={aspectRatio} 
                            generateImages={generateImagesFromPrompt} 
                        />
                    </div>
                )}
            </aside>
        )}
      </div>


      <footer className="w-full text-center text-gray-600 dark:text-gray-400 text-sm mt-8 pb-4 space-y-4">
         <DirectoryPicker
            directoryName={directoryName}
            onSelectDirectory={selectDirectory}
            isSupported={isFileSystemApiSupported}
            t={t}
          />
        <p className="font-bold">
            &copy; {new Date().getFullYear()} | {t('footerCredit')}{' '}
            <a href="https://github.com/DEX-1101" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">
              x1101
            </a>{' '}
            /{' '}
            <a href="https://www.tiktok.com/@kelasyoutubeai" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">
              kelasyoutubeai
            </a>
        </p>
      </footer>
       <ConfirmationDialog
        isOpen={isConfirmationOpen}
        onCancel={handleCancelSwitch}
        onConfirm={handleConfirmSwitch}
        title={t('confirmSwitchTitle')}
        message={t('confirmSwitchMessage')}
        confirmText={t('confirmButton')}
        cancelText={t('cancelButton')}
        t={t}
      />
      <ConfirmationDialog
        isOpen={isGlobalResetConfirmOpen}
        onCancel={() => setIsGlobalResetConfirmOpen(false)}
        onConfirm={handleConfirmGlobalReset}
        title={t('confirmResetTitle')}
        message={t('confirmResetMessage')}
        confirmText={t('confirmResetButton')}
        cancelText={t('cancelButton')}
        t={t}
      />
      
      {/* Mobile Chat Overlay */}
      {!isDesktop && isMobileChatOpen && (
        <div className="fixed inset-0 bg-white dark:bg-gray-800 z-40 p-4 flex flex-col animate-fade-in">
            <ChatForm 
                t={t} 
                apiKey={apiKey} 
                imageGenModel={imageModel} 
                imageGenAspectRatio={aspectRatio} 
                generateImages={generateImagesFromPrompt} 
            />
        </div>
      )}

      {/* Floating Action Button for Chat */}
      {!showApiKeyInput && (
        <button
            onClick={() => {
                if (isDesktop) {
                    setIsChatPanelOpen(!isChatPanelOpen);
                } else {
                    setIsMobileChatOpen(!isMobileChatOpen);
                }
            }}
            disabled={isAppBusy}
            className="fixed bottom-6 right-6 z-50 p-4 bg-brand-primary text-white rounded-full shadow-lg hover:bg-blue-600 transform transition-all duration-200 ease-in-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={(isDesktop && isChatPanelOpen) || (!isDesktop && isMobileChatOpen) ? t('closeButton') : t('chatMode')}
            title={(isDesktop && isChatPanelOpen) || (!isDesktop && isMobileChatOpen) ? t('closeButton') : t('chatMode')}
        >
            {(isDesktop && isChatPanelOpen) || (!isDesktop && isMobileChatOpen) ? (
                <CloseIcon className="h-6 w-6" />
            ) : (
                <ChatIcon className="h-6 w-6" />
            )}
        </button>
      )}

    </div>
  );
};

export default App;