import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔍 Google Drive token exchange started');

  try {
    const { code } = await request.json();
    console.log('🔍 Authorization code received:', code ? 'Present' : 'Missing');

    if (!code) {
      console.error('🔍 No authorization code provided');
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

    console.log('🔍 Environment variables check:');
    console.log('🔍 Client ID:', clientId ? 'Present' : 'Missing');
    console.log('🔍 Client Secret:', clientSecret ? 'Present' : 'Missing');
    console.log('🔍 Redirect URI:', redirectUri ? 'Present' : 'Missing');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('🔍 Missing Google OAuth credentials');
      return NextResponse.json({
        error: 'Server configuration error - Missing environment variables',
        details: {
          clientId: !!clientId,
          clientSecret: !!clientSecret,
          redirectUri: !!redirectUri
        }
      }, { status: 500 });
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
      }),
    });

    console.log('🔍 Google API response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('🔍 Google token exchange failed:', errorText);
      console.error('🔍 Response status:', tokenResponse.status);
      console.error('🔍 Response headers:', Object.fromEntries(tokenResponse.headers.entries()));

      return NextResponse.json({
        error: 'Failed to exchange authorization code',
        details: errorText,
        status: tokenResponse.status
      }, { status: 400 });
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

    return NextResponse.json({
      ...tokenData,
      user_id: userData.id,
      display_name: userData.name
    });
  } catch (error) {
    console.error('🔍 Google token exchange error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
