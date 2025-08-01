import * as React from "react";
import type { Album } from "@/types/album";
import { AlbumCard } from "@/components/album-card";

interface VirtualizedAlbumGridProps {
  albums: Album[];
  onAlbumClick?: (album: Album) => void;
  onEditAlbum?: (album: Album) => void;
  onDeleteAlbum?: (album: Album) => void;
  itemsPerPage?: number;
}

/**
 * 대용량 앨범 컬렉션을 위한 가상화된 그리드 컴포넌트
 * 한 번에 일정 수의 앨범만 렌더링하여 성능을 최적화
 */
export function VirtualizedAlbumGrid({
  albums,
  onAlbumClick,
  onEditAlbum,
  onDeleteAlbum,
  itemsPerPage = 50 // 한 번에 50개씩 렌더링
}: VirtualizedAlbumGridProps) {
  const [loadedPages, setLoadedPages] = React.useState<Set<number>>(new Set([0]));
  const containerRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef<HTMLDivElement>(null);

  // 현재까지 로드된 앨범들
  const totalPages = Math.ceil(albums.length / itemsPerPage);
  const maxLoadedPage = Math.max(...Array.from(loadedPages));
  const visibleAlbums = albums.slice(0, (maxLoadedPage + 1) * itemsPerPage);

  // Intersection Observer를 사용한 무한 스크롤
  React.useEffect(() => {
    if (!loadingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && maxLoadedPage < totalPages - 1) {
          const nextPage = maxLoadedPage + 1;
          setLoadedPages(prev => new Set([...prev, nextPage]));
        }
      },
      {
        root: null,
        rootMargin: '100px', // 100px 전에 미리 로드
        threshold: 0.1,
      }
    );

    observer.observe(loadingRef.current);

    return () => {
      observer.disconnect();
    };
  }, [maxLoadedPage, totalPages]);

  // 스크롤 위치 복원
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 스크롤 위치를 sessionStorage에 저장
      sessionStorage.setItem('albumGridScrollTop', container.scrollTop.toString());
    };

    container.addEventListener('scroll', handleScroll);

    // 컴포넌트 마운트 시 스크롤 위치 복원
    const savedScrollTop = sessionStorage.getItem('albumGridScrollTop');
    if (savedScrollTop) {
      container.scrollTop = parseInt(savedScrollTop, 10);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (albums.length === 0) {
    return <div className="text-zinc-400 text-center py-8">등록된 앨범이 없습니다.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[80vh] overflow-y-auto"
    >
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 w-full">
        {visibleAlbums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            onClick={() => onAlbumClick?.(album)}
            onDelete={() => onDeleteAlbum?.(album)}
            onEdit={() => onEditAlbum?.(album)}
          />
        ))}
      </div>

      {/* 로딩 트리거 및 상태 표시 */}
      {maxLoadedPage < totalPages - 1 && (
        <div
          ref={loadingRef}
          className="flex justify-center items-center py-8"
        >
          <div className="text-zinc-500 text-sm">
            더 많은 앨범 로딩 중... ({visibleAlbums.length}/{albums.length})
          </div>
        </div>
      )}

      {/* 모든 앨범이 로드된 경우 */}
      {maxLoadedPage >= totalPages - 1 && albums.length > itemsPerPage && (
        <div className="text-center py-4 text-zinc-500 text-sm">
          총 {albums.length}개의 앨범을 모두 표시했습니다.
        </div>
      )}
    </div>
  );
}

/**
 * 기존 AlbumGrid와의 호환성을 위한 래퍼 컴포넌트
 */
export function AlbumGrid({ albums, onAlbumClick, onEditAlbum, onDeleteAlbum }: VirtualizedAlbumGridProps) {
  // 앨범 수가 적으면 기존 방식, 많으면 가상화 사용
  const shouldUseVirtualization = albums.length > 100;

  if (!shouldUseVirtualization) {
    // 기존 방식 (100개 이하)
    if (albums.length === 0) {
      return <div className="text-zinc-400 text-center py-8">등록된 앨범이 없습니다.</div>;
    }

    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 w-full">
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            onClick={() => onAlbumClick?.(album)}
            onDelete={() => onDeleteAlbum?.(album)}
            onEdit={() => onEditAlbum?.(album)}
          />
        ))}
      </div>
    );
  }

  // 가상화 방식 (100개 초과)
  return (
    <VirtualizedAlbumGrid
      albums={albums}
      onAlbumClick={onAlbumClick}
      onEditAlbum={onEditAlbum}
      onDeleteAlbum={onDeleteAlbum}
    />
  );
}
