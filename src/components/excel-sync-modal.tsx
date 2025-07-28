import * as React from 'react';
import { Album } from '@/types/album';
import { useModalAccessibility } from '@/lib/useModalAccessibility';
import { Button } from '@/components/ui/button';
import { X, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { exportToExcel, importFromExcel } from '@/services/excel';
import { toast } from 'sonner';

interface ExcelSyncModalProps {
  albums: Album[];
  onClose: () => void;
  onLoadAlbums: (albums: Album[]) => void;
  collectionName: string;
}

export function ExcelSyncModal({
  albums,
  onClose,
  onLoadAlbums,
  collectionName,
}: ExcelSyncModalProps) {
  const modalRef = useModalAccessibility(onClose);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (albums.length === 0) {
      toast.error('내보낼 앨범이 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const blob = exportToExcel(albums);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collectionName.replace('.json', '')}-collection.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('컬렉션이 Excel 파일로 내보내졌습니다!');
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      toast.error('Excel 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedAlbums = await importFromExcel(file);
      
      // ID와 타임스탬프 추가
      const albumsWithIds = importedAlbums.map(album => ({
        ...album,
        id: (Math.random() + Date.now()).toString(),
        createdAt: album.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        artist: album.artist || '',
        title: album.title || '',
        type: album.type || 'Other' as const,
      })) as Album[];

      onLoadAlbums(albumsWithIds);
      toast.success(`${importedAlbums.length}개의 앨범을 불러왔습니다!`);
      onClose();
    } catch (error) {
      console.error('Excel 가져오기 오류:', error);
      toast.error('Excel 파일을 가져오는데 실패했습니다.');
    } finally {
      setIsImporting(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadein p-4">
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 transform animate-scalein"
        ref={modalRef}
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          엑셀 동기화
        </h2>
        
        <button
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          {/* 내보내기 섹션 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              컬렉션 내보내기
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              현재 컬렉션({albums.length}개 앨범)을 Excel 파일로 저장합니다.
            </p>
            
            <Button 
              onClick={handleExport} 
              disabled={isExporting || albums.length === 0}
              className="w-full flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExporting ? "내보내는 중..." : "Excel로 내보내기"}
            </Button>
          </div>

          {/* 가져오기 섹션 */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              컬렉션 가져오기
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Excel 파일에서 앨범 컬렉션을 불러옵니다.
            </p>
            
            <Button 
              onClick={handleImportClick} 
              disabled={isImporting}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? "가져오는 중..." : "Excel 파일 선택"}
            </Button>
            
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ 현재 컬렉션이 가져온 데이터로 완전히 교체됩니다.
            </p>
          </div>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
