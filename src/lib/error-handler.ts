export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public service?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends APIError {
  constructor(service?: string) {
    super(`${service ? `${service} ` : ''}인증이 필요합니다.`, 401, service);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends APIError {
  constructor(service?: string, status?: number, originalError?: unknown) {
    super(`${service ? `${service} ` : ''}네트워크 오류가 발생했습니다.`, status, service, originalError);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, service?: string) {
    super(message, 400, service);
    this.name = 'ValidationError';
  }
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  logError?: boolean;
}

/**
 * API 에러를 일관된 방식으로 처리하는 유틸리티 함수
 */
export const handleAPIError = (
  error: unknown,
  service: string,
  options: ErrorHandlerOptions = {}
): APIError => {
  const { fallbackMessage = '알 수 없는 오류가 발생했습니다.', logError = true } = options;

  if (logError) {
    console.error(`[${service}] Error:`, error);
  }

  // 이미 APIError 인스턴스인 경우
  if (error instanceof APIError) {
    return error;
  }

  // Response 객체인 경우
  if (error instanceof Response) {
    if (error.status === 401) {
      return new AuthenticationError(service);
    }
    return new NetworkError(service, error.status);
  }

  // 일반 Error 객체인 경우
  if (error instanceof Error) {
    if (error.message.includes('Not authenticated') || error.message.includes('Authentication')) {
      return new AuthenticationError(service);
    }
    if (error.message.includes('Failed to') || error.message.includes('Network')) {
      return new NetworkError(service, undefined, error);
    }
    return new APIError(error.message, undefined, service, error);
  }

  // 기타 경우
  return new APIError(fallbackMessage, undefined, service, error);
};

/**
 * 환경 변수 누락 에러를 처리하는 유틸리티 함수
 */
export const createEnvironmentError = (service: string, requiredVars: string[]): APIError => {
  const message = `${service} 연동을 위해서는 환경 변수 설정이 필요합니다.

필요한 환경 변수:
${requiredVars.map(v => `- ${v}`).join('\n')}

.env.local 파일에 해당 값들을 설정해주세요.`;

  return new ValidationError(message, service);
};

/**
 * 사용자 친화적인 에러 메시지를 생성하는 함수
 */
export const getUserFriendlyErrorMessage = (error: APIError): string => {
  if (error instanceof AuthenticationError) {
    return `${error.service || '서비스'} 로그인이 필요합니다. 다시 로그인해주세요.`;
  }

  if (error instanceof NetworkError) {
    return `${error.service || '서비스'} 연결에 문제가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.`;
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  return error.message || '알 수 없는 오류가 발생했습니다.';
};
