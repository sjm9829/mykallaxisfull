// Production logging system
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      // 프로덕션에서는 사용자 컨텍스트 수집
      ...(typeof window !== 'undefined' && {
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
      })
    };
  }

  private getSessionId(): string {
    // 세션 ID 생성 또는 기존 것 반환
    let sessionId = sessionStorage.getItem('session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('session-id', sessionId);
    }
    return sessionId;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private output(entry: LogEntry): void {
    if (this.isDevelopment) {
      // 개발 환경에서는 console 출력
      const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
      console.log(`[${levelNames[entry.level]}] ${entry.timestamp} - ${entry.message}`, entry.context || '');
    } else {
      // 프로덕션에서는 외부 로깅 서비스로 전송
      this.sendToLogService(entry);
    }
  }

  private async sendToLogService(entry: LogEntry): Promise<void> {
    try {
      // 실제 프로덕션에서는 Sentry, LogRocket, DataDog 등 사용
      if (entry.level <= LogLevel.WARN) {
        // 중요한 로그만 외부로 전송
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      // 로깅 실패는 조용히 무시 (무한 루프 방지)
      console.error('Failed to send log to service:', error);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, context);
      this.output(entry);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, message, context);
      this.output(entry);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, context);
      this.output(entry);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      this.output(entry);
    }
  }

  // 보안 이벤트 로깅
  security(event: string, context?: Record<string, unknown>): void {
    const securityEntry = this.createLogEntry(LogLevel.ERROR, `SECURITY: ${event}`, {
      ...context,
      security: true,
      timestamp: Date.now()
    });
    this.output(securityEntry);
    
    // 보안 이벤트는 즉시 알림
    if (typeof window !== 'undefined' && event.includes('ATTACK')) {
      // 심각한 보안 이벤트는 즉시 차단
      window.location.href = '/security-block';
    }
  }
}

// 글로벌 로거 인스턴스
export const logger = Logger.getInstance();

// 에러 바운더리용 헬퍼
export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error(error.message, {
    ...context,
    stack: error.stack,
    name: error.name
  });
}
