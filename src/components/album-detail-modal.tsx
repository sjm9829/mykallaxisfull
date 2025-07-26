import * as React from "react";
import type { Album } from "@/types/album";
import { Star, X } from "lucide-react";
import { useModalAccessibility } from "@/lib/useModalAccessibility";
import Image from 'next/image';

interface AlbumDetailModalProps {
  album: Album;
  onClose: () => void;
  onEdit: (album: Album) => void;
  onDelete: (album: Album) => void;
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

export function AlbumDetailModal({ album, onClose, onEdit, onDelete }: AlbumDetailModalProps) {
  const modalRef = useModalAccessibility(onClose);

  const price = album.priceAmount ? `${album.priceAmount.toLocaleString()} ${album.priceCurrency}` : null;

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

        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-full md:w-48 flex-shrink-0 text-center">
            <div className="w-40 h-40 md:w-48 md:h-48 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden mx-auto flex items-center justify-center shadow-inner">
              {album.coverImageUrl ? (
                <Image src={album.coverImageUrl} alt={album.title} width={192} height={192} style={{ objectFit: 'cover' }} />
              ) : (
                <span className="text-zinc-400 text-sm">No Image</span>
              )}
            </div>
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

        <div className="flex gap-2 justify-end w-full mt-6 border-t pt-4">
          <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => onEdit(album)}>수정</button>
          <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => onDelete(album)}>삭제</button>
        </div>
      </div>
    </div>
  );
} 