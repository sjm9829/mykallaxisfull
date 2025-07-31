"use client";

import { useRouter } from 'next/navigation';
import { setCollectionMetadata, getLastOpenedCollection, setLastOpenedCollection, getFileHandleFromUser, setActiveFileHandle } from '@/lib/db';
import { useState, useEffect } from 'react';
import { CreateCollectionModal } from '@/components/create-collection-modal';
import { StorageConnectionModal } from '@/components/storage-connection-modal';
import { CloudFileBrowser } from '@/components/cloud-file-browser';
import { StorageProvider, CloudFile } from '@/types/storage';
import { storageManager } from '@/lib/storage-manager';

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
        await handleOpenLocalCollection();
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

  const handleOpenLocalCollection = async () => {
    try {
      const fileHandle = await getFileHandleFromUser();
      if (!fileHandle) return; // User cancelled
      
      const file = await fileHandle.getFile();
      const text = await file.text();
      let fileUsername = '';
      let fileCollectionName = fileHandle.name.replace('.json', '');

      try {
        const parsedContent = JSON.parse(text);
        if (parsedContent._metadata && parsedContent._metadata.username) {
          fileUsername = parsedContent._metadata.username;
        } else {
          fileUsername = ''; // 파싱 실패 시 기본값으로 빈 문자열 할당
        }
        if (parsedContent._metadata && parsedContent._metadata.collectionName) {
          fileCollectionName = parsedContent._metadata.collectionName;
        }
      } catch (e) {
        console.error("Error parsing file for username/collectionName:", e);
        
      }

      // Update album count from file content
      const albumCount = JSON.parse(text).albums?.length || 0;

      await setCollectionMetadata(fileUsername, fileCollectionName, albumCount);
      await setLastOpenedCollection(fileUsername, fileCollectionName);
      await setActiveFileHandle(fileHandle); // Set active file handle
      router.push(`/collection?username=${encodeURIComponent(fileUsername)}&collectionName=${encodeURIComponent(fileCollectionName)}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User cancelled the file picker, do nothing
      } else {
        console.error('Error opening file:', error);
      }
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
