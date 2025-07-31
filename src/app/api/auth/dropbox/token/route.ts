import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_DROPBOX_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Dropbox credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

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

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Dropbox token exchange failed:', errorData);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Dropbox token exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
