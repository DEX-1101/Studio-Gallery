
import React from 'react';
import { CustomModelSelector } from './CustomModelSelector';
import { SparklesIcon } from './IconComponents';

interface ImageEditModelSelectorProps {
  model: string;
  setModel: (model: string) => void;
  t: (key: string) => string;
  disabled?: boolean;
}

const editModels = [
    { 
      id: 'gemini-2.5-flash-image-preview', 
      name: 'Nano Banana' 
    },
];

export const ImageEditModelSelector: React.FC<ImageEditModelSelectorProps> = ({ model, setModel, t, disabled = false }) => {
  const editModelOptions = editModels.map(m => ({
    id: m.id,
    name: m.name,
    description: t(`modelDescription.${m.id.replace(/[\.\-]/g, '_')}`),
    icon: <SparklesIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
  }));
  
  return (
    <CustomModelSelector
      label={t('modelLabel')}
      options={editModelOptions}
      value={model}
      onChange={setModel}
      disabled={disabled}
      t={t}
    />
  );
};
