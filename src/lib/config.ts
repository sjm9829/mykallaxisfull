/**
 * 환경 변수 타입 정의 및 검증
 */

interface EnvironmentConfig {
  // 앱 기본 설정
  APP_NAME: string;
  APP_VERSION: string;
  NODE_ENV: 'development' | 'production' | 'test';
  
  // 보안 설정
  ENCRYPTION_KEY: string;
  API_BASE_URL: string;
  
  // 외부 서비스
  DROPBOX_CLIENT_ID?: string;
  DROPBOX_REDIRECT_URI?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_REDIRECT_URI?: string;
  
  // 기능 설정
  DEBUG: boolean;
  API_RATE_LIMIT: number;
}

/**
 * 환경 변수 검증 및 파싱
 */
function validateEnvironment(): EnvironmentConfig {
  const env = process.env;
  
  // 필수 환경 변수 검증
  const requiredVars = [
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_ENCRYPTION_KEY',
  ];
  
  const missing = requiredVars.filter(key => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return {
    APP_NAME: env.NEXT_PUBLIC_APP_NAME || 'My KALLAX is Full',
    APP_VERSION: env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    NODE_ENV: (['development', 'production', 'test'].includes(env.NODE_ENV || '') 
      ? env.NODE_ENV as 'development' | 'production' | 'test' 
      : 'development'),
    
    ENCRYPTION_KEY: env.NEXT_PUBLIC_ENCRYPTION_KEY!,
    API_BASE_URL: env.NEXT_PUBLIC_API_BASE_URL || '/api',
    
    DROPBOX_CLIENT_ID: env.NEXT_PUBLIC_DROPBOX_CLIENT_ID,
    DROPBOX_REDIRECT_URI: env.NEXT_PUBLIC_DROPBOX_REDIRECT_URI,
    GOOGLE_CLIENT_ID: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI: env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
    
    DEBUG: env.NEXT_PUBLIC_DEBUG === 'true',
    API_RATE_LIMIT: parseInt(env.NEXT_PUBLIC_API_RATE_LIMIT || '100', 10),
  };
}

// 검증된 환경 설정 내보내기
export const config = validateEnvironment();

// 개발 환경에서만 사용할 수 있는 기능들
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';

// 서비스 활성화 여부 확인
export const services = {
  dropbox: !!(config.DROPBOX_CLIENT_ID && config.DROPBOX_REDIRECT_URI),
  googleDrive: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_REDIRECT_URI),
} as const;
