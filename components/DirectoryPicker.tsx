
import React from 'react';
import { FolderPlusIcon } from './IconComponents';

interface DirectoryPickerProps {
    directoryName: string | null;
    onSelectDirectory: () => void;
    isSupported: boolean;
    t: (key: string) => string;
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({ directoryName, onSelectDirectory, isSupported, t }) => {
    if (!isSupported) {
        return (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                <p>{t('fileSystemApiNotSupported')}</p>
            </div>
        );
    }

    return (
        <div className="text-center">
            {directoryName ? (
                <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('savingTo')}: </span>
                    <strong className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{directoryName}</strong>
                    <button 
                        onClick={onSelectDirectory} 
                        className="ml-2 text-blue-500 dark:text-blue-400 hover:underline text-xs"
                        title={t('tooltips.changeSaveLocation')}
                    >
                        ({t('changeButton')})
                    </button>
                </div>
            ) : (
                <button
                    onClick={onSelectDirectory}
                    className="px-4 py-2 text-sm font-semibold text-white bg-brand-secondary hover:bg-green-600 rounded-lg shadow-md transform transition-transform duration-150 ease-in-out active:scale-95 flex items-center justify-center gap-2"
                    title={t('tooltips.setSaveLocation')}
                >
                    <FolderPlusIcon />
                    {t('setSaveLocationButton')}
                </button>
            )}
        </div>
    );
};
