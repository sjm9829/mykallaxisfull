"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { toast } from "sonner";
import { loadFromGist, isValidGistUrl, type CollectionData } from "@/services/gist";

interface LoadFromGistModalProps {
  onClose: () => void;
  onLoad: (data: CollectionData) => void;
}

export function LoadFromGistModal({ onClose, onLoad }: LoadFromGistModalProps) {
  const [gistUrl, setGistUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLoad = async () => {
    if (!gistUrl.trim()) {
      toast.error("Gist URL을 입력해주세요.");
      return;
    }

    if (!isValidGistUrl(gistUrl.trim())) {
      toast.error("올바른 GitHub Gist URL을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await loadFromGist(gistUrl.trim());
      onLoad(data);
      toast.success("컬렉션을 성공적으로 불러왔습니다!");
      onClose();
    } catch (error) {
      console.error("Gist 로드 오류:", error);
      toast.error(error instanceof Error ? error.message : "컬렉션을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadein">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-bold mb-4">Gist에서 컬렉션 불러오기</h2>
        <button
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          onClick={onClose}
          aria-label="닫기"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-4">
          <Label htmlFor="gist-url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            GitHub Gist URL
          </Label>
          <Input
            id="gist-url"
            type="url"
            value={gistUrl}
            onChange={(e) => setGistUrl(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            placeholder="https://gist.github.com/username/gist-id"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            공유받은 GitHub Gist URL을 입력하세요
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={handleLoad} disabled={isLoading || !gistUrl.trim()}>
            {isLoading ? "불러오는 중..." : "불러오기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
