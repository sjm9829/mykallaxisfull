import * as React from "react";
import type { Album } from "@/types/album";
import { AlbumCard } from "@/components/album-card";

interface AlbumGridProps {
  albums: Album[];
  onAlbumClick?: (album: Album) => void;
  onEditAlbum?: (album: Album) => void;
  onDeleteAlbum?: (album: Album) => void;
}

export function AlbumGrid({ albums, onAlbumClick, onEditAlbum, onDeleteAlbum }: AlbumGridProps) {
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