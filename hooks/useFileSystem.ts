import { useState, useEffect, useCallback } from 'react';

// FIX: Add type definitions for File System Access API
// to resolve TypeScript errors with experimental properties.
interface FileSystemDirectoryHandleWithPermissions extends FileSystemDirectoryHandle {
  queryPermission(descriptor?: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode: 'readwrite' }): Promise<PermissionState>;
}

interface WindowWithDirectoryPicker extends Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandleWithPermissions>;
}

// Simplified IndexedDB helpers embedded for use with the hook
const DB_NAME = 'file-system-db';
const STORE_NAME = 'handles';
const DB_VERSION = 1;
const HANDLE_KEY = 'directory-handle';

async function getHandleFromDB(): Promise<FileSystemDirectoryHandle | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(HANDLE_KEY);
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
        db.close();
      };
      getRequest.onerror = (e) => {
        reject(e);
        db.close();
      };
    };
    request.onerror = (e) => reject(e);
  });
}

async function setHandleInDB(handle?: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(handle, HANDLE_KEY);
      putRequest.onsuccess = () => {
        resolve();
        db.close();
      };
      putRequest.onerror = (e) => {
        reject(e);
        db.close();
      };
    };
    request.onerror = (e) => reject(e);
  });
}

// Check for API support, ensuring it's not in a cross-origin iframe
const isApiSupported = 'showDirectoryPicker' in window && window.self === window.top;

export const useFileSystem = () => {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On load, try to get handle from DB and verify permission
  useEffect(() => {
    if (!isApiSupported) return;

    const verifyPermission = async () => {
      try {
        const handle = await getHandleFromDB();
        if (handle) {
          // FIX: Use type assertion for queryPermission.
          if ((await (handle as FileSystemDirectoryHandleWithPermissions).queryPermission({ mode: 'readwrite' })) === 'granted') {
            setDirectoryHandle(handle);
          } else {
            // Permission may have been revoked. Clear the stored handle.
            await setHandleInDB(undefined);
          }
        }
      } catch (err) {
        console.error("Error verifying file system permission:", err);
      }
    };

    verifyPermission();
  }, []);

  const selectDirectory = useCallback(async () => {
    setError(null);
    if (!isApiSupported) {
      setError("Your browser does not support the File System Access API.");
      return;
    }
    try {
      // FIX: Use type assertion for showDirectoryPicker.
      const handle = await (window as unknown as WindowWithDirectoryPicker).showDirectoryPicker();
      await setHandleInDB(handle);
      setDirectoryHandle(handle);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error("Error selecting directory:", err);
        setError("Could not get permission to access the directory.");
      }
    }
  }, []);

  const saveFile = useCallback(async (blob: Blob, filename: string): Promise<boolean> => {
    if (!directoryHandle) {
      return false;
    }

    const writeFile = async (): Promise<boolean> => {
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
    };

    try {
        const handleWithPerms = directoryHandle as FileSystemDirectoryHandleWithPermissions;

        const permissionStatus = await handleWithPerms.queryPermission({ mode: 'readwrite' });
        if (permissionStatus === 'granted') {
            return await writeFile();
        }
        
        const requestedPermission = await handleWithPerms.requestPermission({ mode: 'readwrite' });
        if (requestedPermission === 'granted') {
            return await writeFile();
        } else {
            setError("Permission to write to the directory was denied.");
            setDirectoryHandle(null);
            await setHandleInDB(undefined);
            return false;
        }
    } catch (err) {
        if (err instanceof DOMException && (err.name === 'SecurityError' || err.name === 'NotAllowedError')) {
            console.warn(`Auto-save failed: ${err.message}. This is expected for long operations. The app will fall back to manual downloads.`);
        } else {
            console.error("Error saving file:", err);
            setError(`Failed to save file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        return false;
    }
  }, [directoryHandle]);

  return {
    directoryHandle,
    directoryName: directoryHandle?.name || null,
    selectDirectory,
    saveFile,
    isSupported: isApiSupported,
    error,
    clearError: () => setError(null)
  };
};
