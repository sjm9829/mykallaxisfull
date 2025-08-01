import { useState, useCallback } from 'react';
import { APIError, getUserFriendlyErrorMessage } from './error-handler';
import { toast } from 'sonner';

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseAsyncStateOptions<T = unknown> {
  showToast?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: APIError) => void;
}

/**
 * 비동기 작업의 로딩, 성공, 실패 상태를 관리하는 커스텀 훅
 */
export function useAsyncState<T = unknown>(options: UseAsyncStateOptions<T> = {}) {
  const { showToast = true, initialData = null, onSuccess, onError } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await asyncFunction();
      setState({
        data: result,
        isLoading: false,
        error: null,
      });

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const apiError = error instanceof APIError ? error : new APIError('알 수 없는 오류가 발생했습니다.');
      const errorMessage = getUserFriendlyErrorMessage(apiError);

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      if (showToast) {
        toast.error(errorMessage);
      }

      if (onError) {
        onError(apiError);
      }

      throw apiError;
    }
  }, [showToast, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isLoading: false,
      error: null,
    });
  }, [initialData]);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
}

/**
 * 파일 업로드/다운로드 등의 작업을 위한 특화된 훅
 */
export function useFileOperation() {
  return useAsyncState({
    showToast: true,
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'message' in data) {
        toast.success(data.message as string);
      }
    },
  });
}

/**
 * API 호출을 위한 특화된 훅
 */
export function useApiCall<T = unknown>(options: UseAsyncStateOptions<T> = {}) {
  return useAsyncState<T>({
    showToast: true,
    ...options,
  });
}
