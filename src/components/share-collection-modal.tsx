import * as React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Album } from '@/types/album';
import { useModalAccessibility } from '@/lib/useModalAccessibility';
import { getPrimaryCoverImage } from '@/lib/album-images';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Image from 'next/image';
import { exportAlbumsAsImage } from '@/lib/image-export';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const modalRef = useModalAccessibility(onClose);
  const [albums, setAlbums] = React.useState<Album[]>(initialAlbums);
  const [gridSize, setGridSize] = React.useState<string>('5'); // 그리드 크기 상태 추가, 기본값 5x5

  const moveAlbum = React.useCallback((dragIndex: number, hoverIndex: number) => {
    setAlbums((prevAlbums: Album[]) => {
      const newAlbums = [...prevAlbums];
      const [draggedAlbum] = newAlbums.splice(dragIndex, 1);
      newAlbums.splice(hoverIndex, 0, draggedAlbum);
      return newAlbums;
    });
  }, []);

  const handleExport = async () => {
    // 현재는 모든 앨범을 내보내지만, 나중에는 모달 내에서 편집된 앨범 목록을 사용
    await exportAlbumsAsImage(albums, `${fileName.replace(".json", "")}-topster.png`, parseInt(gridSize));
    onClose(); // 내보내기 후 모달 닫기
  };

  const gridColsClass = `grid-cols-${gridSize}`; // 동적 그리드 클래스

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadein p-4">
        <div
          className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-4xl border border-zinc-200 dark:border-zinc-800 transform animate-scalein max-h-[90vh] flex flex-col"
          ref={modalRef}
        >
          <h2 className="text-2xl font-bold mb-4">탑스터 공유</h2>
          <button
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 그리드 크기 선택 UI */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium">열 개수:</span>
            <Select key={gridSize} value={gridSize} onValueChange={setGridSize}>
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
            <Button onClick={handleExport}>이미지로 내보내기</Button>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}