# My KALLAX is Full!

나만의 앨범 컬렉션을 관리할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- 🎵 앨범 컬렉션 관리 (CD, LP, 카세트 테이프 등)
- 📁 로컬 파일 또는 클라우드 스토리지 연동
- 🔍 Discogs API를 통한 앨범 정보 자동 완성
- 🖼️ 탑스터 스타일 이미지 내보내기
- 💰 구매 가격 관리 및 통계
- 🌙 다크 모드 지원

## 파일 연동 방식

### 1. 로컬 파일 (기본)
- 컴퓨터의 파일을 직접 불러오거나 저장
- File System Access API 사용

### 2. 클라우드 스토리지 연동
- **Dropbox**: Dropbox 계정과 연동하여 클라우드에 컬렉션 저장
- **Google Drive**: Google Drive 계정과 연동하여 클라우드에 컬렉션 저장
- **OneDrive**: (향후 구현 예정)

## 설정 방법

### 환경 변수 설정

1. `.env.example` 파일을 복사하여 `.env.local` 파일을 생성합니다.
2. 각 클라우드 서비스의 개발자 콘솔에서 앱을 등록하고 필요한 값들을 설정합니다.

### Dropbox 설정

1. [Dropbox Developers](https://www.dropbox.com/developers/apps)에서 새 앱을 생성
2. App key와 App secret을 `.env.local`에 설정
3. OAuth2 redirect URL을 `http://localhost:3000/auth/dropbox/callback`로 설정

### Google Drive 설정

1. [Google Cloud Console](https://console.developers.google.com)에서 새 프로젝트 생성
2. Google Drive API 활성화
3. OAuth 2.0 클라이언트 ID 생성
4. API 키 생성
5. 승인된 JavaScript 원본에 `http://localhost:3000` 추가

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Tech Stack

- **Framework**: Next.js 15.4.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Database**: IndexedDB (via Dexie.js)
- **APIs**: Discogs API, File System Access API
- **Cloud Storage**: Dropbox API, Google Drive API

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
