export type StorageProvider = 'local' | 'dropbox' | 'googledrive' | 'onedrive';

export interface StorageConnection {
  provider: StorageProvider;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  displayName?: string;
}

export interface CloudFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  downloadUrl?: string;
  provider: StorageProvider;
}

export interface StorageService {
  authenticate(): Promise<StorageConnection>;
  listFiles(path?: string): Promise<CloudFile[]>;
  getFile(fileId: string, forceRefresh?: boolean): Promise<string>;
  saveFile(fileId: string, content: string): Promise<void>;
  createFile(name: string, content: string, path?: string): Promise<CloudFile>;
  deleteFile(fileId: string): Promise<void>;
}
