'use client';

import { useGlobalLoading } from '@/contexts/LoadingContext';

export function GlobalLoadingOverlay() {
  const { isGlobalLoading, loadingMessage } = useGlobalLoading();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4 bg-white rounded-lg p-8 shadow-xl">
        {/* 로딩 스피너 */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        
        {/* 로딩 메시지 */}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">{loadingMessage}</p>
          <p className="text-sm text-gray-600 mt-1">잠시만 기다려주세요...</p>
        </div>
      </div>
    </div>
  );
}
