
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptForm } from './components/PromptForm';
import { LoadingScreen } from './components/LoadingScreen';
import { VideoResult } from './components/VideoResult';
import { ApiKeyInput } from './components/ApiKeyInput';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Gallery } from './components/Gallery';
import { GalleryIcon, GithubIcon } from './components/IconComponents';
import { generateVideoFromPrompt } from './services/geminiService';
import type { ImageData, GalleryItem } from './types';
import { AppState } from './types';
import { useI18n } from './hooks/useI18n';
import { useTheme } from './hooks/useTheme';

const App: React.FC = () => {
  const { t, setLocale, locale, loadingMessages } = useI18n();
  const [theme, toggleTheme] = useTheme();
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini-api-key') || '');
  const [isEditingApiKey, setIsEditingApiKey] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [model, setModel] = useState<string>('veo-2.0-generate-001');
  const [image, setImage] = useState<{ data: ImageData, preview: string } | null>(null);
  
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  
  const [animationClass, setAnimationClass] = useState('animate-slide-in-from-right');

  const transitionToState = useCallback((newState: AppState, direction: 'forward' | 'backward' = 'forward') => {
    const outClass = direction === 'forward' ? 'animate-slide-out-to-left' : 'animate-slide-out-to-right';
    const inClass = direction === 'forward' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left';

    setAnimationClass(outClass);
    setTimeout(() => {
        setAppState(newState);
        setAnimationClass(inClass);
    }, 300); // This duration should match the slide-out animation
  }, []);

  useEffect(() => {
    // Load gallery from local storage on initial mount
    try {
        const storedItems = localStorage.getItem('video-gallery');
        if (storedItems) {
            setGalleryItems(JSON.parse(storedItems));
        }
    } catch (e) {
        console.error("Failed to load gallery items from localStorage", e);
        setGalleryItems([]);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini-api-key', apiKey);
    } else {
      localStorage.removeItem('gemini-api-key');
    }
  }, [apiKey]);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    const outClass = 'animate-slide-out-to-right';
    const inClass = 'animate-slide-in-from-left';

    setAnimationClass(outClass);
    setTimeout(() => {
        setIsEditingApiKey(false);
        setAnimationClass(inClass);
    }, 300);
  };

  const handleChangeApiKey = () => {
    const outClass = 'animate-slide-out-to-left';
    const inClass = 'animate-slide-in-from-right';
    
    setAnimationClass(outClass);
    setTimeout(() => {
        setIsEditingApiKey(true);
        setAnimationClass(inClass);
    }, 300);
  };

  const handleProgress = useCallback((message: string) => {
    setLoadingMessage(message);
  }, []);

  const handleSaveToGallery = (newItemData: Omit<GalleryItem, 'id' | 'timestamp'>) => {
    const newItem: GalleryItem = {
        id: `vid-${Date.now()}`,
        timestamp: Date.now(),
        ...newItemData,
    };
    setGalleryItems(prevItems => {
        const updatedItems = [newItem, ...prevItems];
        localStorage.setItem('video-gallery', JSON.stringify(updatedItems));
        return updatedItems;
    });
  };

  const handleDeleteItem = (id: string) => {
    setGalleryItems(prevItems => {
        const updatedItems = prevItems.filter(item => item.id !== id);
        localStorage.setItem('video-gallery', JSON.stringify(updatedItems));
        return updatedItems;
    });
  };

  const handleReusePrompt = (item: GalleryItem) => {
    setPrompt(item.prompt);
    if (item.imageData && item.preview) {
        setImage({ data: item.imageData, preview: item.preview });
    } else {
        setImage(null);
    }
    setVideoUrl(null);
    setError(null);
    transitionToState(AppState.IDLE, 'backward');
    setIsGalleryOpen(false);
  };

  const handleSubmit = async () => {
    if (!apiKey) {
        setError(t('apiKeyError'));
        transitionToState(AppState.ERROR, 'forward');
        return;
    }
    setError(null);
    setVideoUrl(null);
    setLoadingMessage(t('initializing'));
    transitionToState(AppState.LOADING, 'forward');

    try {
      const url = await generateVideoFromPrompt({ 
          prompt,
          model,
          image: image?.data,
          apiKey, 
          onProgress: handleProgress,
          loadingMessages,
        });
      setVideoUrl(url);
      setAppState(AppState.SUCCESS); // direct set because it's part of the same transition
      handleSaveToGallery({
          videoUrl: url,
          prompt,
          imageData: image?.data,
          preview: image?.preview,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      console.error(errorMessage);
      setError(`${t('generationFailedMessage')} ${errorMessage}`);
      setAppState(AppState.ERROR); // direct set for error
    }
  };

  const handleReset = () => {
    setVideoUrl(null);
    setError(null);
    setLoadingMessage('');
    transitionToState(AppState.IDLE, 'backward');
  };
  
  const handleTryAgain = () => {
      setError(null);
      transitionToState(AppState.IDLE, 'backward');
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.LOADING:
        return <LoadingScreen t={t} />;
      case AppState.SUCCESS:
        return videoUrl ? <VideoResult videoUrl={videoUrl} onReset={handleReset} t={t} /> : null;
      case AppState.ERROR:
        return (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-brand-danger mb-4">{t('generationFailedTitle')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
            <button
              onClick={handleTryAgain}
              className="px-6 py-2 bg-brand-primary hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
            >
              {t('tryAgainButton')}
            </button>
          </div>
        );
      case AppState.IDLE:
      default:
        return (
          <PromptForm
            onSubmit={handleSubmit}
            t={t}
            prompt={prompt}
            setPrompt={setPrompt}
            model={model}
            setModel={setModel}
            image={image}
            setImage={setImage}
          />
        );
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col items-center p-4 sm:p-6">
      <Header t={t} />
      <div className="flex items-center space-x-4">
        <LanguageSwitcher setLocale={setLocale} currentLocale={locale} />
        <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
        <button
            onClick={() => setIsGalleryOpen(true)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transform transition-transform duration-150 ease-in-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-brand-primary"
            aria-label={t('galleryButton')}
            title={t('galleryButton')}
        >
            <GalleryIcon />
        </button>
        <a
            href="https://github.com/DEX-1101/VEO3-Generator"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transform transition-transform duration-150 ease-in-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-brand-primary"
            aria-label={t('sourceCodeButton')}
            title={t('sourceCodeButton')}
        >
            <GithubIcon />
        </a>
      </div>
      <main className="w-full max-w-3xl mx-auto flex-grow flex flex-col justify-center mt-6">
        {!apiKey || isEditingApiKey ? (
          <div className={animationClass}>
            <ApiKeyInput onSave={handleSaveApiKey} t={t} initialKey={apiKey} />
          </div>
        ) : (
          <>
            <div className={`text-center mb-4 text-sm text-gray-500 dark:text-gray-400 ${animationClass}`}>
                <span>{t('apiKeySet')}</span>
                <button onClick={handleChangeApiKey} className="ml-2 text-blue-400 hover:underline">
                    {t('changeKey')}
                </button>
            </div>
            <div className={animationClass}>
                {renderContent()}
            </div>
          </>
        )}
      </main>
      <footer className="w-full text-center text-gray-600 dark:text-gray-400 text-sm mt-8 pb-4">
        <p className="font-bold">{t('footerText1')}</p>
        <p className="mt-2 font-bold">
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
      <Gallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        items={galleryItems}
        onDelete={handleDeleteItem}
        onReuse={handleReusePrompt}
        t={t}
      />
    </div>
  );
};

export default App;
