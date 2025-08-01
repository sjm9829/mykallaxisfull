import * as React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Album } from '@/types/album';
import { getPrimaryCoverImage } from '@/lib/album-images';
import { Button } from '@/components/ui/button';
import { X, Download, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { exportAlbumsAsImage } from '@/lib/image-export';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { modalManager } from '@/lib/modal-manager';

interface ShareCollectionModalProps {
  albums: Album[];
  onClose: () => void;
  fileName: string;
}

interface DraggableAlbumProps {
  album: Album;
  index: number;
  moveAlbum: (dragIndex: number, hoverIndex: number) => void;
}

const ItemTypes = {
  ALBUM: 'album',
};

const DraggableAlbum: React.FC<DraggableAlbumProps> = ({ album, index, moveAlbum }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const primaryImageUrl = getPrimaryCoverImage(album);
  
  const [{ handlerId }, drop] = useDrop<{ id: string, index: number }, unknown, { handlerId: string | symbol | null | undefined }>({
    accept: ItemTypes.ALBUM,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveAlbum(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations, but it's good here for the sake of performance
      // to avoid re-renderings
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ALBUM,
    item: { id: album.id, index: index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity }}
      className={`relative w-full h-full aspect-square ${isDragging ? 'opacity-50' : ''}`}
      data-handler-id={handlerId}
    >
      <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden border border-dashed border-zinc-300 dark:border-zinc-700">
        {primaryImageUrl ? (
          <Image
            src={primaryImageUrl}
            alt={album.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-zinc-400 text-sm">No Image</span>
        )}
      </div>
    </div>
  );
};

export function ShareCollectionModal({
  albums: initialAlbums,
  onClose,
  fileName,
}: ShareCollectionModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [albums, setAlbums] = React.useState<Album[]>(initialAlbums);
  const [gridSize, setGridSize] = React.useState<string>('5'); // 그리드 크기 상태 추가, 기본값 5x5
  const [isExporting, setIsExporting] = React.useState(false); // 내보내기 로딩 상태
  
  const modalId = React.useMemo(() => `share-collection-${Date.now()}`, []);

  // modalManager 등록
  React.useEffect(() => {
    modalManager.pushModal(modalId, () => {
      if (!isExporting) {
        onClose();
      }
    });

    return () => {
      modalManager.popModal(modalId);
    };
  }, [modalId, onClose, isExporting]);

  // Tab 키 트랩핑만 처리 (ESC는 modalManager가 처리)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const moveAlbum = React.useCallback((dragIndex: number, hoverIndex: number) => {
    setAlbums((prevAlbums: Album[]) => {
      const newAlbums = [...prevAlbums];
      const [draggedAlbum] = newAlbums.splice(dragIndex, 1);
      newAlbums.splice(hoverIndex, 0, draggedAlbum);
      return newAlbums;
    });
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportAlbumsAsImage(albums, `${fileName.replace(".json", "")}-topster.png`, parseInt(gridSize));
      onClose(); // 내보내기 후 모달 닫기
    } catch (error) {
      console.error('이미지 내보내기 실패:', error);
      alert('이미지 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const gridColsClass = `grid-cols-${gridSize}`; // 동적 그리드 클래스

  // 오버레이 클릭 처리 (로딩 중에는 비활성화)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isExporting) {
      onClose();
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadein p-4"
        onClick={handleOverlayClick}
      >
        <div
          className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-4xl border border-zinc-200 dark:border-zinc-800 transform animate-scalein max-h-[90vh] flex flex-col"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold mb-4">탑스터 공유</h2>
          <button
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={isExporting}
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 그리드 크기 선택 UI */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium">열 개수:</span>
            <Select key={gridSize} value={gridSize} onValueChange={setGridSize} disabled={isExporting}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-800">
                <SelectItem value="3">3열</SelectItem>
                <SelectItem value="4">4열</SelectItem>
                <SelectItem value="5">5열</SelectItem>
                <SelectItem value="6">6열</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={`bordered-grid flex-grow overflow-y-auto p-4 rounded-md grid ${gridColsClass} gap-4`}>
            {albums.length > 0 ? (
              albums.map((album, index) => (
                <DraggableAlbum key={album.id} album={album} index={index} moveAlbum={moveAlbum} />
              ))
            ) : (
              <p className="col-span-full text-center text-zinc-500">표시할 앨범이 없습니다.</p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleExport} 
              disabled={isExporting || albums.length === 0}
              className="min-w-[140px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  내보내는 중...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  이미지로 내보내기
                </>
              )}
            </Button>
          </div>

          {/* 로딩 오버레이 */}
          {isExporting && (
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center rounded-xl backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <div className="text-center">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">이미지를 생성하고 있습니다</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    앨범이 많을수록 시간이 더 걸릴 수 있습니다
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}