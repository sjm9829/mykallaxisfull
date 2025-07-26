"use client";

import { useRouter } from 'next/navigation';
import { setCollectionMetadata, getLastOpenedCollection, setLastOpenedCollection, getFileHandleFromUser, setActiveFileHandle } from '@/lib/db';
import { useState, useEffect } from 'react';
import { CreateCollectionModal } from '@/components/create-collection-modal';

export default function LandingPage() {
  const router = useRouter();
  const [lastOpenedCollection, setLastOpenedCollectionState] = useState<{ username: string; collectionName: string; } | null>(null);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false); // 새 컬렉션 생성 모달 상태

  useEffect(() => {
    const checkLastCollection = async () => {
      const storedLastCollection = await getLastOpenedCollection();
      if (storedLastCollection) {
        setLastOpenedCollectionState(storedLastCollection);
        // Optionally set username from last opened collection if desired
        // setUsername(storedLastCollection.username || '');
      }
    };
    checkLastCollection();
  }, []);

  const handleCreateCollectionClick = () => {
    setShowCreateCollectionModal(true);
  };

  const handleOpenCollection = async () => {
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
            onClick={handleOpenCollection}
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
    </main>
  );
}
