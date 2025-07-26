import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTNAMES = ['i.discogs.com', 'img.discogs.com']; // 허용된 이미지 호스트 목록

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // 1. 도메인 화이트리스트 검증
  if (!ALLOWED_HOSTNAMES.includes(url.hostname)) {
    return NextResponse.json({ error: 'Image host not allowed' }, { status: 403 });
  }

  // 2. 사설 IP 및 로컬호스트 차단 (SSRF 방지)
  // 이 부분은 서버 환경에서 IP 주소를 직접 확인해야 하지만,
  // Next.js Edge Runtime에서는 직접적인 IP 확인이 어렵습니다.
  // 따라서, 호스트네임 기반의 기본적인 방어만 수행합니다.
  // 더 강력한 방어를 위해서는 별도의 미들웨어 또는 서버리스 함수를 고려해야 합니다.
  if (url.hostname === 'localhost' || url.hostname.startsWith('127.') || url.hostname.startsWith('10.') || url.hostname.startsWith('172.16.') || url.hostname.startsWith('192.168.')) {
    return NextResponse.json({ error: 'Access to private network is forbidden' }, { status: 403 });
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
