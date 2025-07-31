"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // OAuth 에러 처리
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error
      }, window.location.origin);
      window.close();
      return;
    }

    if (code) {
      // Authorization code를 access token으로 교환
      fetch('/api/auth/google/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          window.opener?.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: data.error
          }, window.location.origin);
        } else {
          // 성공적으로 토큰을 받았을 때
          window.opener?.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + (data.expires_in * 1000),
            userId: data.user_id,
            displayName: data.display_name
          }, window.location.origin);
        }
        window.close();
      })
      .catch(error => {
        console.error('Token exchange error:', error);
        window.opener?.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Token exchange failed'
        }, window.location.origin);
        window.close();
      });
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Google Drive 인증 중...</h2>
        <p className="text-zinc-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">로딩 중...</h2>
          <p className="text-zinc-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
