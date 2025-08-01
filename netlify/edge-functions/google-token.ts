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

  console.log('🔍 Google Drive token exchange started (Edge Function)');

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

    // 환경 변수에서 Google 설정 가져오기 (Netlify Edge Functions 방식)
    const clientId = context.site?.environment?.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
                     globalThis.Netlify?.env?.get?.('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    const clientSecret = context.site?.environment?.GOOGLE_CLIENT_SECRET ||
                        globalThis.Netlify?.env?.get?.('GOOGLE_CLIENT_SECRET');
    const redirectUri = context.site?.environment?.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
                       globalThis.Netlify?.env?.get?.('NEXT_PUBLIC_GOOGLE_REDIRECT_URI');

    console.log('🔍 Environment variables check:');
    console.log('🔍 Client ID:', clientId ? 'Present' : 'Missing');
    console.log('🔍 Client Secret:', clientSecret ? 'Present' : 'Missing');
    console.log('🔍 Redirect URI:', redirectUri ? 'Present' : 'Missing');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('🔍 Missing Google OAuth credentials');
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

    console.log('🔍 Making token exchange request to Google API');

    // Google OAuth2 토큰 교환
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    console.log('🔍 Google API response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('🔍 Google token exchange failed:', errorData);
      console.error('🔍 Response status:', tokenResponse.status);

      return new Response(JSON.stringify({
        error: 'Failed to exchange authorization code',
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

    console.log('🔍 Fetching user information');

    // 사용자 정보 가져오기
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    let userData = { id: 'unknown', name: 'Unknown User' };
    if (userResponse.ok) {
      userData = await userResponse.json();
      console.log('🔍 User info retrieved successfully');
    } else {
      console.warn('🔍 Failed to retrieve user info, using defaults');
    }

    return new Response(JSON.stringify({
      ...tokenData,
      user_id: userData.id,
      display_name: userData.name
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🔍 Google token exchange error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
