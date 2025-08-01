import { StorageProvider } from '@/types/storage';
import type { StorageConnection } from '@/types/storage';
import { storageManager } from '@/lib/storage-manager';

interface CloudFileInfo {
  provider: StorageProvider;
  fileId: string;
  fileName: string;
}

export function getActiveCloudFile(): CloudFileInfo | null {
  try {
    const stored = localStorage.getItem('active-cloud-file');
    if (!stored) return null;
    
    const cloudFile = JSON.parse(stored);
    
    // 토큰 상태 디버깅
    const isConnected = storageManager.isConnected();
    const connection = storageManager.getActiveConnection();
    console.log('🔍 Token debug:', {
      isConnected,
      hasConnection: !!connection,
      expiresAt: connection?.expiresAt,
      currentTime: Date.now(),
      isExpired: connection?.expiresAt ? Date.now() > connection.expiresAt : 'no expiry'
    });
    
    // 클라우드 파일이 있지만 토큰이 만료된 경우 사전 정리
    if (!isConnected) {
      console.warn('🚨 Cloud file exists but token is expired, cleaning up...');
      // 직접 정리 (무한 루프 방지)
      localStorage.removeItem('active-cloud-file');
      storageManager.disconnect();
      cleanupRecentCollections(); // 비동기지만 기다리지 않음
      return null;
    }
    
    // 실제 API 호출로 토큰 유효성 검증 (비동기이므로 백그라운드에서 실행)
    if (connection?.accessToken) {
      validateTokenInBackground(cloudFile.provider, connection).catch(() => {
        // 백그라운드 검증 실패는 조용히 무시 (실제 사용 시 재검증됨)
      });
    }
    
    return cloudFile;
  } catch (error) {
    console.error('Error in getActiveCloudFile:', error);
    // localStorage 오류 등의 경우 정리
    try {
      localStorage.removeItem('active-cloud-file');
    } catch {
      // localStorage 접근 불가능한 경우도 무시
    }
    return null;
  }
}

// 백그라운드에서 실제 API 호출로 토큰 검증
async function validateTokenInBackground(provider: StorageProvider, connection: StorageConnection): Promise<void> {
  try {
    // 네트워크 연결 확인
    if (!navigator.onLine) {
      console.log('🔍 Offline mode - skipping token validation');
      return;
    }

    if (provider === 'dropbox' && connection.accessToken) {
      // AbortController로 타임아웃 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

      try {
        // Dropbox API로 토큰 유효성 확인
        const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
          console.warn('🚨 Dropbox token is invalid, cleaning up...');
          localStorage.removeItem('active-cloud-file');
          storageManager.disconnect();
          cleanupRecentCollections();
        } else if (!response.ok) {
          console.warn(`🔍 Token validation warning: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    }
  } catch (error: unknown) {
    // AbortError는 타임아웃이므로 로그만 남김
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🔍 Token validation timeout - will retry on next use');
    } else if (error instanceof Error && error.message?.includes('Failed to fetch')) {
      console.log('🔍 Network error during token validation - will retry on next use');
    } else {
      console.error('Token validation failed:', error);
    }
    // 모든 에러는 조용히 처리 (실제 사용 시 재검증)
  }
}

export function setActiveCloudFile(cloudFile: CloudFileInfo | null): void {
  if (cloudFile) {
    localStorage.setItem('active-cloud-file', JSON.stringify(cloudFile));
  } else {
    localStorage.removeItem('active-cloud-file');
  }
}

export async function saveToCloudFile(cloudFile: CloudFileInfo, content: string): Promise<void> {
  // 토큰 유효성 사전 검증
  if (!storageManager.isConnected()) {
    cleanupCloudState();
    throw new Error('클라우드 인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  const service = storageManager.getService(cloudFile.provider);
  if (!service) {
    throw new Error(`${cloudFile.provider} 서비스를 찾을 수 없습니다.`);
  }

  // 연결 정보로 토큰 설정
  const connection = storageManager.getActiveConnection();
  if (!connection) {
    cleanupCloudState();
    throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
  }

  // 서비스에 토큰 설정
  if (cloudFile.provider === 'dropbox') {
    (service as { accessToken?: string }).accessToken = connection.accessToken;
  } else if (cloudFile.provider === 'googledrive') {
    (service as { accessToken?: string }).accessToken = connection.accessToken;
  }

  await service.saveFile(cloudFile.fileId, content);
}

export async function loadFromCloudFile(cloudFile: CloudFileInfo, forceRefresh: boolean = false): Promise<string> {
  // 토큰 유효성 사전 검증
  if (!storageManager.isConnected()) {
    cleanupCloudState();
    throw new Error('클라우드 인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  const service = storageManager.getService(cloudFile.provider);
  if (!service) {
    throw new Error(`${cloudFile.provider} 서비스를 찾을 수 없습니다.`);
  }

  // 연결 정보로 토큰 설정
  const connection = storageManager.getActiveConnection();
  if (!connection) {
    cleanupCloudState();
    throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
  }

  // 서비스에 토큰 설정
  if (cloudFile.provider === 'dropbox') {
    (service as { accessToken?: string }).accessToken = connection.accessToken;
  } else if (cloudFile.provider === 'googledrive') {
    (service as { accessToken?: string }).accessToken = connection.accessToken;
  }

  // 강제 새로고침 옵션을 서비스에 전달
  const content = await service.getFile(cloudFile.fileId, forceRefresh);
  
  return content;
}

export function isUsingCloudStorage(): boolean {
  return getActiveCloudFile() !== null;
}

export function getStorageTypeDisplay(): string {
  const cloudFile = getActiveCloudFile();
  if (!cloudFile) return '로컬 파일';
  
  return storageManager.getProviderDisplayName(cloudFile.provider);
}

export function cleanupCloudState(): void {
  // localStorage의 클라우드 파일 정보 제거
  setActiveCloudFile(null);
  
  // storage-manager의 연결 정보도 정리
  storageManager.disconnect();
  
  // 최근 컬렉션 정보도 정리 (클라우드 컬렉션 혼동 방지)
  cleanupRecentCollections();
  
  console.log('🧹 Cloud state cleaned up due to token expiration');
}

async function cleanupRecentCollections(): Promise<void> {
  try {
    // 최근 컬렉션 정보 제거 (토큰 만료 시 혼동 방지)
    // IndexedDB에서 last-opened-collection 정보를 직접 제거
    if (typeof window !== 'undefined') {
      const { openDB } = await import('idb');
      const db = await openDB('mkif-app-db', 2);
      const tx = db.transaction('last-opened-collection', 'readwrite');
      await tx.objectStore('last-opened-collection').clear();
      await tx.done;
      console.log('🧹 Recent collection info cleared to prevent confusion');
    }
  } catch (error) {
    console.error('Failed to cleanup recent collections:', error);
  }
}
