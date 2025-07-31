import { StorageService, StorageConnection, CloudFile, StorageProvider } from '@/types/storage';

interface DropboxEntry {
  '.tag': string;
  id: string;
  name: string;
  path_display: string;
  size: number;
  client_modified: string;
}

interface DropboxEntry {
  '.tag': string;
  id: string;
  name: string;
  path_display: string;
  size: number;
  client_modified: string;
}

interface DropboxEntry {
  '.tag': string;
  id: string;
  name: string;
  path_display: string;
  size: number;
  client_modified: string;
}

export class DropboxService implements StorageService {
  public accessToken: string | null = null;
  private readonly clientId = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
  private readonly redirectUri = process.env.NEXT_PUBLIC_DROPBOX_REDIRECT_URI;

  async authenticate(): Promise<StorageConnection> {
    if (!this.clientId || !this.redirectUri) {
      throw new Error(`Dropbox 연동을 위해서는 환경 변수 설정이 필요합니다. 
        
필요한 환경 변수:
- NEXT_PUBLIC_DROPBOX_CLIENT_ID
- NEXT_PUBLIC_DROPBOX_REDIRECT_URI

.env.local 파일에 해당 값들을 설정해주세요.`);
    }

    // OAuth 2.0 flow
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&token_access_type=offline`;
    
    // Open popup window for authentication
    const popup = window.open(authUrl, 'dropbox-auth', 'width=500,height=600');
    
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          reject(new Error('Authentication cancelled'));
        }
      }, 1000);

      // Listen for message from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'DROPBOX_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', messageHandler);
          
          this.accessToken = event.data.accessToken;
          resolve({
            provider: 'dropbox',
            accessToken: event.data.accessToken,
            refreshToken: event.data.refreshToken,
            expiresAt: event.data.expiresAt,
            userId: event.data.userId,
            displayName: event.data.displayName
          });
        } else if (event.data.type === 'DROPBOX_AUTH_ERROR') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  async listFiles(path: string = ''): Promise<CloudFile[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    console.log('🔍 Dropbox listFiles called with path:', path, 'token:', this.accessToken ? 'Token exists' : 'No token');

    try {
      const response = await fetch('/api/dropbox/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'list_files',
          data: { path },
          accessToken: this.accessToken
        })
      });

      console.log('🔍 Dropbox API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Dropbox API error:', errorText);
        throw new Error(`Failed to list files: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Dropbox API response data:', data);
      console.log('🔍 Total entries found:', data.entries?.length || 0);
      
      if (data.entries) {
        const allFiles = data.entries.filter((entry: DropboxEntry) => entry['.tag'] === 'file');
        const jsonFiles = allFiles.filter((entry: DropboxEntry) => entry.name.endsWith('.json'));
        
        console.log('🔍 All files:', allFiles.map((f: DropboxEntry) => f.name));
        console.log('🔍 JSON files:', jsonFiles.map((f: DropboxEntry) => f.name));
        
        // 폴더도 보여주기 (디버깅용)
        const folders = data.entries.filter((entry: DropboxEntry) => entry['.tag'] === 'folder');
        console.log('🔍 Folders found:', folders.map((f: DropboxEntry) => f.name));
        
        return jsonFiles.map((entry: DropboxEntry) => ({
          id: entry.path_display, // Use path_display as ID for downloads
          name: entry.name,
          path: entry.path_display,
          size: entry.size,
          modifiedAt: entry.client_modified,
          provider: 'dropbox' as StorageProvider
        }));
      }
      
      console.log('🔍 No entries found in response');
      return [];
    } catch (error) {
      console.error('🔍 Dropbox listFiles error:', error);
      throw error;
    }
  }

  async getFile(fileId: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/dropbox/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'download_file',
        data: { path: fileId },
        accessToken: this.accessToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const result = await response.json();
    return result.content;
  }

  async saveFile(fileId: string, content: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/dropbox/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upload_file',
        data: { 
          path: fileId,
          content: content,
          mode: 'overwrite'
        },
        accessToken: this.accessToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save file');
    }
  }

  async createFile(name: string, content: string, path: string = ''): Promise<CloudFile> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const filePath = path ? `${path}/${name}` : `/${name}`;
    
    const response = await fetch('/api/dropbox/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upload_file',
        data: { 
          path: filePath,
          content: content,
          mode: 'add'
        },
        accessToken: this.accessToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create file');
    }

    const data = await response.json();
    return {
      id: data.path_display,
      name: data.name,
      path: data.path_display,
      size: data.size,
      modifiedAt: data.client_modified,
      provider: 'dropbox'
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/dropbox/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete_file',
        data: { path: fileId },
        accessToken: this.accessToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }
}
