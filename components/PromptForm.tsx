import React, { useState, useRef } from 'react';
import type { ImageData } from '../types';
import { UploadIcon } from './IconComponents';

interface PromptFormProps {
  onSubmit: () => void;
  t: (key: string) => string;
  prompt: string;
  setPrompt: (prompt: string) => void;
  model: string;
  setModel: (model: string) => void;
  image: { data: ImageData; preview: string } | null;
  setImage: (image: { data: ImageData; preview: string } | null) => void;
}

export const PromptForm: React.FC<PromptFormProps> = ({
  onSubmit,
  t,
  prompt,
  setPrompt,
  model,
  setModel,
  image,
  setImage,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage({
          data: { base64: base64String, mimeType: file.type },
          preview: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    onSubmit();
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('promptLabel')}
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('promptPlaceholder')}
            rows={5}
            className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('imageLabel')}
            </label>
            <input
              type="file"
              id="image-upload"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerFileSelect}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95"
            >
              <UploadIcon />
              {image ? t('imageChangeButton') : t('imageUploadButton')}
            </button>
            {image && (
              <div className="mt-4 relative group">
                <img src={image.preview} alt="Image preview" className="w-full h-auto rounded-lg" />
                 <button 
                    type="button" 
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('modelLabel')}
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-800 dark:text-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200"
              >
                <option value="veo-3.0-generate-preview">veo-3.0-generate-preview</option>
                <option value="veo-2.0-generate-001">veo-2.0-generate-001</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={!prompt.trim() || isSubmitting}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-transform duration-150 ease-in-out active:scale-95 bg-200% animate-gradient-pulse"
          >
            {isSubmitting ? t('generatingButton') : t('generateButton')}
          </button>
        </div>
      </form>
    </div>
  );
};