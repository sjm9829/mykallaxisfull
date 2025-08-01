import { StorageService, StorageConnection, CloudFile, StorageProvider } from '@/types/storage';
import { handleAPIError, createEnvironmentError, AuthenticationError, NetworkError } from '@/lib/error-handler';

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
      const error = createEnvironmentError('Dropbox', [
        'NEXT_PUBLIC_DROPBOX_CLIENT_ID',
        'NEXT_PUBLIC_DROPBOX_REDIRECT_URI'
      ]);
      console.error('🔍 Environment error:', error.message);
      throw error;
    }

    try {
      // OAuth 2.0 flow
      const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&token_access_type=offline`;

      // Open popup window for authentication
      const popup = window.open(authUrl, 'dropbox-auth', 'width=500,height=600');

      if (!popup) {
        throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
      }

      return new Promise((resolve, reject) => {
        let isResolved = false;

        const checkClosed = setInterval(() => {
          if (popup?.closed && !isResolved) {
            clearInterval(checkClosed);
            isResolved = true;
            reject(new Error('사용자가 인증을 취소했습니다.'));
          }
        }, 1000);

        // Listen for message from popup
        const messageHandler = (event: MessageEvent) => {
          // Origin check - be more flexible for development
          const validOrigins = [
            window.location.origin,
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://10.5.0.2:3001' // Add Docker/network origin
          ];

          if (!validOrigins.includes(event.origin)) {
            console.warn('🔍 Message from invalid origin:', event.origin);
            return;
          }

          if (event.data.type === 'DROPBOX_AUTH_SUCCESS') {
            clearInterval(checkClosed);
            popup?.close();
            window.removeEventListener('message', messageHandler);
            isResolved = true;

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
            console.error('🔍 Authentication error:', event.data.error);
            clearInterval(checkClosed);
            popup?.close();
            window.removeEventListener('message', messageHandler);
            isResolved = true;
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageHandler);

        // Add timeout to prevent hanging forever
        setTimeout(() => {
          if (!isResolved) {
            console.error('🔍 Authentication timeout');
            clearInterval(checkClosed);
            popup?.close();
            window.removeEventListener('message', messageHandler);
            isResolved = true;
            reject(new Error('인증 시간이 초과되었습니다. 다시 시도해주세요.'));
          }
        }, 300000); // 5 minutes timeout
      });
    } catch (error) {
      console.error('🔍 Dropbox authenticate error:', error);
      throw handleAPIError(error, 'Dropbox');
    }
  }

  async listFiles(path: string = ''): Promise<CloudFile[]> {
    if (!this.accessToken) {
      throw new AuthenticationError('Dropbox');
    }

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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Dropbox API error:', errorText);
        throw new NetworkError('Dropbox', response.status);
      }

      const data = await response.json();
      
      if (data.entries) {
        const allFiles = data.entries.filter((entry: DropboxEntry) => entry['.tag'] === 'file');
        const jsonFiles = allFiles.filter((entry: DropboxEntry) => entry.name.endsWith('.json'));
        
        return jsonFiles.map((entry: DropboxEntry) => ({
          id: entry.path_display, // Use path_display as ID for downloads
          name: entry.name,
          path: entry.path_display,
          size: entry.size,
          modifiedAt: entry.client_modified,
          provider: 'dropbox' as StorageProvider
        }));
      }
      
      return [];
    } catch (error) {
      console.error('🔍 Dropbox listFiles error:', error);
      throw handleAPIError(error, 'Dropbox');
    }
  }

  async getFile(fileId: string, forceRefresh: boolean = false): Promise<string> {
    if (!this.accessToken) {
      throw new AuthenticationError('Dropbox');
    }

    try {
      const requestBody: {
        action: string;
        data: { path: string; timestamp?: number };
        accessToken: string;
      } = {
        action: 'download_file',
        data: { path: fileId },
        accessToken: this.accessToken
      };

      // 강제 새로고침이거나 기본적으로 캐시 방지를 위한 타임스탬프 추가
      if (forceRefresh || true) { // 항상 캐시 방지
        requestBody.data.timestamp = Date.now();
      }

      const response = await fetch('/api/dropbox/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new NetworkError('Dropbox', response.status);
      }

      const result = await response.json();
      // 파일명과 함께 반환되는 경우 처리
      if (result.content) {
        return result.content;
      }
      // 호환성을 위해 기존 방식도 지원
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      throw handleAPIError(error, 'Dropbox');
    }
  }

  async saveFile(fileId: string, content: string): Promise<void> {
    if (!this.accessToken) {
      throw new AuthenticationError('Dropbox');
    }

    try {
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
        throw new NetworkError('Dropbox', response.status);
      }
    } catch (error) {
      throw handleAPIError(error, 'Dropbox');
    }
  }

  async createFile(name: string, content: string, path: string = ''): Promise<CloudFile> {
    if (!this.accessToken) {
      throw new AuthenticationError('Dropbox');
    }

    try {
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
        throw new NetworkError('Dropbox', response.status);
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
    } catch (error) {
      throw handleAPIError(error, 'Dropbox');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) {
      throw new AuthenticationError('Dropbox');
    }

    try {
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
        throw new NetworkError('Dropbox', response.status);
      }
    } catch (error) {
      throw handleAPIError(error, 'Dropbox');
    }
  }
}
