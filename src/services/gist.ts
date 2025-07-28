import type { Album } from '@/types/album';

export interface GistResponse {
  id: string;
  html_url: string;
  files: {
    [filename: string]: {
      raw_url: string;
    };
  };
}

export interface CollectionData {
  _metadata: {
    username: string;
    collectionName: string;
    createdAt: string;
    updatedAt: string;
  };
  albums: Album[];
}

// Gist 생성 (익명으로)
export const createGist = async (
  albums: Album[], 
  username: string, 
  collectionName: string
): Promise<GistResponse> => {
  const response = await fetch('/api/gist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      albums,
      username,
      collectionName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Gist 생성에 실패했습니다: ${response.statusText}`);
  }

  return response.json();
};

// Gist에서 컬렉션 데이터 로드
export const loadFromGist = async (gistUrl: string): Promise<CollectionData> => {
  const response = await fetch(`/api/gist/load?url=${encodeURIComponent(gistUrl)}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `데이터를 불러올 수 없습니다: ${response.statusText}`);
  }

  const data = await response.json();
  return data as CollectionData;
};

// 공유 URL 유효성 검사 (다양한 서비스 지원)
export const isValidGistUrl = (url: string): boolean => {
  const dpastePattern = /^https:\/\/dpaste\.com\/[a-zA-Z0-9]+$/;
  const jsonbinPattern = /^https:\/\/jsonbin\.io\/[a-f0-9]+$/;
  const jsonbinApiPattern = /^https:\/\/api\.jsonbin\.io\/v3\/b\/[a-f0-9]+/;
  const gistUrlPattern = /^https:\/\/gist\.github\.com\/[^\/]+\/[a-f0-9]+$/;
  const rawUrlPattern = /^https:\/\/gist\.githubusercontent\.com\/[^\/]+\/[a-f0-9]+\/raw/;
  const jsonstorePattern = /^https:\/\/www\.jsonstore\.io\/[a-zA-Z0-9\-_]+$/;
  const jsonstoragePattern = /^https:\/\/api\.jsonstorage\.net\/v1\/json\/[a-f0-9\-]+$/;
  
  return dpastePattern.test(url) ||
         jsonbinPattern.test(url) || jsonbinApiPattern.test(url) ||
         gistUrlPattern.test(url) || rawUrlPattern.test(url) || 
         jsonstorePattern.test(url) || jsonstoragePattern.test(url);
};
