import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptForm } from './components/PromptForm';
import { ImagePromptForm } from './components/ImagePromptForm';
import { NanoBananaForm } from './components/NanoBananaForm';
import { ImageBuilderFlow } from './components/ImageBuilderFlow';
import { ImageFusionForm } from './components/ImageFusionForm';
import { LoadingScreen } from './components/LoadingScreen';
import { VideoResult } from './components/VideoResult';
import { ImageResult } from './components/ImageResult';
import { NanoBananaResult } from './components/NanoBananaResult';
import { ImageFusionResult } from './components/ImageFusionResult';
import { ApiKeyInput } from './components/ApiKeyInput';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Gallery } from './components/Gallery';
import { GalleryIcon, GithubIcon, PowerIcon } from './components/IconComponents';
import { ModeSwitcher } from './components/ModeSwitcher';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { ErrorDisplay } from './components/ErrorDisplay';
import { generateVideoFromPrompt, generateImagesFromPrompt, editImageWithNanoBanana, generateCompositeImage } from './services/geminiService';
import type { ImageData, GalleryItem, AspectRatio, GalleryItemData, Resolution, NanoBananaResultPart, ImageBuilderStep, VideoGalleryItem, ImageBuilderGalleryItem, NanoBananaGalleryItem } from './types';
import { AppState, AppMode } from './types';
import { useI18n } from './hooks/useI18n';
import { useTheme } from './hooks/useTheme';
// FIX: Corrected import path for Progress type.
import type { Progress } from '../types';

