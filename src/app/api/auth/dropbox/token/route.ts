import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔍 Dropbox token exchange started');

  try {
    const { code } = await request.json();
    console.log('🔍 Authorization code received:', code ? 'Present' : 'Missing');

    if (!code) {
      console.error('🔍 No authorization code provided');
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_DROPBOX_REDIRECT_URI;

    console.log('🔍 Environment variables check:');
    console.log('🔍 Client ID:', clientId ? 'Present' : 'Missing');
    console.log('🔍 Client Secret:', clientSecret ? 'Present' : 'Missing');
    console.log('🔍 Redirect URI:', redirectUri ? 'Present' : 'Missing');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('🔍 Missing Dropbox credentials');
      return NextResponse.json({
        error: 'Server configuration error - Missing environment variables',
        details: {
          clientId: !!clientId,
          clientSecret: !!clientSecret,
          redirectUri: !!redirectUri
        }
      }, { status: 500 });
    }

    console.log('🔍 Making token exchange request to Dropbox API');

    // Exchange authorization code for access token
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
      }),
    });

    console.log('🔍 Dropbox API response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('🔍 Dropbox token exchange failed:', errorData);
      console.error('🔍 Response status:', tokenResponse.status);
      console.error('🔍 Response headers:', Object.fromEntries(tokenResponse.headers.entries()));

      return NextResponse.json({
        error: 'Token exchange failed',
        details: errorData,
        status: tokenResponse.status
      }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    console.log('🔍 Token exchange successful');
    console.log('🔍 Token data keys:', Object.keys(tokenData));

    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('🔍 Dropbox token exchange error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
