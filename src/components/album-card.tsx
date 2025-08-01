import * as React from "react";
import type { Album } from "@/types/album";
import { Star, Trash2 } from "lucide-react";
import Image from 'next/image';
import { getPrimaryCoverImage } from "@/lib/album-images";

interface AlbumCardProps {
  album: Album;
  onClick?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function AlbumCard({ album, onClick, onDelete }: AlbumCardProps) {
  const primaryImageUrl = getPrimaryCoverImage(album);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <div
      className="relative bg-white dark:bg-zinc-900 rounded-lg shadow p-4 flex flex-col items-center gap-2 border border-zinc-200 dark:border-zinc-800 cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 hover:opacity-95 min-h-[200px]"
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${album.title} 상세 보기`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
    >
      <button
        className="absolute top-2 left-2 text-zinc-400 hover:text-red-500 z-10 bg-white/80 dark:bg-zinc-900/80 rounded-full p-1"
        onClick={e => { e.stopPropagation(); onDelete?.(); }}
        aria-label="앨범 삭제"
        tabIndex={0}
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <div className="w-32 h-32 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden flex items-center justify-center relative">
        {primaryImageUrl && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
            )}
            <Image
              src={primaryImageUrl}
              alt={album.title}
              width={128}
              height={128}
              className={`transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ objectFit: 'cover' }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rq5xDGuJ4O2yl+odzqd2qjvz/2Q=="
            />
          </>
        ) : (
          <span className="text-zinc-400 text-sm">No Image</span>
        )}
      </div>

      <div className="flex flex-col items-center w-full">
        <span className="font-semibold text-base w-full text-center truncate" title={album.title}>{album.title}</span>
        <span className="text-sm text-zinc-500 w-full text-center truncate" title={album.artist}>{album.artist}</span>
        {album.releaseDate && (
          <span className="text-xs text-zinc-400">{album.releaseDate}</span>
        )}
      </div>
      {album.isFavorite && (
        <Star className="absolute top-2 right-2 text-yellow-400 fill-yellow-400 w-5 h-5" />
      )}
    </div>
  );
}
