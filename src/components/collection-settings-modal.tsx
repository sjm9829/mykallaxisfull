import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Settings } from 'lucide-react';
import { modalManager } from '@/lib/modal-manager';

interface CollectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentCollectionName: string;
  onSave: (newUsername: string, newCollectionName: string) => void;
  isCloudCollection: boolean;
}

export function CollectionSettingsModal({
  isOpen,
  onClose,
  currentUsername,
  currentCollectionName,
  onSave,
  isCloudCollection
}: CollectionSettingsModalProps) {
  const [username, setUsername] = React.useState(currentUsername);
  const [collectionName, setCollectionName] = React.useState(currentCollectionName);
  
  const modalId = React.useMemo(() => `collection-settings-${Date.now()}`, []);

  // modalManager 등록
  React.useEffect(() => {
    if (isOpen) {
      modalManager.pushModal(modalId, onClose);
    }

    return () => {
      if (isOpen) {
        modalManager.popModal(modalId);
      }
    };
  }, [isOpen, modalId, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername);
      setCollectionName(currentCollectionName);
    }
  }, [isOpen, currentUsername, currentCollectionName]);

  const handleSave = () => {
    if (!username.trim() || !collectionName.trim()) {
      alert('닉네임과 컬렉션명을 모두 입력해주세요.');
      return;
    }

    onSave(username.trim(), collectionName.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    // ESC 키는 modalManager에서 처리하므로 제거
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">컬렉션 설정</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="username">닉네임</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="닉네임을 입력하세요"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="collectionName">컬렉션명</Label>
            <Input
              id="collectionName"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="컬렉션명을 입력하세요"
              className="mt-1"
            />
            {isCloudCollection && (
              <p className="text-sm text-gray-500 mt-1">
                * 클라우드 파일명은 변경되지 않습니다
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button onClick={handleSave} className="flex-1">
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
