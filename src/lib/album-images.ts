import type { Album, AlbumImage } from '@/types/album';

/**
 * 앨범의 주 커버 이미지 URL을 반환합니다.
 * 하위 호환성을 위해 coverImageUrl을 우선 확인하고,
 * 없으면 images 배열에서 primary 이미지를 찾습니다.
 */
export function getPrimaryCoverImage(album: Album): string | undefined {
  // 하위 호환성: 기존 coverImageUrl이 있으면 우선 사용
  if (album.coverImageUrl) {
    return album.coverImageUrl;
  }

  // 새로운 구조: images 배열에서 primary 이미지 찾기
  if (album.images && album.images.length > 0) {
    const primaryImage = album.images.find(img => img.isPrimary);
    if (primaryImage) {
      return primaryImage.url;
    }
    // primary가 없으면 첫 번째 이미지 반환
    return album.images[0].url;
  }

  return undefined;
}

/**
 * 앨범의 모든 이미지를 반환합니다.
 */
export function getAllImages(album: Album): AlbumImage[] {
  const images: AlbumImage[] = [];

  // 기존 coverImageUrl이 있고 images 배열에 없으면 추가
  if (album.coverImageUrl && (!album.images || !album.images.some(img => img.url === album.coverImageUrl))) {
    images.push({
      id: 'legacy-cover',
      url: album.coverImageUrl,
      type: 'cover',
      isPrimary: true,
      description: '메인 커버'
    });
  }

  // 새로운 images 배열 추가
  if (album.images) {
    images.push(...album.images);
  }

  return images;
}

/**
 * 특정 타입의 이미지들을 반환합니다.
 */
export function getImagesByType(album: Album, type: AlbumImage['type']): AlbumImage[] {
  return getAllImages(album).filter(img => img.type === type);
}

/**
 * 새로운 이미지를 앨범에 추가합니다.
 */
export function addImageToAlbum(album: Album, imageUrl: string, type: AlbumImage['type'] = 'cover', description?: string, isPrimary: boolean = false): Album {
  const newImage: AlbumImage = {
    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    url: imageUrl,
    type,
    description,
    isPrimary
  };

  // 기존 images 배열이 없으면 생성
  const currentImages = album.images || [];

  // primary로 설정하면 다른 이미지들의 primary를 false로 변경
  if (isPrimary) {
    currentImages.forEach(img => img.isPrimary = false);
  }

  return {
    ...album,
    images: [...currentImages, newImage],
    updatedAt: new Date().toISOString()
  };
}

/**
 * 앨범에서 이미지를 제거합니다.
 */
export function removeImageFromAlbum(album: Album, imageId: string): Album {
  if (!album.images) return album;

  const updatedImages = album.images.filter(img => img.id !== imageId);

  // primary 이미지를 삭제했다면 첫 번째 이미지를 primary로 설정
  if (updatedImages.length > 0 && !updatedImages.some(img => img.isPrimary)) {
    updatedImages[0].isPrimary = true;
  }

  return {
    ...album,
    images: updatedImages,
    updatedAt: new Date().toISOString()
  };
}

/**
 * 이미지의 primary 상태를 변경합니다.
 */
export function setPrimaryImage(album: Album, imageId: string): Album {
  if (!album.images) return album;

  const updatedImages = album.images.map(img => ({
    ...img,
    isPrimary: img.id === imageId
  }));

  return {
    ...album,
    images: updatedImages,
    updatedAt: new Date().toISOString()
  };
}
