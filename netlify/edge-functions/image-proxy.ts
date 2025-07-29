const imageProxyHandler = async (request: Request) => {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'Image URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(imageUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // HTTPS 강제
  if (targetUrl.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'Only HTTPS URLs are allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 차단할 도메인 목록 (보안상 위험한 도메인만)
  const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];
  if (BLOCKED_HOSTNAMES.includes(targetUrl.hostname)) {
    return new Response(JSON.stringify({ error: 'Access to this host is forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 사설 IP 주소 차단 (SSRF 방지)
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(targetUrl.hostname)) {
    const parts = targetUrl.hostname.split('.').map(n => parseInt(n));
    // 사설 IP 대역 차단: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
    if (
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 127) // 루프백
    ) {
      return new Response(JSON.stringify({ error: 'Access to private network is forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    const response = await fetch(targetUrl.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to proxy image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export default imageProxyHandler;
