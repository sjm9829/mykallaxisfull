'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isGlobalLoading: boolean;
  loadingMessage: string;
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const setGlobalLoading = (loading: boolean, message: string = '처리 중...') => {
    setIsGlobalLoading(loading);
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ isGlobalLoading, loadingMessage, setGlobalLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
}
