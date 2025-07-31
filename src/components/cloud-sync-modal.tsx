import * as React from 'react';
import { Album } from '@/types/album';
import { useModalAccessibility } from '@/lib/useModalAccessibility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Cloud, Upload, Download, Copy } from 'lucide-react';
import { createGist, loadFromGist, isValidGistUrl } from '@/services/gist';
import { toast } from 'sonner';

interface CloudSyncModalProps {
  albums: Album[];
  onClose: () => void;
  onLoadAlbums: (albums: Album[]) => void;
  collectionName: string;
}

export function CloudSyncModal({
  albums,
  onClose,
  onLoadAlbums,
  collectionName,
}: CloudSyncModalProps) {
  const modalRef = useModalAccessibility(onClose);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [cloudUrl, setCloudUrl] = React.useState<string>('');
  const [inputUrl, setInputUrl] = React.useState<string>('');

  const handleUpload = async () => {
    if (albums.length === 0) {
      toast.error('저장할 앨범이 없습니다.');
      return;
    }

    setIsUploading(true);
    try {
      const username = 'Anonymous';
      const result = await createGist(albums, username, collectionName);
      setCloudUrl(result.html_url);
      toast.success('URL이 생성되었습니다!');
    } catch (error) {
      console.error('URL 생성 오류:', error);
      toast.error('URL 생성에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!inputUrl.trim()) {
      toast.error('URL을 입력해주세요.');
      return;
    }

    if (!isValidGistUrl(inputUrl.trim())) {
      toast.error('올바른 URL을 입력해주세요.');
      return;
    }

    setIsDownloading(true);
    try {
      const data = await loadFromGist(inputUrl.trim());
      onLoadAlbums(data.albums);
      toast.success(`${data._metadata.collectionName} 컬렉션을 불러왔습니다! (${data.albums.length}개 앨범)`);
      onClose();
    } catch (error) {
      console.error('URL 로드 오류:', error);
      toast.error('URL을 불러오는데 실패했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(cloudUrl);
    toast.success('URL이 클립보드에 복사되었습니다!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadein p-4">
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 transform animate-scalein"
        ref={modalRef}
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          URL 공유
        </h2>
        
        <button
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          {/* 업로드 섹션 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              URL 생성
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              현재 컬렉션({albums.length}개 앨범) URL을 생성합니다.
            </p>
            
            {!cloudUrl ? (
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || albums.length === 0}
                className="w-full flex items-center gap-2"
              >
                <Cloud className="w-4 h-4" />
                {isUploading ? "생성 중..." : "URL 생성"}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <input
                    type="text"
                    value={cloudUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyUrl}
                    className="flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    복사
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  이 URL을 저장해두세요. 다른 기기에서 컬렉션을 불러올 수 있습니다.
                </p>
              </div>
            )}
          </div>

          {/* 다운로드 섹션 */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              URL 불러오기
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              URL을 입력하여 컬렉션을 불러옵니다.
            </p>
            
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="URL을 입력하세요..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full"
              />
              <Button 
                onClick={handleDownload} 
                disabled={isDownloading || !inputUrl.trim()}
                className="w-full flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? "불러오는 중..." : "컬렉션 불러오기"}
              </Button>
            </div>
            
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ 현재 컬렉션이 불러온 데이터로 완전히 교체됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
