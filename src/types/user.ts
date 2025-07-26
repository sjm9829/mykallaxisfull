export interface User {
  id: string;
  nickname: string;
  email?: string;
  profileImageUrl?: string;
  provider: 'google' | 'kakao' | 'naver';
} 