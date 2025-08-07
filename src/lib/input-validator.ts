// Input validation utilities
export class InputValidator {
  // XSS 방지를 위한 HTML 이스케이프
  static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 문자열 길이 검증
  static validateStringLength(value: string, minLength: number = 0, maxLength: number = 1000): boolean {
    return value.length >= minLength && value.length <= maxLength;
  }

  // URL 검증
  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // 파일 이름 검증 (경로 순회 공격 방지)
  static validateFileName(filename: string): boolean {
    // 위험한 문자 및 패턴 차단
    const dangerousPatterns = [
      /\.\./,  // 경로 순회
      /[<>:"|?*]/,  // 파일시스템 예약 문자
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows 예약어
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(filename)) &&
           filename.length <= 255 &&
           filename.trim().length > 0;
  }

  // 토큰 형식 검증
  static validateToken(token: string): boolean {
    // 기본적인 토큰 형식 검증
    return /^[A-Za-z0-9_-]+$/.test(token) && 
           token.length >= 10 && 
           token.length <= 256;
  }

  // 사용자명 검증
  static validateUsername(username: string): boolean {
    return /^[a-zA-Z0-9_-]{1,50}$/.test(username);
  }

  // 컬렉션명 검증
  static validateCollectionName(name: string): boolean {
    return /^[a-zA-Z0-9가-힣\s_-]{1,100}$/.test(name);
  }

  // 깊은 객체 크기 제한 (DoS 방지)
  static validateObjectSize(obj: unknown, maxDepth: number = 10, maxKeys: number = 1000): boolean {
    let keyCount = 0;
    
    function checkDepth(value: unknown, depth: number): boolean {
      if (depth > maxDepth) return false;
      
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          keyCount += value.length;
          return value.every(item => checkDepth(item, depth + 1));
        } else {
          const keys = Object.keys(value);
          keyCount += keys.length;
          if (keyCount > maxKeys) return false;
          return keys.every(key => checkDepth((value as Record<string, unknown>)[key], depth + 1));
        }
      }
      return true;
    }
    
    return checkDepth(obj, 0);
  }
}

// 알림 메시지 안전 처리
export function sanitizeToastMessage(message: string): string {
  return InputValidator.escapeHtml(message).substring(0, 200);
}
