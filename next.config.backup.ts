import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify 배포 설정 (Edge Functions 사용)
  // output: export는 API 라우트와 충돌하므로 제거
  
  // 실험적 기능
  experimental: {
    optimizeCss: true,
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
        hostname: 'img.discogs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.github.com',
        port: '',
        pathname: '/gists/**',
      },
      {
        protocol: 'https',
        hostname: 'content.dropboxapi.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.googleapis.com',
        port: '',
        pathname: '/**',
      }
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
            value: `default-src 'self'; 
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.dropboxapi.com https://accounts.google.com; 
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
              img-src 'self' data: https: blob:; 
              font-src 'self' https://fonts.gstatic.com; 
              connect-src 'self' https://api.discogs.com https://api.dropboxapi.com https://content.dropboxapi.com https://www.googleapis.com https://api.github.com; 
              frame-src 'self' https://accounts.google.com; 
              object-src 'none'; 
              base-uri 'self'; 
              upgrade-insecure-requests;`.replace(/\s+/g, ' '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), bluetooth=()',
          },
        ],
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
