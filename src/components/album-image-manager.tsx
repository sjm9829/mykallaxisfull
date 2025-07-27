"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, X, Star, Eye } from 'lucide-react';
import type { AlbumImage } from '@/types/album';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AlbumImageManagerProps {
  images: AlbumImage[];
  onImagesChange: (images: AlbumImage[]) => void;
  className?: string;
}

export function AlbumImageManager({ images, onImagesChange, className = '' }: AlbumImageManagerProps) {
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageType, setNewImageType] = useState<AlbumImage['type']>('cover');
  const [newImageDescription, setNewImageDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string>('');

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL을 입력해주세요.');
      return false;
    }

    try {
      const urlObj = new URL(url);
      
      // HTTPS 프로토콜만 허용
      if (urlObj.protocol !== 'https:') {
        setUrlError('HTTPS URL만 허용됩니다.');
        return false;
      }

      // 이미지 파일 확장자 검사 (선택사항)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const pathname = urlObj.pathname.toLowerCase();
      const hasImageExtension = imageExtensions.some(ext => pathname.includes(ext));
      
      // 확장자가 없어도 허용하되 경고 표시
      if (!hasImageExtension && !pathname.includes('discogs.com') && !pathname.includes('imgur.com')) {
        // 일반적인 이미지 호스팅 서비스들은 확장자가 없어도 허용
        const commonImageHosts = ['amazonaws.com', 'googleusercontent.com', 'cloudinary.com', 'github.com'];
        const isCommonHost = commonImageHosts.some(host => urlObj.hostname.includes(host));
        
        if (!isCommonHost) {
          setUrlError('이미지 URL인지 확인해주세요. (jpg, png, gif, webp 등)');
          return false;
        }
      }

      setUrlError('');
      return true;
    } catch {
      setUrlError('올바른 URL 형식이 아닙니다.');
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setNewImageUrl(value);
    if (value.trim()) {
      validateUrl(value.trim());
    } else {
      setUrlError('');
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    
    // URL 유효성 검사
    if (!validateUrl(newImageUrl.trim())) {
      return;
    }

    const newImage: AlbumImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: newImageUrl.trim(),
      type: newImageType,
      description: newImageDescription.trim() || undefined,
      isPrimary: images.length === 0 // 첫 번째 이미지는 자동으로 primary
    };

    onImagesChange([...images, newImage]);
    setNewImageUrl('');
    setNewImageDescription('');
    setUrlError('');
  };

  const handleRemoveImage = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    
    // primary 이미지를 삭제했다면 첫 번째 이미지를 primary로 설정
    if (updatedImages.length > 0 && !updatedImages.some(img => img.isPrimary)) {
      updatedImages[0].isPrimary = true;
    }

    onImagesChange(updatedImages);
  };

  const handleSetPrimary = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }));
    onImagesChange(updatedImages);
  };

  const getTypeLabel = (type: AlbumImage['type']) => {
    const labels = {
      cover: '커버',
      back: '뒷면',
      inside: '내지',
      label: '레이블',
      other: '기타'
    };
    return labels[type];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 기존 이미지 목록 */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">등록된 이미지</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border">
                  <Image
                    src={image.url}
                    alt={image.description || `${getTypeLabel(image.type)} 이미지`}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center text-zinc-400 text-xs">
                    이미지 로드 실패
                  </div>
                </div>
                
                {/* 이미지 정보 오버레이 */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                  <div className="flex justify-between items-start">
                    <div className="text-white text-xs">
                      <div className="font-medium">{getTypeLabel(image.type)}</div>
                      {image.description && (
                        <div className="text-zinc-300">{image.description}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {image.isPrimary && (
                        <div className="bg-yellow-500 text-white p-1 rounded">
                          <Star className="w-3 h-3 fill-current" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 액션 버튼들 */}
                  <div className="flex justify-between items-end">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreviewImage(image.url)}
                        className="h-6 w-6 p-0"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      {!image.isPrimary && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetPrimary(image.id)}
                          className="h-6 w-6 p-0"
                          title="메인 이미지로 설정"
                        >
                          <Star className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveImage(image.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 새 이미지 추가 폼 */}
      <div className="space-y-3 p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
        <h4 className="text-sm font-medium">새 이미지 추가</h4>
        <div className="space-y-3">
          <div>
            <Input
              type="url"
              placeholder="이미지 URL을 입력하세요 (HTTPS만 허용)"
              value={newImageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={`w-full ${urlError ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {urlError && (
              <p className="text-red-500 text-xs mt-1">{urlError}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={newImageType} onValueChange={(value) => setNewImageType(value as AlbumImage['type'])}>
              <SelectTrigger className="w-32" style={{ height: '40px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <SelectItem value="cover">커버</SelectItem>
                <SelectItem value="back">뒷면</SelectItem>
                <SelectItem value="inside">내지</SelectItem>
                <SelectItem value="label">레이블</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="설명 (선택사항)"
              value={newImageDescription}
              onChange={(e) => setNewImageDescription(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button
            onClick={handleAddImage}
            disabled={!newImageUrl.trim() || !!urlError}
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            이미지 추가
          </Button>
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <Image
              src={previewImage}
              alt="이미지 미리보기"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
