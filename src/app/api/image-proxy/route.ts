import { NextRequest, NextResponse } from 'next/server';

// 차단할 도메인 목록 (보안상 위험한 도메인만)
const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // 1. 위험한 도메인만 차단 (HTTPS 강제)
  if (url.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTPS URLs are allowed' }, { status: 403 });
  }

  if (BLOCKED_HOSTNAMES.includes(url.hostname)) {
    return NextResponse.json({ error: 'Access to this host is forbidden' }, { status: 403 });
  }

  // 2. 사설 IP 주소 차단 (SSRF 방지)
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(url.hostname)) {
    const parts = url.hostname.split('.').map(n => parseInt(n));
    // 사설 IP 대역 차단: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
    if (
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 127) // 루프백
    ) {
      return NextResponse.json({ error: 'Access to private network is forbidden' }, { status: 403 });
    }
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(response.body, { status: response.status, headers });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
