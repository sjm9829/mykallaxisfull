export default async (request: Request, context: any) => {
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('🔍 Dropbox token exchange started (Edge Function)');

  try {
    const body = await request.json();
    const { code } = body;

    console.log('🔍 Authorization code received:', code ? 'Present' : 'Missing');

    if (!code) {
      console.error('🔍 No authorization code provided');
      return new Response(JSON.stringify({ error: 'Authorization code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 환경 변수에서 Dropbox 설정 가져오기 (Netlify Edge Functions 방식)
    const clientId = context.site?.environment?.NEXT_PUBLIC_DROPBOX_CLIENT_ID ||
                     globalThis.Netlify?.env?.get?.('NEXT_PUBLIC_DROPBOX_CLIENT_ID');
    const clientSecret = context.site?.environment?.DROPBOX_CLIENT_SECRET ||
                        globalThis.Netlify?.env?.get?.('DROPBOX_CLIENT_SECRET');
    const redirectUri = context.site?.environment?.NEXT_PUBLIC_DROPBOX_REDIRECT_URI ||
                       globalThis.Netlify?.env?.get?.('NEXT_PUBLIC_DROPBOX_REDIRECT_URI');

    console.log('🔍 Environment variables check:');
    console.log('🔍 Client ID:', clientId ? 'Present' : 'Missing');
    console.log('🔍 Client Secret:', clientSecret ? 'Present' : 'Missing');
    console.log('🔍 Redirect URI:', redirectUri ? 'Present' : 'Missing');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('🔍 Missing Dropbox credentials');
      return new Response(JSON.stringify({
        error: 'Server configuration error - Missing environment variables',
        details: {
          clientId: !!clientId,
          clientSecret: !!clientSecret,
          redirectUri: !!redirectUri
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Making token exchange request to Dropbox API');

    // Dropbox API에 토큰 교환 요청
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    console.log('🔍 Dropbox API response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('🔍 Dropbox token exchange failed:', errorData);
      console.error('🔍 Response status:', tokenResponse.status);

      return new Response(JSON.stringify({
        error: 'Token exchange failed',
        details: errorData,
        status: tokenResponse.status
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('🔍 Token exchange successful');
    console.log('🔍 Token data keys:', Object.keys(tokenData));

    return new Response(JSON.stringify(tokenData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🔍 Dropbox token exchange error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
