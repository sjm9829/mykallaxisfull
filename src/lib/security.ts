/**
 * 입력 검증 및 보안 유틸리티
 */

// 악성 스크립트 패턴 검사
const MALICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
];

/**
 * 문자열에서 잠재적으로 위험한 HTML/JS 코드 제거
 */
export function sanitizeInput(input: string): string {
  let sanitized = input;
  
  // 악성 패턴 제거
  MALICIOUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // HTML 태그 이스케이프
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}

/**
 * URL 유효성 검증
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 파일명 검증 (디렉토리 순회 방지)
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '') // 특수문자 제거
    .replace(/\.\./g, '') // 디렉토리 순회 방지
    .replace(/^\./, '') // 숨김파일 방지
    .trim()
    .substring(0, 255); // 길이 제한
}

/**
 * JSON 데이터 검증
 */
export function validateCollectionData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const collection = data as Record<string, unknown>;
  
  // 필수 필드 검증
  if (!collection._metadata || !collection.albums) return false;
  if (!Array.isArray(collection.albums)) return false;
  
  // 메타데이터 검증
  const metadata = collection._metadata as Record<string, unknown>;
  if (typeof metadata.username !== 'string' || 
      typeof metadata.collectionName !== 'string') {
    return false;
  }
  
  // 각 앨범 데이터 검증
  return collection.albums.every((album: unknown) => {
    if (!album || typeof album !== 'object') return false;
    const albumObj = album as Record<string, unknown>;
    return typeof albumObj.id === 'string' &&
           typeof albumObj.title === 'string' &&
           typeof albumObj.artist === 'string';
  });
}

/**
 * Rate limiting을 위한 간단한 토큰 버킷
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// 전역 rate limiter (IP당 분당 10개 요청)
const rateLimiters = new Map<string, TokenBucket>();

export function checkRateLimit(identifier: string): boolean {
  if (!rateLimiters.has(identifier)) {
    rateLimiters.set(identifier, new TokenBucket(10, 10/60)); // 10 tokens, refill 1 per 6 seconds
  }
  
  return rateLimiters.get(identifier)!.consume();
}
