import * as React from "react";
import type { Album } from "@/types/album";
import { Star, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useModalAccessibility } from "@/lib/useModalAccessibility";
import { getAllImages } from "@/lib/album-images";
import Image from 'next/image';

interface AlbumDetailModalProps {
  album: Album;
  onClose: () => void;
  onEdit: (album: Album) => void;
  onDelete: (album: Album) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (!value) return null;
  return (
    <div className="flex text-sm">
      <span className="font-semibold w-24 flex-shrink-0">{label}</span>
      <span className="text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  );
};

export function AlbumDetailModal({ 
  album, 
  onClose, 
  onEdit, 
  onDelete, 
  onPrevious, 
  onNext, 
  currentIndex, 
  totalCount 
}: AlbumDetailModalProps) {
  const modalRef = useModalAccessibility(onClose);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  
  const allImages = getAllImages(album);
  const price = album.priceAmount ? `${album.priceAmount.toLocaleString()} ${album.priceCurrency}` : null;

  // 키보드 이벤트 핸들러
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (onPrevious) onPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (onNext) onNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPrevious, onNext, onClose]);

  const nextImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  const currentImage = allImages[currentImageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadein p-4">
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 transform animate-scalein max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="album-title"
      >
        <button
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 앨범 네비게이션 버튼들 - 좌중단/우중단으로 이동 */}
        {onPrevious && (
          <button
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full p-2 shadow-md hover:shadow-lg z-10"
            onClick={onPrevious}
            aria-label="이전 앨범"
            title="이전 앨범 (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {onNext && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full p-2 shadow-md hover:shadow-lg z-10"
            onClick={onNext}
            aria-label="다음 앨범"
            title="다음 앨범 (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-full md:w-48 flex-shrink-0 text-center">
            {/* 메인 이미지 표시 */}
            <div className="relative w-40 h-40 md:w-48 md:h-48 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden mx-auto flex items-center justify-center shadow-inner">
              {currentImage ? (
                <Image 
                  src={currentImage.url} 
                  alt={currentImage.description || album.title} 
                  width={192} 
                  height={192} 
                  style={{ objectFit: 'cover' }} 
                />
              ) : (
                <span className="text-zinc-400 text-sm">No Image</span>
              )}
              
              {/* 이미지 네비게이션 버튼 */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                    aria-label="이전 이미지"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                    aria-label="다음 이미지"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            
            {/* 이미지 정보 표시 */}
            {currentImage && (
              <div className="mt-2 text-xs text-zinc-500">
                <div>{currentImage.description}</div>
                <div>({currentImageIndex + 1} / {allImages.length})</div>
              </div>
            )}
            
            {/* 썸네일 네비게이션 */}
            {allImages.length > 1 && (
              <div className="flex justify-center gap-1 mt-3 flex-wrap">
                {allImages.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-8 h-8 rounded overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex 
                        ? 'border-blue-500' 
                        : 'border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.description || `이미지 ${index + 1}`}
                      width={32}
                      height={32}
                      style={{ objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            )}
            
            {album.isFavorite && (
              <div className="flex items-center justify-center gap-1 mt-3 text-yellow-500">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-semibold">Favorite</span>
              </div>
            )}
          </div>

          <div className="w-full">
            <h2 id="album-title" className="font-bold text-2xl md:text-3xl mb-1">{album.title}</h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4">{album.artist}</p>
            
            <div className="space-y-2 border-t pt-4">
              <DetailItem label="유형" value={album.type} />
              <DetailItem label="형식" value={album.format} />
              <DetailItem label="제조국" value={album.country} />
              <DetailItem label="발매일" value={album.releaseDate} />
              <DetailItem label="스타일" value={album.style} />
              <DetailItem label="레이블" value={album.label} />
              <DetailItem label="카탈로그 넘버" value={album.catalogNo} />
            </div>

            {(album.priceAmount || album.purchaseStore || album.purchaseDate) && (
              <div className="space-y-2 border-t mt-4 pt-4">
                <h3 className="font-semibold text-md mb-2">구입 정보</h3>
                <DetailItem label="가격" value={price} />
                <DetailItem label="구입처" value={album.purchaseStore} />
                <DetailItem label="구매일" value={album.purchaseDate} />
              </div>
            )}

            

            {album.description && (
              <div className="border-t mt-4 pt-4">
                <h3 className="font-semibold text-md mb-2">설명</h3>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{album.description}</p>
              </div>
            )}

            <div className="text-xs text-zinc-400 mt-4 text-right">등록일: {album.createdAt?.slice(0, 10)}</div>
          </div>
        </div>

        <div className="flex gap-2 justify-end w-full mt-6 border-t pt-4 relative">
          {/* 앨범 인덱스 표시 - 하단 중앙으로 이동 */}
          {currentIndex !== undefined && totalCount !== undefined && totalCount > 1 && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
              {currentIndex + 1} / {totalCount}
            </div>
          )}
          <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => onEdit(album)}>수정</button>
          <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => onDelete(album)}>삭제</button>
        </div>
      </div>
    </div>
  );
} 