const App: React.FC = () => {
  // FIX: Destructure all required values from the useI18n hook.
  const { t, setLocale, locale } = useI18n();
  const [theme, toggleTheme] = useTheme();
  
  // App State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.VIDEO);
  
  // API Key
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini-api-key') || '');
  const [isEditingApiKey, setIsEditingApiKey] = useState<boolean>(!localStorage.getItem('gemini-api-key'));
  
  // Results
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [nanoBananaResult, setNanoBananaResult] = useState<NanoBananaResultPart[] | null>(null);
  const [imageFusionResult, setImageFusionResult] = useState<NanoBananaResultPart[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Video Form State
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [videoModel, setVideoModel] = useState<string>('veo-2.0-generate-001');
  const [videoImage, setVideoImage] = useState<{ data: ImageData, preview: string } | null>(null);
  // FIX: Added missing state for video aspect ratio to be passed to PromptForm.
  const [videoAspectRatio, setVideoAspectRatio] = useState<AspectRatio>('16:9');
  
  // Image Form State
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [imageModel, setImageModel] = useState<string>('imagen-4.0-generate-001');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [resolution, setResolution] = useState<Resolution>('1k');
  const [imageOutputMimeType, setImageOutputMimeType] = useState<'image/jpeg' | 'image/png'>('image/jpeg');

  // Nano Banana Form State
  const [nanoBananaPrompt, setNanoBananaPrompt] = useState<string>('');
  const [nanoBananaImages, setNanoBananaImages] = useState<{ data: ImageData; preview: string }[]>([]);
  // FIX: Added missing state for the edit model, required by multiple components and services.
  const [editModel, setEditModel] = useState<string>('gemini-2.5-flash-image-preview');


  // Image Builder State
  const [isImageBuilderLoading, setIsImageBuilderLoading] = useState<boolean>(false);
  // FIX: Changed to handle multiple initial images to match component props.
  const [imageBuilderInitialImages, setImageBuilderInitialImages] = useState<{ data: ImageData, preview: string }[] | null>(null);
  const [imageBuilderSteps, setImageBuilderSteps] = useState<{ prompt: string, resultImage: { data: ImageData, preview: string } }[]>([]);
  const [imageBuilderSessionId, setImageBuilderSessionId] = useState<string | null>(null);
  
  // Image Fusion State
  const [imageFusionProduct, setImageFusionProduct] = useState<{ data: ImageData; preview: string; file: File; } | null>(null);
  const [imageFusionScene, setImageFusionScene] = useState<{ data: ImageData; preview: string; file: File; } | null>(null);
  const [isImageFusionGenerating, setIsImageFusionGenerating] = useState<boolean>(false);
  const [imageFusionProgress, setImageFusionProgress] = useState<Progress>({});
  const [imageFusionHistory, setImageFusionHistory] = useState<{ data: ImageData; preview: string; file: File; }[]>([]);
  const [imageFusionHistoryIndex, setImageFusionHistoryIndex] = useState<number>(-1);


  // FIX: Added missing state for cancellation logic, required by multiple components.
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Gallery
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  
  // Animation
  const [animationClass, setAnimationClass] = useState('animate-slide-in-from-right');

  // Confirmation Dialog
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [isGlobalResetConfirmOpen, setIsGlobalResetConfirmOpen] = useState(false);


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
  
  // FIX: Added cancellation handler to abort API requests.
  const handleCancelGeneration = () => {
    if (abortController) {
      setIsCancelling(true);
      abortController.abort("User cancelled generation");
    }
  };


  const handleSaveToGallery = <T extends GalleryItemData>(itemData: T, sessionIdToUpdate?: string) => {
      setGalleryItems(prevItems => {
          const isUpdatingBuilder = sessionIdToUpdate && itemData.type === 'image_builder';
          
          if (isUpdatingBuilder) {
              const existingItemIndex = prevItems.findIndex(item => item.id === sessionIdToUpdate);
              const newItem: ImageBuilderGalleryItem = {
                  id: sessionIdToUpdate,
                  timestamp: Date.now(),
                  ...itemData
              } as ImageBuilderGalleryItem;

              let updatedItems;
              if (existingItemIndex > -1) {
                  updatedItems = [...prevItems];
                  updatedItems[existingItemIndex] = newItem;
              } else {
                  updatedItems = [newItem, ...prevItems];
              }
              localStorage.setItem('video-gallery', JSON.stringify(updatedItems));
              return updatedItems;
          } else {
              const newItem: GalleryItem = {
                  id: `item-${Date.now()}`,
                  timestamp: Date.now(),
                  ...itemData,
              } as GalleryItem;
              const updatedItems = [newItem, ...prevItems];
              localStorage.setItem('video-gallery', JSON.stringify(updatedItems));
              return updatedItems;
          }
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
    if (item.type === 'video') {
        setAppMode(AppMode.VIDEO);
        setVideoPrompt(item.prompt);
        if (item.imageData) {
            setVideoImage({ data: item.imageData, preview: `data:${item.imageData.mimeType};base64,${item.imageData.base64}` });
        } else {
            setVideoImage(null);
        }
    } else if (item.type === 'image') {
        setAppMode(AppMode.IMAGE);
        setImagePrompt(item.prompt);
        setAspectRatio(item.aspectRatio);
        setResolution(item.resolution);
        if (item.model) {
            setImageModel(item.model);
        } else {
            setImageModel('imagen-4.0-generate-001'); // Default for old items
        }
    } else if (item.type === 'nano_banana') {
        setAppMode(AppMode.NANO_BANANA);
        setNanoBananaPrompt(item.prompt);
        const imagesWithPreviews = item.inputImages.map(imgData => ({
            data: imgData,
            preview: `data:${imgData.mimeType};base64,${imgData.base64}`
        }));
        setNanoBananaImages(imagesWithPreviews);
    } else if (item.type === 'image_builder') {
        setAppMode(AppMode.IMAGE_BUILDER);
        setImageBuilderSessionId(item.id);
        setImageBuilderInitialImages(item.steps.length > 0 ? [{
            data: item.initialImage,
            preview: `data:${item.initialImage.mimeType};base64,${item.initialImage.base64}`
        }] : null);
        const stepsWithPreviews = item.steps.map(step => ({
            prompt: step.prompt,
            resultImage: {
                data: step.resultImage,
                preview: `data:${step.resultImage.mimeType};base64,${step.resultImage.base64}`
            }
        }));
        setImageBuilderSteps(stepsWithPreviews);
    } else if (item.type === 'image_fusion') {
        setAppMode(AppMode.IMAGE_FUSION);
        // This mode doesn't support full state restoration due to File objects.
        // It will just load the images for a new session.
    }
    setError(null);
    transitionToState(AppState.IDLE, 'backward');
    setIsGalleryOpen(false);
  };

  // FIX: Updated function signature and logic to correctly handle multiple initial images and prevent type errors.
  const handleImageBuilderSubmit = async ({
    prompt,
    initialImages,
    additionalImages,
  }: {
    prompt: string;
    initialImages?: { data: ImageData; preview: string }[];
    additionalImages?: { data: ImageData; preview: string }[];
  }) => {
    if (!apiKey) {
      setError(t('apiKeyError'));
      return;
    }
    
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
        sourceImagesData = imagesToUse.map(img => img.data);
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
        if (additionalImages) {
            sourceImagesData.push(...additionalImages.map(img => img.data));
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
      const newImagePart = resultParts.find(part => part.inlineData);
      const textPart = resultParts.find(part => part.text);
  
      if (!newImagePart || !newImagePart.inlineData) {
        const modelMessage = textPart ? `${t('modelErrorPrefix')} "${textPart.text}"` : t('modelDidNotReturnImageError');
        throw new Error(modelMessage);
      }
      
      const newImageData = newImagePart.inlineData;
      const newStep = {
        prompt,
        resultImage: {
          data: { base64: newImageData.data, mimeType: newImageData.mimeType },
          preview: `data:${newImageData.mimeType};base64,${newImageData.data}`
        }
      };
      
      const currentSessionId = imageBuilderSessionId || `item-${Date.now()}`;
      if (!imageBuilderSessionId) {
        setImageBuilderSessionId(currentSessionId);
      }
      
      const updatedSteps = [...imageBuilderSteps, newStep];
      setImageBuilderSteps(updatedSteps);
      
      handleSaveToGallery({
        type: 'image_builder',
        initialImage: (initialImages || imageBuilderInitialImages!)[0].data,
        steps: updatedSteps.map(s => ({ prompt: s.prompt, resultImage: s.resultImage.data })),
        model: editModel,
      }, currentSessionId);
  
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
  
  // FIX: Added missing handler function passed to ImageBuilderFlow.
  const handleImageBuilderRegenerate = async (index: number) => {
    if (!apiKey) {
        setError(t('apiKeyError'));
        return;
    }
  
    const stepToRegenerate = imageBuilderSteps[index];
    if (!stepToRegenerate) {
        setError("Could not find the step to regenerate.");
        return;
    }
  
    const controller = new AbortController();
    setAbortController(controller);
    setIsImageBuilderLoading(true);
    setError(null);
  
    let sourceImagesData: ImageData[];
    if (index > 0) {
        const prevStepImage = imageBuilderSteps[index - 1].resultImage;
        if (!prevStepImage) {
            setError(t('imageBuilderMissingImageError'));
            setIsImageBuilderLoading(false);
            return;
        }
        sourceImagesData = [prevStepImage.data];
    } else {
        if (!imageBuilderInitialImages || imageBuilderInitialImages.length === 0) {
            setError(t('imageBuilderMissingImageError'));
            setIsImageBuilderLoading(false);
            return;
        }
        sourceImagesData = imageBuilderInitialImages.map(img => img.data);
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

  // FIX: Added missing handler function passed to ImageBuilderFlow.
  const handleDeleteImageBuilderStep = (indexToDelete: number) => {
    const updatedSteps = imageBuilderSteps.filter((_, index) => index !== indexToDelete);
    setImageBuilderSteps(updatedSteps);

    if (imageBuilderSessionId && imageBuilderInitialImages) {
        if (updatedSteps.length === 0) {
            handleDeleteItem(imageBuilderSessionId);
        } else {
            handleSaveToGallery({
              type: 'image_builder',
              initialImage: imageBuilderInitialImages[0].data,
              steps: updatedSteps.map(s => ({ prompt: s.prompt, resultImage: s.resultImage.data }))
            }, imageBuilderSessionId);
        }
    }
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
  
  // FIX: Replaced outdated fusion logic with the new implementation from the root `App.tsx`.
  const handleFusionSubmit = async (params: { product: File; scene: File; dropPosition: { xPercent: number; yPercent: number; }; }) => {
    const { product, scene, dropPosition } = params;
    if (!apiKey) {
      setError(t('apiKeyError'));
      transitionToState(AppState.ERROR);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setError(null);
    setImageFusionResult(null);
    setIsImageFusionGenerating(true);
    
    const steps = ['resizing', 'marking', 'describing', 'composing', 'cropping'];
    const initialProgress = steps.reduce((acc, key) => ({ ...acc, [key]: 'pending' }), {});
    setImageFusionProgress(initialProgress);
    transitionToState(AppState.LOADING);

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
      transitionToState(AppState.SUCCESS);
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Image fusion cancelled.');
        setImageFusionProgress({});
        transitionToState(AppState.IDLE, 'backward');
        return;
      }
      const errorMessage = err instanceof Error ? err.message : t('unknownError');
      console.error(err);
      setError(errorMessage);
      setImageFusionProgress({});
      transitionToState(AppState.ERROR);
    } finally {
        setIsImageFusionGenerating(false);
        setAbortController(null);
        setIsCancelling(false);
    }
  };

  const handleSubmit = async () => {
    if (!apiKey) {
        setError(t('apiKeyError'));
        transitionToState(AppState.ERROR, 'forward');
        return;
    }
    setError(null);
    setVideoUrl(null);
    setImageUrls([]);
    setNanoBananaResult(null);
    setImageFusionResult(null);
    
    const controller = new AbortController();
    setAbortController(controller);

    transitionToState(AppState.LOADING, 'forward');

    try {
        if (appMode === AppMode.VIDEO) {
            const downloadLink = await generateVideoFromPrompt({ 
                prompt: videoPrompt,
                model: videoModel,
                image: videoImage?.data,
                apiKey, 
                aspectRatio: videoModel === 'veo-2.0-generate-001' ? videoAspectRatio : undefined,
                signal: controller.signal,
            });

            const response = await fetch(`${downloadLink}&key=${apiKey}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch video file. Status: ${response.status}`);
            }
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            
            setVideoUrl(objectUrl);

            handleSaveToGallery({
                type: 'video',
                videoUrl: downloadLink,
                prompt: videoPrompt,
                imageData: videoImage?.data,
            });
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
            handleSaveToGallery({
                type: 'image',
                imageUrls: images,
                prompt: imagePrompt,
                aspectRatio,
                resolution,
                model: imageModel,
            });
        } else if (appMode === AppMode.NANO_BANANA) {
             const resultParts = await editImageWithNanoBanana({
                prompt: nanoBananaPrompt,
                images: nanoBananaImages.map(img => img.data),
                apiKey,
                model: editModel,
                signal: controller.signal,
            });

            const hasImage = resultParts.some(part => part.inlineData);
            if (!hasImage) {
                const textPart = resultParts.find(part => part.text);
                const modelMessage = textPart ? `${t('modelErrorPrefix')} "${textPart.text}"` : t('modelDidNotReturnImageError');
                throw new Error(modelMessage);
            }
            
            setNanoBananaResult(resultParts);
            handleSaveToGallery({
                type: 'nano_banana',
                prompt: nanoBananaPrompt,
                inputImages: nanoBananaImages.map(img => img.data),
                resultParts: resultParts,
                model: editModel,
            } as NanoBananaGalleryItem);
        }
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
    setVideoUrl(null);
    setImageUrls([]);
    setNanoBananaResult(null);
    setImageFusionResult(null);
    setError(null);
    
    setVideoPrompt('');
    setVideoImage(null);
    setVideoModel('veo-2.0-generate-001');
    setImagePrompt('');
    setImageModel('imagen-4.0-generate-001');
    setAspectRatio('1:1');
    setNumberOfImages(1);
    setResolution('1k');
    setNanoBananaPrompt('');
    setNanoBananaImages([]);
    
    setImageBuilderInitialImages(null);
    setImageBuilderSteps([]);
    setImageBuilderSessionId(null);
    
    setImageFusionProduct(null);
    setImageFusionScene(null);
  };

  const handleCreateAnother = () => {
    transitionToState(AppState.IDLE, 'backward', () => {
        clearAllInputs();
    });
  };
  
  const handleTryAgain = () => {
      transitionToState(AppState.IDLE, 'backward', () => setError(null));
  };

  const proceedWithModeChange = (newMode: AppMode) => {
    const modes = [AppMode.VIDEO, AppMode.IMAGE, AppMode.NANO_BANANA, AppMode.IMAGE_BUILDER, AppMode.IMAGE_FUSION];
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
      nanoBananaPrompt.trim() !== '' ||
      nanoBananaImages.length > 0 ||
      imageBuilderSteps.length > 0 ||
      imageFusionProduct !== null ||
      imageFusionScene !== null;

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
    setGalleryItems([]);
    localStorage.removeItem('video-gallery');
    setAppMode(AppMode.VIDEO);
    setAppState(AppState.IDLE);
    setIsGlobalResetConfirmOpen(false);
  };


  const renderContent = () => {
    if (appMode === AppMode.IMAGE_BUILDER) {
        return (
            <ImageBuilderFlow
                t={t}
                initialImages={imageBuilderInitialImages}
                steps={imageBuilderSteps}
                isLoading={isImageBuilderLoading}
                isCancelling={isCancelling}
                onCancel={handleCancelGeneration}
                error={error}
                onSubmit={handleImageBuilderSubmit}
                onReset={handleStartNewImageBuilder}
                onDeleteStep={handleDeleteImageBuilderStep}
                onRegenerate={handleImageBuilderRegenerate}
                model={editModel}
                setModel={setEditModel}
            />
        );
    }

    switch (appState) {
      case AppState.LOADING:
        return <LoadingScreen t={t} />;
      case AppState.SUCCESS:
        if (appMode === AppMode.VIDEO && videoUrl) {
            return <VideoResult videoUrl={videoUrl} onCreateAnother={handleCreateAnother} t={t} showDownloadButton={true} />;
        }
        if (appMode === AppMode.IMAGE && imageUrls.length > 0) {
            return <ImageResult imageUrls={imageUrls} onCreateAnother={handleCreateAnother} t={t} showDownloadButton={true} />;
        }
        if (appMode === AppMode.NANO_BANANA && nanoBananaResult) {
            return <NanoBananaResult resultParts={nanoBananaResult} onCreateAnother={handleCreateAnother} t={t} model={editModel} showDownloadButton={true} />;
        }
        if (appMode === AppMode.IMAGE_FUSION && imageFusionResult) {
            return <ImageFusionResult resultParts={imageFusionResult} onCreateAnother={handleCreateAnother} t={t} />;
        }
        return null;
      case AppState.ERROR:
        return (
          <ErrorDisplay
            error={error}
            onTryAgain={handleTryAgain}
            t={t}
          />
        );
      case AppState.IDLE:
      default:
        if (appMode === AppMode.VIDEO) {
          return (
            <PromptForm
              onSubmit={handleSubmit}
              t={t}
              prompt={videoPrompt}
              setPrompt={setVideoPrompt}
              model={videoModel}
              setModel={setVideoModel}
              image={videoImage}
              setImage={setVideoImage}
              aspectRatio={videoAspectRatio}
              setAspectRatio={setVideoAspectRatio}
              apiKey={apiKey}
              isGenerating={appState === AppState.LOADING}
              isCancelling={isCancelling}
              onCancel={handleCancelGeneration}
            />
          );
        } else if (appMode === AppMode.IMAGE) {
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
              isGenerating={appState === AppState.LOADING}
              isCancelling={isCancelling}
              onCancel={handleCancelGeneration}
              outputMimeType={imageOutputMimeType}
              setOutputMimeType={setImageOutputMimeType}
            />
          );
        } else if (appMode === AppMode.NANO_BANANA) {
           return (
            <NanoBananaForm
              onSubmit={handleSubmit}
              t={t}
              prompt={nanoBananaPrompt}
              setPrompt={setNanoBananaPrompt}
              images={nanoBananaImages}
              setImages={setNanoBananaImages}
              model={editModel}
              setModel={setEditModel}
              isGenerating={appState === AppState.LOADING}
              isCancelling={isCancelling}
              onCancel={handleCancelGeneration}
            />
          );
        } else if (appMode === AppMode.IMAGE_FUSION) {
            return (
                <ImageFusionForm
                    onSubmit={handleFusionSubmit}
                    isGenerating={isImageFusionGenerating}
                    isCancelling={isCancelling}
                    progress={imageFusionProgress}
                    error={error}
                    t={t}
                    productImage={imageFusionProduct}
                    sceneImage={imageFusionScene}
                    onProductUpload={() => {}}
                    onSceneUpload={() => {}}
                    onUndo={() => {}}
                    onRedo={() => {}}
                    canUndo={false}
                    canRedo={false}
                    result={imageFusionResult}
                    onStartOver={handleCreateAnother}
                    onUseAsScene={() => {}}
                    showDownloadButton={true}
                    onCancel={handleCancelGeneration}
                />
            );
        }
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col items-center p-4 sm:p-6">
      <button
          onClick={() => setIsGlobalResetConfirmOpen(true)}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transform transition-all duration-150 ease-in-out active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-red-400 shadow-lg"
          aria-label={t('resetButtonTooltip')}
          title={t('resetButtonTooltip')}
      >
          <PowerIcon />
      </button>
      <Header t={t} />
      <div className="flex items-center space-x-4">
        <LanguageSwitcher setLocale={setLocale} currentLocale={locale} />
        <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} t={t}/>
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
            <ModeSwitcher mode={appMode} setMode={handleModeChange} t={t} />
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
        apiKey={apiKey}
      />
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
    </div>
  );
};

export default App;