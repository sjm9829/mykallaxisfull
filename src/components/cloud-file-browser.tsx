import * as React from 'react';
import { CloudFile, StorageProvider } from '@/types/storage';
import { storageManager } from '@/lib/storage-manager';
import { FileText, Loader2, X, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CloudFileBrowserProps {
  provider: StorageProvider;
  onFileSelected: (file: CloudFile) => void;
  onCreateNew: (file: CloudFile) => void;
  onClose: () => void;
  mode: 'open' | 'create';
}

export function CloudFileBrowser({ provider, onFileSelected, onCreateNew, onClose, mode }: CloudFileBrowserProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [files, setFiles] = React.useState<CloudFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [newFileName, setNewFileName] = React.useState('');

  // 파일 목록 로드
  React.useEffect(() => {
    loadFiles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const service = storageManager.getService(provider);
      if (!service) {
        throw new Error(`${provider} 서비스를 찾을 수 없습니다.`);
      }
      
      // 저장된 연결 정보로 토큰 설정
      const connection = storageManager.getActiveConnection();
      if (!connection) {
        throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
      }
      
      console.log('🔍 Setting token for service:', provider, connection.accessToken ? 'Token exists' : 'No token');
      
      // 서비스에 토큰 설정
      if (provider === 'dropbox') {
        (service as { accessToken?: string }).accessToken = connection.accessToken;
      } else if (provider === 'googledrive') {
        (service as { accessToken?: string }).accessToken = connection.accessToken;
      }
      
      const cloudFiles = await service.listFiles('');
      setFiles(cloudFiles);
    } catch (error) {
      console.error('파일 목록 로드 실패:', error);
      alert(`파일 목록을 불러오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      alert('파일명을 입력해주세요.');
      return;
    }

    const fileName = newFileName.endsWith('.json') ? newFileName : `${newFileName}.json`;
    
    try {
      const service = storageManager.getService(provider);
      if (!service) throw new Error('서비스를 찾을 수 없습니다.');

      // URL 파라미터나 localStorage에서 username 가져오기
      const urlParams = new URLSearchParams(window.location.search);
      const currentUsername = urlParams.get('username') || localStorage.getItem('currentUsername') || 'user';

      // 빈 컬렉션 생성
      const emptyCollection = {
        _metadata: {
          username: currentUsername,
          collectionName: fileName.replace('.json', ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        albums: []
      };

      const newFile = await service.createFile(fileName, JSON.stringify(emptyCollection, null, 2), '');
      console.log('Created new file:', newFile);
      onCreateNew(newFile);
      onClose();
    } catch (error) {
      console.error('파일 생성 실패:', error);
      alert(`파일 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 키보드 이벤트 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 오버레이 클릭 처리
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 pb-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {mode === 'open' ? '컬렉션 파일 열기' : '새 컬렉션 만들기'} - {storageManager.getProviderDisplayName(provider)}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadFiles}
                disabled={isLoading}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
                title="새로고침"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                aria-label="닫기"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* 새 파일 생성 */}
          {mode === 'create' && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                새 컬렉션 만들기
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="컬렉션 이름을 입력하세요"
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFile();
                    }
                  }}
                />
                <Button onClick={handleCreateFile} disabled={!newFileName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  생성
                </Button>
              </div>
            </div>
          )}

          {/* 파일 목록 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-zinc-600 dark:text-zinc-400">파일 목록을 불러오는 중...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400">컬렉션 파일이 없습니다.</p>
              {mode === 'create' && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                  위에서 새 컬렉션을 만들어보세요.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onFileSelected(file)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left"
                >
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {file.name}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(file.modifiedAt).toLocaleDateString('ko-KR')} • {Math.round(file.size / 1024)}KB
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
