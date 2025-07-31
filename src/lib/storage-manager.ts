import { StorageService, StorageProvider, StorageConnection } from '@/types/storage';
import { DropboxService } from '@/services/dropbox';
import { GoogleDriveService } from '@/services/google-drive';

export class StorageManager {
  private services: Map<StorageProvider, StorageService> = new Map();
  private activeConnection: StorageConnection | null = null;

  constructor() {
    this.services.set('dropbox', new DropboxService());
    this.services.set('googledrive', new GoogleDriveService());
  }

  getService(provider: StorageProvider): StorageService | undefined {
    return this.services.get(provider);
  }

  async connectToProvider(provider: StorageProvider): Promise<StorageConnection> {
    const service = this.getService(provider);
    if (!service) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    console.log('🔍 Connecting to provider:', provider);
    const connection = await service.authenticate();
    console.log('🔍 Connection established:', connection);
    
    this.activeConnection = connection;
    
    // Store connection in localStorage for persistence
    localStorage.setItem('storage-connection', JSON.stringify(connection));
    
    // Set access token for Dropbox service
    if (provider === 'dropbox' && service instanceof DropboxService) {
      (service as { accessToken?: string }).accessToken = connection.accessToken;
    }
    
    return connection;
  }

  getActiveConnection(): StorageConnection | null {
    if (this.activeConnection) {
      return this.activeConnection;
    }

    // Try to restore from localStorage
    const stored = localStorage.getItem('storage-connection');
    if (stored) {
      try {
        this.activeConnection = JSON.parse(stored);
        return this.activeConnection;
      } catch (e) {
        console.error('Failed to parse stored connection:', e);
        localStorage.removeItem('storage-connection');
      }
    }

    return null;
  }

  disconnect(): void {
    this.activeConnection = null;
    localStorage.removeItem('storage-connection');
  }

  isConnected(): boolean {
    const connection = this.getActiveConnection();
    if (!connection) return false;

    // Check if token is expired
    if (connection.expiresAt && Date.now() > connection.expiresAt) {
      this.disconnect();
      return false;
    }

    return true;
  }

  getProviderDisplayName(provider: StorageProvider): string {
    switch (provider) {
      case 'dropbox':
        return 'Dropbox';
      case 'googledrive':
        return 'Google Drive';
      case 'onedrive':
        return 'OneDrive';
      case 'local':
        return '로컬 파일';
      default:
        return provider;
    }
  }
}

// Singleton instance
export const storageManager = new StorageManager();
