export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export type ProgressCallback = (message: string) => void;

export interface GenerateVideoParams {
  prompt: string;
  model: string;
  image?: ImageData;
  apiKey: string;
}

export interface GenerateVideoServiceParams extends GenerateVideoParams {
  onProgress: ProgressCallback;
  loadingMessages: string[];
}

export interface GalleryItem {
  id: string;
  videoUrl: string;
  prompt: string;
  imageData?: ImageData;
  preview?: string;
  timestamp: number;
}