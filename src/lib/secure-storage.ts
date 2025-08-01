/**
 * 보안이 강화된 localStorage 래퍼
 */

interface SecureStorageOptions {
  encrypt?: boolean;
  expiry?: number; // milliseconds
}

class SecureStorage {
  private prefix = 'mkif_';

  /**
   * 보안 저장 (옵션으로 암호화 및 만료시간 설정)
   */
  setItem(key: string, value: unknown, options: SecureStorageOptions = {}): void {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expiry: options.expiry ? Date.now() + options.expiry : null,
      };

      const serialized = JSON.stringify(data);
      const finalValue = options.encrypt ? this.simpleEncrypt(serialized) : serialized;
      
      localStorage.setItem(this.prefix + key, finalValue);
    } catch (error) {
      console.warn('SecureStorage.setItem failed:', error);
    }
  }

  /**
   * 보안 조회 (자동 만료 검증)
   */
  getItem<T = unknown>(key: string, options: SecureStorageOptions = {}): T | null {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;

      const decrypted = options.encrypt ? this.simpleDecrypt(stored) : stored;
      const data = JSON.parse(decrypted);

      // 만료 검증
      if (data.expiry && Date.now() > data.expiry) {
        this.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.warn('SecureStorage.getItem failed:', error);
      return null;
    }
  }

  /**
   * 아이템 제거
   */
  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * 전체 앱 데이터 정리
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * 간단한 XOR 암호화 (기본적인 난독화용)
   */
  private simpleEncrypt(text: string): string {
    const key = 'MKIF_SECURE_KEY';
    let encrypted = '';
    
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted);
  }

  /**
   * 간단한 XOR 복호화
   */
  private simpleDecrypt(encrypted: string): string {
    const key = 'MKIF_SECURE_KEY';
    const decoded = atob(encrypted);
    let decrypted = '';
    
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return decrypted;
  }
}

// 전역 인스턴스
export const secureStorage = new SecureStorage();

// 기존 localStorage 호출을 대체하는 헬퍼 함수들
export const storage = {
  // 민감하지 않은 일반 데이터
  setItem: (key: string, value: unknown) => secureStorage.setItem(key, value),
  getItem: <T = unknown>(key: string) => secureStorage.getItem<T>(key),
  
  // 민감한 데이터 (토큰, 연결 정보 등)
  setSecure: (key: string, value: unknown, expiryMs = 24 * 60 * 60 * 1000) => 
    secureStorage.setItem(key, value, { encrypt: true, expiry: expiryMs }),
  getSecure: <T = unknown>(key: string) => 
    secureStorage.getItem<T>(key, { encrypt: true }),
  
  // 임시 데이터 (세션 수준)
  setTemporary: (key: string, value: unknown, expiryMs = 60 * 60 * 1000) =>
    secureStorage.setItem(key, value, { expiry: expiryMs }),
    
  removeItem: (key: string) => secureStorage.removeItem(key),
  clear: () => secureStorage.clear(),
};
