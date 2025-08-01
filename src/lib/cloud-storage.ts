import { StorageProvider } from '@/types/storage';
import { storageManager } from '@/lib/storage-manager';

interface CloudFileInfo {
  provider: StorageProvider;
  fileId: string;
  fileName: string;
}

export function getActiveCloudFile(): CloudFileInfo | null {
  try {
    const stored = localStorage.getItem('active-cloud-file');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
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
  const service = storageManager.getService(cloudFile.provider);
  if (!service) {
    throw new Error(`${cloudFile.provider} 서비스를 찾을 수 없습니다.`);
  }

  // 연결 정보로 토큰 설정
  const connection = storageManager.getActiveConnection();
  if (!connection) {
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
  const service = storageManager.getService(cloudFile.provider);
  if (!service) {
    throw new Error(`${cloudFile.provider} 서비스를 찾을 수 없습니다.`);
  }

  // 연결 정보로 토큰 설정
  const connection = storageManager.getActiveConnection();
  if (!connection) {
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
