"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function DropboxCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // 부모 창의 origin을 가져오기 (더 안전한 방법)
    const getParentOrigin = () => {
      try {
        return window.opener?.location.origin || '*';
      } catch {
        // Cross-origin 접근 불가 시 와일드카드 사용 (보안상 주의)
        return '*';
      }
    };

    if (error) {
      // Send error to parent window
      const targetOrigin = getParentOrigin();
      window.opener?.postMessage({
        type: 'DROPBOX_AUTH_ERROR',
        error: error
      }, targetOrigin);
      window.close();
      return;
    }

    if (code) {
      // Exchange code for access token
      exchangeCodeForToken(code);
    }
  }, [searchParams]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch('/api/auth/dropbox/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const tokenData = await response.json();
      
      // 부모 창의 origin을 가져오기
      const getParentOrigin = () => {
        try {
          return window.opener?.location.origin || '*';
        } catch {
          return '*';
        }
      };

      const targetOrigin = getParentOrigin();

      // Send success data to parent window
      window.opener?.postMessage({
        type: 'DROPBOX_AUTH_SUCCESS',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        userId: tokenData.account_id,
        displayName: tokenData.account_id // Dropbox doesn't provide display name in token response
      }, targetOrigin);

      window.close();
    } catch (error) {
      console.error('Token exchange error:', error);

      const getParentOrigin = () => {
        try {
          return window.opener?.location.origin || '*';
        } catch {
          return '*';
        }
      };

      const targetOrigin = getParentOrigin();

      window.opener?.postMessage({
        type: 'DROPBOX_AUTH_ERROR',
        error: 'Token exchange failed'
      }, targetOrigin);
      window.close();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Dropbox 인증 중...</h1>
        <p className="text-zinc-600">인증을 처리하고 있습니다. 잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

export default function DropboxCallback() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">로딩 중...</h1>
          <p className="text-zinc-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    }>
      <DropboxCallbackContent />
    </Suspense>
  );
}
