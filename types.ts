// Moved Progress types here to be shared across the application.
export type ProgressStatus = 'pending' | 'in-progress' | 'completed';
export type Progress = Record<string, ProgressStatus>;

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum AppMode {
    VIDEO = 'VIDEO',
    IMAGE = 'IMAGE',
    IMAGE_BUILDER = 'IMAGE_BUILDER',
    IMAGE_FUSION = 'IMAGE_FUSION',
    SCENE_BUILD = 'SCENE_BUILD',
    CHAT = 'CHAT',
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageResolution = '1k' | '2k';
export type VideoResolution = '720p' | '1080p';

export interface GenerateVideoParams {
  prompt: string;
  model: string;
  apiKey: string;
  image?: ImageData;
  aspectRatio?: AspectRatio;
  signal?: AbortSignal;
  durationSecs?: number;
  numberOfVideos?: number;
  resolution?: VideoResolution;
  generatePeople?: boolean;
}

export interface GenerateImageParams {
  prompt: string;
  model: string;
  numberOfImages: number;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  apiKey: string;
  outputMimeType: 'image/jpeg' | 'image/png';
  signal?: AbortSignal;
}

export interface NanoBananaResultPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}
export interface EditImageServiceParams {
  prompt: string;
  images: ImageData[];
  apiKey:string;
  model: string;
  signal?: AbortSignal;
}

export interface EnhancePromptParams {
  prompt: string;
  apiKey: string;
  instruction?: string;
  signal?: AbortSignal;
}

export interface ImageBuilderStep {
    prompt: string;
    resultImage: ImageData;
    additionalImagesUsed?: ImageData[];
}
// FIX: Added missing GalleryItem and related types to resolve import errors.
interface BaseGalleryItem {
  id: string;
  timestamp: number;
}

export interface VideoGalleryItem extends BaseGalleryItem {
  type: 'video';
  videoUrl: string;
  prompt: string;
  imageData?: ImageData;
}

export interface ImageGalleryItem extends BaseGalleryItem {
  type: 'image';
  imageUrls: string[];
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  model: string;
}

export interface ImageBuilderGalleryItem extends BaseGalleryItem {
  type: 'image_builder';
  initialImage: ImageData;
  steps: ImageBuilderStep[];
  model?: string;
}

export interface ImageFusionGalleryItem extends BaseGalleryItem {
  type: 'image_fusion';
  productImage: ImageData;
  sceneImage: ImageData;
  resultParts: NanoBananaResultPart[];
  model?: string;
}

// FIX: Added missing NanoBananaGalleryItem interface to support 'nano_banana' type in gallery.
export interface NanoBananaGalleryItem extends BaseGalleryItem {
  type: 'nano_banana';
  prompt: string;
  inputImages: ImageData[];
  resultParts: NanoBananaResultPart[];
  model?: string;
}

export type GalleryItem =
  | VideoGalleryItem
  | ImageGalleryItem
  | ImageBuilderGalleryItem
  | ImageFusionGalleryItem
  // FIX: Added NanoBananaGalleryItem to the union type.
  | NanoBananaGalleryItem;

export type GalleryItemData = Omit<GalleryItem, 'id' | 'timestamp'>;