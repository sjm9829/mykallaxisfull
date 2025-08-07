import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify 배포 설정 (Edge Functions 사용)
  // output: export는 API 라우트와 충돌하므로 제거
  
  // 실험적 기능 (문제가 있는 optimizeCss 제거)
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-tooltip'],
  },
  // 번들 최적화
  transpilePackages: ['html-to-image'],
  // 이미지 최적화 (Netlify 환경에 맞게 설정)
  images: {
    unoptimized: true, // Netlify에서 이미지 최적화 문제 해결
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 모든 HTTPS 호스트 허용
        port: '',
        pathname: '/**',
      },
    ],
  },
  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Netlify에서 헤더는 netlify.toml과 _headers 파일로 처리
};

export default nextConfig;
