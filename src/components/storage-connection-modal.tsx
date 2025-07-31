import * as React from 'react';
import { StorageProvider } from '@/types/storage';
import { storageManager } from '@/lib/storage-manager';
import { Cloud, HardDrive, Loader2, X, Info } from 'lucide-react';

interface StorageConnectionModalProps {
  onClose: () => void;
  onConnectionSelected: (provider: StorageProvider) => void;
}

export function StorageConnectionModal({ onClose, onConnectionSelected }: StorageConnectionModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [connectingProvider, setConnectingProvider] = React.useState<StorageProvider | null>(null);

  // 키보드 이벤트 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConnecting) {
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

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isConnecting]);

  // 오버레이 클릭 처리
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isConnecting) {
      onClose();
    }
  };

  const handleProviderSelect = async (provider: StorageProvider) => {
    if (provider === 'local') {
      onConnectionSelected(provider);
      return;
    }

    try {
      setIsConnecting(true);
      setConnectingProvider(provider);
      
      await storageManager.connectToProvider(provider);
      onConnectionSelected(provider);
    } catch (error) {
      console.error(`Failed to connect to ${provider}:`, error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert(`${storageManager.getProviderDisplayName(provider)} 연결 실패:\n\n${errorMessage}`);
    } finally {
      setIsConnecting(false);
      setConnectingProvider(null);
    }
  };

  const handleShowSetupGuide = () => {
    const guideMessage = `클라우드 스토리지 연동 설정 방법:

🔹 Dropbox 설정:
1. https://www.dropbox.com/developers/apps 방문
2. "Create app" 클릭
3. "Scoped access" 선택
4. "App folder" 또는 "Full Dropbox" 선택  
5. 앱 이름 입력
6. App key를 복사하여 NEXT_PUBLIC_DROPBOX_CLIENT_ID에 설정
7. App secret을 복사하여 DROPBOX_CLIENT_SECRET에 설정
8. OAuth2 redirect URL에 다음 추가:
   http://localhost:3000/auth/dropbox/callback

🔹 Google Drive 설정:
1. https://console.developers.google.com 방문
2. 새 프로젝트 생성 또는 선택
3. "APIs & Services" > "Library" 에서 Google Drive API 활성화
4. "Credentials" > "Create Credentials" > "OAuth 2.0 Client IDs"
5. 애플리케이션 유형을 "Web application" 선택
6. 승인된 JavaScript 원본에 http://localhost:3000 추가
7. 클라이언트 ID를 NEXT_PUBLIC_GOOGLE_CLIENT_ID에 설정
8. API 키도 생성하여 NEXT_PUBLIC_GOOGLE_API_KEY에 설정

.env.local 파일에 환경 변수를 설정한 후 개발 서버를 재시작하세요.`;
    
    alert(guideMessage);
  };

  const providers: Array<{
    id: StorageProvider;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: 'local',
      name: '로컬 파일',
      description: '컴퓨터의 파일을 직접 불러오거나 저장합니다',
      icon: <HardDrive className="h-8 w-8" />,
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      description: 'Dropbox 클라우드 스토리지와 연동합니다',
      icon: <Cloud className="h-8 w-8" />,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'googledrive',
      name: 'Google Drive',
      description: 'Google Drive 클라우드 스토리지와 연동합니다',
      icon: <Cloud className="h-8 w-8" />,
      color: 'bg-green-500 hover:bg-green-600'
    }
  ];

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
        aria-labelledby="storage-connection-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 pb-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 id="storage-connection-title" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              파일 연동 방식 선택
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={isConnecting}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="닫기"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            컬렉션 파일을 저장하고 불러올 방식을 선택해주세요.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid gap-4">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id)}
                disabled={isConnecting}
                className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className={`p-3 rounded-lg text-white ${provider.color} transition-colors`}>
                  {isConnecting && connectingProvider === provider.id ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    provider.icon
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {provider.name}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {provider.description}
                  </p>
                  {isConnecting && connectingProvider === provider.id && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      연결 중...
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Loading overlay */}
        {isConnecting && (
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center rounded-xl backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div className="text-center">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {storageManager.getProviderDisplayName(connectingProvider!)}에 연결 중...
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  새 창에서 인증을 완료해주세요
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
