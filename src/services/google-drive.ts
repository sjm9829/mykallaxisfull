import { StorageService, StorageConnection, CloudFile, StorageProvider } from '@/types/storage';
import { handleAPIError, createEnvironmentError, AuthenticationError, NetworkError } from '@/lib/error-handler';

export class GoogleDriveService implements StorageService {
  public accessToken: string | null = null;
  private readonly clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  private readonly redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  async authenticate(): Promise<StorageConnection> {
    if (!this.clientId || !this.redirectUri) {
      const error = createEnvironmentError('Google Drive', [
        'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
        'NEXT_PUBLIC_GOOGLE_REDIRECT_URI'
      ]);
      console.error('🔍 Environment error:', error.message);
      throw error;
    }

    try {
      // OAuth 2.0 flow
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&access_type=offline&prompt=consent`;

      // Open popup window for authentication
      const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');

      if (!popup) {
        throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
      }

      console.log('🔍 Popup opened, waiting for callback...');

      return new Promise((resolve, reject) => {
        let isResolved = false;
        let checkClosedInterval: NodeJS.Timeout | null = null;

        // Google의 COOP 정책으로 인해 window.closed 체크가 불가능할 수 있으므로
        // 더 관대한 방식으로 팝업 상태를 체크합니다
        const checkClosed = () => {
          try {
            // popup.closed 접근을 시도하되, 실패해도 계속 진행
            if (popup?.closed && !isResolved) {
              console.log('🔍 Popup was closed by user');
              if (checkClosedInterval) {
                clearInterval(checkClosedInterval);
                checkClosedInterval = null;
              }
              isResolved = true;
              reject(new Error('사용자가 인증을 취소했습니다.'));
            }
          } catch {
            // Cross-Origin-Opener-Policy로 인한 에러는 무시
            console.log('🔍 Cannot check popup.closed due to COOP policy - this is normal for Google OAuth');
          }
        };

        // 1초마다 팝업 상태 체크 (에러가 발생해도 계속 진행)
        checkClosedInterval = setInterval(checkClosed, 1000);

        // Listen for message from popup
        const messageHandler = (event: MessageEvent) => {
          console.log('🔍 Received message:', event);
          console.log('🔍 Message origin:', event.origin);
          console.log('🔍 Current origin:', window.location.origin);

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

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            console.log('🔍 Authentication successful');
            if (checkClosedInterval) {
              clearInterval(checkClosedInterval);
              checkClosedInterval = null;
            }
            popup?.close();
            window.removeEventListener('message', messageHandler);
            isResolved = true;

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
            console.error('🔍 Authentication error:', event.data.error);
            if (checkClosedInterval) {
              clearInterval(checkClosedInterval);
              checkClosedInterval = null;
            }
            popup?.close();
            window.removeEventListener('message', messageHandler);
            isResolved = true;
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageHandler);

        // Add timeout to prevent hanging forever (5 minutes)
        setTimeout(() => {
          if (!isResolved) {
            console.error('🔍 Authentication timeout');
            if (checkClosedInterval) {
              clearInterval(checkClosedInterval);
              checkClosedInterval = null;
            }
            popup?.close();
            window.removeEventListener('message', messageHandler);
            isResolved = true;
            reject(new Error('인증 시간이 초과되었습니다. 다시 시도해주세요.'));
          }
        }, 300000); // 5 minutes timeout
      });
    } catch (error) {
      console.error('🔍 Google Drive authenticate error:', error);
      throw handleAPIError(error, 'Google Drive');
    }
  }

  async listFiles(path: string = ''): Promise<CloudFile[]> {
    if (!this.accessToken) {
      throw new AuthenticationError('Google Drive');
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
        throw new NetworkError('Google Drive', response.status);
      }

      const data = await response.json();
      console.log('🔍 Google Drive API response data:', data);
      
      if (data.files) {
        const jsonFiles = data.files.filter((file: { name: string }) => file.name.endsWith('.json'));
        console.log('🔍 JSON files found:', jsonFiles.map((f: { name: string }) => f.name));
        console.log('🔍 File details:', jsonFiles.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })));
        
        return jsonFiles.map((file: { id: string; name: string; size?: string; modifiedTime?: string }) => ({
          id: file.id,
          name: file.name,
          path: `/${file.name}`,
          size: parseInt(file.size || '0') || 0,
          modifiedAt: file.modifiedTime,
          provider: 'googledrive' as StorageProvider
        }));
      }
      
      console.log('🔍 No files found in response');
      return [];
    } catch (error) {
      console.error('🔍 Google Drive listFiles error:', error);
      throw handleAPIError(error, 'Google Drive');
    }
  }

  async getFile(fileId: string): Promise<string> {
    if (!this.accessToken) {
      throw new AuthenticationError('Google Drive');
    }

    try {
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
        throw new NetworkError('Google Drive', response.status);
      }

      const result = await response.json();
      return result.content;
    } catch (error) {
      throw handleAPIError(error, 'Google Drive');
    }
  }

  async saveFile(fileId: string, content: string): Promise<void> {
    if (!this.accessToken) {
      throw new AuthenticationError('Google Drive');
    }

    try {
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
        throw new NetworkError('Google Drive', response.status);
      }
    } catch (error) {
      throw handleAPIError(error, 'Google Drive');
    }
  }

  async createFile(name: string, content: string, path: string = ''): Promise<CloudFile> {
    if (!this.accessToken) {
      throw new AuthenticationError('Google Drive');
    }

    try {
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
        throw new NetworkError('Google Drive', response.status);
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
    } catch (error) {
      throw handleAPIError(error, 'Google Drive');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) {
      throw new AuthenticationError('Google Drive');
    }

    try {
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
        throw new NetworkError('Google Drive', response.status);
      }
    } catch (error) {
      throw handleAPIError(error, 'Google Drive');
    }
  }
}
