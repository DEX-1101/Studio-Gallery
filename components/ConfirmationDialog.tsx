
import React from 'react';
import { CheckIcon, XCircleIcon } from './IconComponents';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  t: (key: string) => string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText,
  cancelText,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-200 mb-4">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700/50 px-6 py-3 flex justify-end items-center gap-4 rounded-b-xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            title={t('tooltips.cancelAction')}
          >
            <span className="flex items-center justify-center gap-1.5">
              <XCircleIcon />
              {cancelText}
            </span>
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-danger hover:bg-red-600 rounded-md shadow-sm transform transition-transform active:scale-95"
            title={t('tooltips.confirmAction')}
          >
            <span className="flex items-center justify-center gap-1.5">
              <CheckIcon className="h-5 w-5 text-white" />
              {confirmText}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
