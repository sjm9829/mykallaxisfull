import * as React from "react";
import type { Album } from "@/types/album";
import { Star, Trash2 } from "lucide-react";
import Image from 'next/image';

interface AlbumCardProps {
  album: Album;
  onClick?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function AlbumCard({ album, onClick, onDelete }: AlbumCardProps) {
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
      <div className="w-32 h-32 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden flex items-center justify-center">
        {album.coverImageUrl ? (
          <Image
            src={album.coverImageUrl}
            alt={album.title}
            width={128}
            height={128}
            style={{ objectFit: 'cover' }}
        />
        ) : (
          <span className="text-zinc-400">No Image</span>
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