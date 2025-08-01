import React, { useState } from 'react';
import { useModalAccessibility } from '@/lib/useModalAccessibility';
import { useFileOperation } from '@/lib/useAsyncState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { createNewFileHandle, setCollectionMetadata, setLastOpenedCollection, setActiveFileHandle } from '@/lib/db';
import { setActiveCloudFile } from '@/lib/cloud-storage';

interface CreateCollectionModalProps {
  onClose: () => void;
  onCollectionCreated: (username: string, collectionName: string) => void;
  initialUsername?: string; // Make it optional
}

export function CreateCollectionModal({
  onClose,
  onCollectionCreated,
  initialUsername = '', // Provide a default value
}: CreateCollectionModalProps) {
  const modalRef = useModalAccessibility(onClose);
  const [username, setUsername] = useState(initialUsername);
  const [collectionName, setCollectionName] = useState('');
  const { isLoading, execute } = useFileOperation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !collectionName.trim()) {
      toast.error("사용자명과 컬렉션 이름을 입력해주세요.");
      return;
    }

    await execute(async () => {
      const fileHandle = await createNewFileHandle(`${collectionName}.json`);
      if (!fileHandle) {
        toast.info("컬렉션 생성이 취소되었습니다.");
        return { message: "컬렉션 생성이 취소되었습니다." };
      }

      const initialContent = JSON.stringify({ _metadata: { username: username, collectionName: collectionName }, albums: [] }, null, 2);
      const writable = await fileHandle.createWritable();
      await writable.write(initialContent);
      await writable.close();

      // 로컬 파일 생성 시 클라우드 파일 정보 정리
      setActiveCloudFile(null);

      await setCollectionMetadata(username, collectionName, 0);
      await setActiveFileHandle(fileHandle);
      await setLastOpenedCollection(username, collectionName);
      onCollectionCreated(username, collectionName);

      return { message: "컬렉션이 성공적으로 생성되었습니다." };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadein">
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800"
        ref={modalRef}
      >
        <h2 className="text-2xl font-bold mb-4">새 컬렉션 생성</h2>
        <button
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="w-6 h-6" />
        </button>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="new-username">사용자명</Label>
            <Input
              id="new-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="사용자명"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="new-collection-name">컬렉션 이름</Label>
            <Input
              id="new-collection-name"
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="새 컬렉션 이름"
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "생성 중..." : "컬렉션 생성"}
          </Button>
        </form>
      </div>
    </div>
  );
}
