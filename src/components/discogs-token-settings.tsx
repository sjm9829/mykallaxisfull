"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { toast } from "sonner";

interface DiscogsTokenSettingsProps {
  onClose: () => void;
  discogsToken: string | null; // prop으로 토큰 받기
  onTokenChange: (token: string | null) => Promise<void>; // prop으로 토큰 설정 함수 받기
}

export function DiscogsTokenSettings({ onClose, discogsToken, onTokenChange }: DiscogsTokenSettingsProps) {
  const [tokenInput, setTokenInput] = useState<string>("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  useEffect(() => {
    if (discogsToken) {
      setTokenInput(discogsToken);
    }
  }, [discogsToken]);

  const handleSave = async () => {
    if (!tokenInput) {
      toast.error("토큰을 입력해주세요.");
      return;
    }

    // 토큰에서 잠재적인 문제 문자들을 제거/정리
    const cleanToken = tokenInput.trim();

    setIsVerifyingToken(true);
    try {
      console.log('Sending token verification request...');
      
      // 먼저 서버 API 시도
      try {
        const response = await fetch('/api/discogs/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: cleanToken }),
        });

        console.log('Response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          if (result.valid) {
            await onTokenChange(cleanToken);
            toast.success("Discogs 개인 액세스 토큰이 유효하며 저장되었습니다.");
            onClose();
            return;
          }
        }
      } catch (serverError) {
        console.log('서버 API 실패, 클라이언트에서 직접 검증 시도:', serverError);
      }

      // 서버 API 실패 시 클라이언트에서 직접 Discogs API 호출
      console.log('클라이언트에서 직접 Discogs API 호출...');
      
      const directResponse = await fetch('https://api.discogs.com/oauth/identity', {
        headers: {
          'User-Agent': 'MKIF-Collection-App/1.0',
          'Authorization': `Discogs token=${cleanToken}`,
        },
      });

      if (directResponse.ok) {
        const userData = await directResponse.json();
        console.log('직접 검증 성공:', userData.username);
        await onTokenChange(cleanToken);
        toast.success("Discogs 개인 액세스 토큰이 유효하며 저장되었습니다.");
        onClose();
      } else {
        const errorText = await directResponse.text();
        let errorMessage = 'Invalid token';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // 파싱 실패 시 기본 메시지 사용
        }
        toast.error(`토큰 유효성 검사 실패: ${errorMessage}`);
      }
    } catch (error) {
      console.error("토큰 유효성 검사 중 오류 발생:", error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("네트워크 연결을 확인해주세요. Discogs API에 접근할 수 없습니다.");
      } else if (error instanceof SyntaxError) {
        toast.error("서버 응답 파싱 오류가 발생했습니다.");
      } else {
        toast.error(`토큰 유효성 검사 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleDelete = () => {
    onTokenChange(null); // prop으로 받은 함수 호출
    setTokenInput("");
    toast.success("Discogs 개인 액세스 토큰이 삭제되었습니다.");
  };

  return (
    <div className="p-4 relative">
      <h2 className="text-xl font-bold mb-4">Discogs 개인 액세스 토큰 설정</h2>
      <button
        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        onClick={onClose}
        aria-label="닫기"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="mb-4">
        <Label htmlFor="discogs-token" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          개인 액세스 토큰
          <a
            href="https://www.discogs.com/settings/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs underline"
          >
            (Discogs에서 토큰 생성/확인)
          </a>
        </Label>
        <Input
          id="discogs-token"
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          placeholder="Discogs 개인 액세스 토큰을 입력하세요"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={!tokenInput || isVerifyingToken}>
          토큰 삭제
        </Button>
        <Button onClick={handleSave} disabled={isVerifyingToken}>
          {isVerifyingToken ? "확인 중..." : "토큰 저장"}
        </Button>
      </div>
    </div>
  );
}