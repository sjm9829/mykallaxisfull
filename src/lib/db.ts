import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface StoredCollectionMetadata {
  key: string; // username-collectionName
  username: string;
  collectionName: string;
  albumCount: number; // This will be updated when albums are saved
}

interface LastOpenedCollection {
  key: string; // fixed key, e.g., 'last'
  username: string;
  collectionName: string;
}

// New interface for storing the active file handle
interface MyDB extends DBSchema {
  'collections-metadata': {
    key: string;
    value: StoredCollectionMetadata;
  };
  'last-opened-collection': {
    key: string;
    value: LastOpenedCollection;
  };
  // New object store for the active file handle
  'active-file-handle': {
    key: string;
    value: { key: string; handle: FileSystemFileHandle; }; // Storing the handle directly
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

const getDb = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<MyDB>('mkif-app-db', 2, { // Increment version to trigger upgrade
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('collections-metadata', { keyPath: 'key' });
          db.createObjectStore('last-opened-collection', { keyPath: 'key' });
        }
        if (oldVersion < 2) { // New upgrade step for version 2
          db.createObjectStore('active-file-handle', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

// Functions for collections metadata
export const setCollectionMetadata = async (
  username: string,
  collectionName: string,
  albumCount: number
) => {
  const db = await getDb();
  if (db) {
    const key = `${username}-${collectionName}`;
    await db.put('collections-metadata', { key, username, collectionName, albumCount });
  }
};

export const getCollectionMetadata = async (
  username: string,
  collectionName: string
) => {
  const db = await getDb();
  if (db) {
    const key = `${username}-${collectionName}`;
    return await db.get('collections-metadata', key);
  }
  return undefined;
};

export const getAllCollectionMetadata = async () => {
  const db = await getDb();
  if (db) {
    return await db.getAll('collections-metadata');
  }
  return [];
};

export const deleteCollectionMetadata = async (
  username: string,
  collectionName: string
) => {
  const db = await getDb();
  if (db) {
    const key = `${username}-${collectionName}`;
    await db.delete('collections-metadata', key);
  }
};

// Functions for last opened collection
export const setLastOpenedCollection = async (username: string, collectionName: string) => {
  const db = await getDb();
  if (db) {
    await db.put('last-opened-collection', { key: 'last', username, collectionName });
  }
};

export const getLastOpenedCollection = async () => {
  const db = await getDb();
  if (db) {
    return await db.get('last-opened-collection', 'last');
  }
  return undefined;
};

// Helper to get FileSystemFileHandle from user interaction (open file picker)
export const getFileHandleFromUser = async (): Promise<FileSystemFileHandle | undefined> => {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
    });
    return fileHandle;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // User cancelled the file picker
      return undefined;
    } else {
      console.error('Error opening file:', error);
      return undefined;
    }
  }
};

// Helper to create a new file handle (save file picker)
export const createNewFileHandle = async (suggestedName: string): Promise<FileSystemFileHandle | undefined> => {
  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: suggestedName,
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
    });
    return fileHandle;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // User cancelled the file picker
      return undefined;
    } else {
      console.error('Error creating new file:', error);
      return undefined;
    }
  }
};

// New functions for active file handle
export const setActiveFileHandle = async (handle: FileSystemFileHandle) => {
  const db = await getDb();
  if (db) {
    await db.put('active-file-handle', { key: 'current', handle: handle });
  }
};

export const getActiveFileHandle = async (): Promise<FileSystemFileHandle | undefined> => {
  const db = await getDb();
  if (db) {
    const stored = await db.get('active-file-handle', 'current');
    return stored ? stored.handle : undefined;
  }
  return undefined;
};

export const clearActiveFileHandle = async () => {
  const db = await getDb();
  if (db) {
    await db.delete('active-file-handle', 'current');
  }
};