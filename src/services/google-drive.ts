import { StorageService, StorageConnection, CloudFile, StorageProvider } from '@/types/storage';

export class GoogleDriveService implements StorageService {
  public accessToken: string | null = null;
  private readonly clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  private readonly redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  async authenticate(): Promise<StorageConnection> {
    if (!this.clientId || !this.redirectUri) {
      throw new Error(`Google Drive 연동을 위해서는 환경 변수 설정이 필요합니다. 
        
필요한 환경 변수:
- NEXT_PUBLIC_GOOGLE_CLIENT_ID
- NEXT_PUBLIC_GOOGLE_REDIRECT_URI

.env.local 파일에 해당 값들을 설정해주세요.`);
    }

    // OAuth 2.0 flow
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&access_type=offline&prompt=consent`;
    
    // Open popup window for authentication
    const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
    
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
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', messageHandler);
          
          this.accessToken = event.data.accessToken;
          resolve({
            provider: 'googledrive',
            accessToken: event.data.accessToken,
            refreshToken: event.data.refreshToken,
            expiresAt: event.data.expiresAt,
            userId: event.data.userId,
            displayName: event.data.displayName
          });
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
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

    console.log('🔍 Google Drive listFiles called with token:', this.accessToken ? 'Token exists' : 'No token');

    try {
      const response = await fetch('/api/google/proxy', {
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

      console.log('🔍 Google Drive API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Google Drive API error:', errorText);
        throw new Error(`Failed to list files: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Google Drive API response data:', data);
      
      if (data.files) {
        const jsonFiles = data.files.filter((file: any) => file.name.endsWith('.json'));
        console.log('🔍 JSON files found:', jsonFiles.map((f: any) => f.name));
        console.log('🔍 File details:', jsonFiles.map((f: any) => ({ id: f.id, name: f.name })));
        
        return jsonFiles.map((file: any) => ({
          id: file.id,
          name: file.name,
          path: `/${file.name}`,
          size: parseInt(file.size) || 0,
          modifiedAt: file.modifiedTime,
          provider: 'googledrive' as StorageProvider
        }));
      }
      
      console.log('🔍 No files found in response');
      return [];
    } catch (error) {
      console.error('🔍 Google Drive listFiles error:', error);
      throw error;
    }
  }

  async getFile(fileId: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/google/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'download_file',
        data: { fileId },
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

    const response = await fetch('/api/google/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'update_file',
        data: { 
          fileId,
          content: content
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

    const response = await fetch('/api/google/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upload_file',
        data: { 
          fileName: name,
          content: content,
          parentId: path
        },
        accessToken: this.accessToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create file');
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      path: `/${data.name}`,
      size: parseInt(data.size) || 0,
      modifiedAt: data.modifiedTime,
      provider: 'googledrive'
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/google/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'delete_file',
        data: { fileId },
        accessToken: this.accessToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }
}
