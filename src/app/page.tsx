"use client";

import { useRouter } from 'next/navigation';
import { setCollectionMetadata, getLastOpenedCollection, setLastOpenedCollection, setActiveFileHandle } from '@/lib/db';
import { useState, useEffect } from 'react';
import { CreateCollectionModal } from '@/components/create-collection-modal';
import { StorageConnectionModal } from '@/components/storage-connection-modal';
import { CloudFileBrowser } from '@/components/cloud-file-browser';
import { StorageProvider, CloudFile } from '@/types/storage';
import { storageManager } from '@/lib/storage-manager';
import { setActiveCloudFile } from '@/lib/cloud-storage';

export default function LandingPage() {
  const router = useRouter();
  const [lastOpenedCollection, setLastOpenedCollectionState] = useState<{ username: string; collectionName: string; } | null>(null);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showCloudBrowser, setShowCloudBrowser] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'create' | 'open' | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<StorageProvider | null>(null);

  useEffect(() => {
    const checkLastCollection = async () => {
      const storedLastCollection = await getLastOpenedCollection();
      if (storedLastCollection) {
        setLastOpenedCollectionState(storedLastCollection);
        // username이 없으면 기본값 설정
        if (!localStorage.getItem('currentUsername')) {
          localStorage.setItem('currentUsername', storedLastCollection.username || 'user');
        }
      } else {
        // username이 없으면 기본값 설정
        if (!localStorage.getItem('currentUsername')) {
          localStorage.setItem('currentUsername', 'user');
        }
      }
    };
    checkLastCollection();
  }, []);

  const handleCreateCollectionClick = () => {
    setSelectedAction('create');
    setShowStorageModal(true);
  };

  const handleOpenCollectionClick = () => {
    setSelectedAction('open');
    setShowStorageModal(true);
  };

  const handleStorageProviderSelected = async (provider: StorageProvider) => {
    setShowStorageModal(false);
    
    if (provider === 'local') {
      // 기존 로컬 파일 방식 사용
      if (selectedAction === 'create') {
        setShowCreateCollectionModal(true);
      } else if (selectedAction === 'open') {
        await handleOpenLocalFile();
      }
    } else {
      // 클라우드 서비스 방식
      setSelectedProvider(provider);
      setShowCloudBrowser(true);
    }
  };

  const handleCloudFileSelected = async (file: CloudFile) => {
    if (!selectedProvider) return;
    
    try {
      const service = storageManager.getService(selectedProvider);
      if (!service) throw new Error('서비스를 찾을 수 없습니다.');

      // 파일 내용 가져오기
      const fileContent = await service.getFile(file.id);
      const parsedContent = JSON.parse(fileContent);
      
      // 메타데이터 추출
      const fileUsername = parsedContent._metadata?.username || localStorage.getItem('currentUsername') || 'user';
      const fileCollectionName = parsedContent._metadata?.collectionName || file.name.replace('.json', '');
      const albumCount = parsedContent.albums?.length || 0;

      console.log('🔍 File metadata:', { 
        fileUsername, 
        fileCollectionName, 
        albumCount,
        metadata: parsedContent._metadata,
        rawMetadata: JSON.stringify(parsedContent._metadata, null, 2)
      });

      // 클라우드 파일 선택 시 로컬 파일 핸들 정리
      localStorage.removeItem('active-file-handle');
      // IndexedDB에서도 활성 파일 핸들 제거 (Promise로 완료 대기)
      await new Promise<void>((resolve) => {
        try {
          const request = indexedDB.open('FileSystemHandles', 1);
          request.onsuccess = () => {
            const db = request.result;
            if (db.objectStoreNames.contains('handles')) {
              const transaction = db.transaction(['handles'], 'readwrite');
              const store = transaction.objectStore('handles');
              const clearRequest = store.clear();
              clearRequest.onsuccess = () => {
                console.log('🧹 IndexedDB file handles cleared');
                resolve();
              };
              clearRequest.onerror = () => {
                console.warn('Failed to clear IndexedDB file handles');
                resolve();
              };
            } else {
              resolve();
            }
          };
          request.onerror = () => {
            console.warn('Failed to open IndexedDB');
            resolve();
          };
        } catch (error) {
          console.warn('Failed to clear IndexedDB file handles:', error);
          resolve();
        }
      });

      // 컬렉션 메타데이터 저장
      await setCollectionMetadata(fileUsername, fileCollectionName, albumCount);
      await setLastOpenedCollection(fileUsername, fileCollectionName);
      
      // 클라우드 파일 정보 저장 (나중에 저장할 때 사용)
      localStorage.setItem('active-cloud-file', JSON.stringify({
        provider: selectedProvider,
        fileId: file.id,
        fileName: file.name
      }));

      setShowCloudBrowser(false);
      router.push(`/collection?username=${encodeURIComponent(fileUsername)}&collectionName=${encodeURIComponent(fileCollectionName)}`);
    } catch (error) {
      console.error('클라우드 파일 열기 실패:', error);
      alert(`파일을 여는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const handleCloudFileCreated = async (file: CloudFile) => {
    if (!selectedProvider) return;

    const collectionName = file.name.replace('.json', '');
    
    // URL 파라미터나 localStorage에서 username 가져오기
    const searchParams = new URLSearchParams(window.location.search);
    const currentUsername = searchParams.get('username') || localStorage.getItem('currentUsername') || 'user';
    
    // 클라우드 파일 생성 시 로컬 파일 핸들 정리
    localStorage.removeItem('active-file-handle');
    // IndexedDB에서도 활성 파일 핸들 제거 (Promise로 완료 대기)
    await new Promise<void>((resolve) => {
      try {
        const request = indexedDB.open('FileSystemHandles', 1);
        request.onsuccess = () => {
          const db = request.result;
          if (db.objectStoreNames.contains('handles')) {
            const transaction = db.transaction(['handles'], 'readwrite');
            const store = transaction.objectStore('handles');
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => {
              console.log('🧹 IndexedDB file handles cleared');
              resolve();
            };
            clearRequest.onerror = () => {
              console.warn('Failed to clear IndexedDB file handles');
              resolve();
            };
          } else {
            resolve();
          }
        };
        request.onerror = () => {
          console.warn('Failed to open IndexedDB');
          resolve();
        };
      } catch (error) {
        console.warn('Failed to clear IndexedDB file handles:', error);
        resolve();
      }
    });
    
    // 새 컬렉션 생성 시에도 메타데이터 저장
    await setCollectionMetadata(currentUsername, collectionName, 0);
    await setLastOpenedCollection(currentUsername, collectionName);
    
    // 실제 클라우드 파일 정보 저장
    localStorage.setItem('active-cloud-file', JSON.stringify({
      provider: selectedProvider,
      fileId: file.id, // 실제 파일 ID 사용
      fileName: file.name
    }));

    setShowCloudBrowser(false);
    router.push(`/collection?username=${encodeURIComponent(currentUsername)}&collectionName=${encodeURIComponent(collectionName)}`);
  };

      const handleOpenLocalFile = async () => {
        try {
          if ('showOpenFilePicker' in window) {
            const [fileHandle] = await (window as unknown as { 
              showOpenFilePicker: (options?: { types?: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<FileSystemFileHandle[]> 
            }).showOpenFilePicker({
              types: [{
                description: 'JSON files',
                accept: {
                  'application/json': ['.json'],
                },
              }],
            });
            
            // 로컬 파일 선택 시 클라우드 상태 정리
            setActiveCloudFile(null);
            localStorage.removeItem('active-cloud-file');
            console.log('🧹 Local file selected, clearing cloud state');
            
            const file = await fileHandle.getFile();
            const content = await file.text();
            // 파일 유효성 검사
            JSON.parse(content);
            
            // 파일 핸들을 IndexedDB에 저장
            await setActiveFileHandle(fileHandle);
            
            // localStorage에도 기본 정보 저장
            localStorage.setItem('active-file-handle', JSON.stringify({
              name: fileHandle.name,
              // 실제 핸들은 직렬화할 수 없으므로 별도 관리
            }));
            
            // 컬렉션 페이지로 이동
            const searchParams = new URLSearchParams(window.location.search);
            const currentUsername = searchParams.get('username') || localStorage.getItem('currentUsername') || 'user';
            const collectionName = fileHandle.name.replace('.json', '');
            
            await setLastOpenedCollection(currentUsername, collectionName);
            router.push(`/collection?username=${encodeURIComponent(currentUsername)}&collectionName=${encodeURIComponent(collectionName)}`);
          } else {
            throw new Error('파일 시스템 접근이 지원되지 않는 브라우저입니다.');
          }
        } catch (error) {
          console.error('로컬 파일 열기 실패:', error);
        }
      };

  const handleGoToLastCollection = async () => {
    if (lastOpenedCollection) {
      await setLastOpenedCollection(lastOpenedCollection.username, lastOpenedCollection.collectionName);
      router.push(`/collection?username=${encodeURIComponent(lastOpenedCollection.username)}&collectionName=${encodeURIComponent(lastOpenedCollection.collectionName)}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 dark:bg-zinc-900">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-800 dark:text-white">My KALLAX is Full!</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-lg">
          나만의 앨범 컬렉션을 만들어보세요.
        </p>
        <div className="flex flex-col gap-4">
          <button
            onClick={handleCreateCollectionClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
          >
            새 컬렉션 만들기
          </button>
          <button
            onClick={handleOpenCollectionClick}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
          >
            기존 컬렉션 열기
          </button>
          {lastOpenedCollection && (
            <>
              <div className="my-6 border-t border-zinc-300 dark:border-zinc-700"></div>
              <button
                onClick={handleGoToLastCollection}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
              >
                최근 컬렉션 열기 ({lastOpenedCollection.username ? `${lastOpenedCollection.username}의 ` : ''} {lastOpenedCollection.collectionName})
              </button>
            </>
          )}
        </div>
      </div>

      {showCreateCollectionModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateCollectionModal(false)}
          onCollectionCreated={(username, collectionName) => {
            setShowCreateCollectionModal(false);
            router.push(`/collection?username=${encodeURIComponent(username)}&collectionName=${encodeURIComponent(collectionName)}`);
          }}
        />
      )}

      {showStorageModal && (
        <StorageConnectionModal
          onClose={() => {
            setShowStorageModal(false);
            setSelectedAction(null);
          }}
          onConnectionSelected={handleStorageProviderSelected}
        />
      )}

      {showCloudBrowser && selectedProvider && selectedAction && (
        <CloudFileBrowser
          provider={selectedProvider}
          mode={selectedAction}
          onFileSelected={handleCloudFileSelected}
          onCreateNew={handleCloudFileCreated}
          onClose={() => {
            setShowCloudBrowser(false);
            setSelectedProvider(null);
            setSelectedAction(null);
          }}
        />
      )}
    </main>
  );
}
