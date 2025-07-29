import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify에서 빌드 시 필요한 설정
  experimental: {
    // serverComponentsExternalPackages를 사용하여 서버 사이드에서만 실행되는 패키지 명시
  },
  transpilePackages: ['html-to-image'],
  images: {
    // Netlify에서 이미지 캐시 문제 해결
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 모든 HTTPS 호스트 허용
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer-when-downgrade',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self';`,
          },
        ],
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
