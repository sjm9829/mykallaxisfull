
import * as React from 'react';
import Image from 'next/image';

export interface DiscogsSearchResult {
  id: number;
  title: string; // 앨범명 (아티스트명 포함될 수 있음)
  artist?: string; // 파싱된 아티스트명
  year: string;
  country: string;
  thumb: string;
  format: string[];
  label: string[];
  catno: string;
}

interface DiscogsSearchModalProps {
  results: DiscogsSearchResult[];
  onSelect: (result: DiscogsSearchResult) => void;
  onClose: () => void;
  isLoading: boolean;
  error: string | null;
}

export function DiscogsSearchModal({ results, onSelect, onClose, isLoading, error }: DiscogsSearchModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  // 키보드 이벤트 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      
      // Tab 키 트랩핑
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadein p-4">
      <div className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-xl p-6 w-full max-w-2xl border border-zinc-200 dark:border-zinc-700 max-h-[80vh] flex flex-col" ref={modalRef}>
        <h2 className="text-xl font-bold mb-4">Discogs 검색 결과</h2>
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">&times;</button>
        
        <div className="overflow-y-auto">
          {isLoading ? (
            <p>검색 중...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : results.length === 0 ? (
            <p>검색 결과가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((result) => {
                const [artist, albumTitle] = result.title.includes(' - ') ? result.title.split(' - ', 2) : ['', result.title];
                const displayArtist = result.artist || artist; // artist 필드가 있으면 사용, 없으면 title에서 파싱
                const displayLabel = result.label?.[0] || ''; // 첫 번째 레이블만 표시

                return (
                  <li key={result.id} onClick={() => onSelect(result)} className="flex items-center gap-4 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer">
                    <Image src={result.thumb || '/file.svg'} alt={result.title} width={64} height={64} style={{ objectFit: 'cover' }} className="rounded-sm bg-zinc-200" />
                    <div className="flex-grow">
                      <p className="font-bold">{albumTitle || result.title}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{displayArtist}</p>
                      <p className="text-xs text-zinc-500">{(result.year || '미상')} - {result.country}</p>
                      <p className="text-xs text-zinc-500">{result.format?.join(', ')}</p>
                      <p className="text-xs text-zinc-500">{displayLabel} - {result.catno}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
