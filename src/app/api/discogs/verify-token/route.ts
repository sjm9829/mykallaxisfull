import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Discogs API를 통해 토큰 검증
    const response = await fetch('https://api.discogs.com/oauth/identity', {
      headers: {
        'User-Agent': 'MKIF-Collection-App/0.1',
        'Authorization': `Discogs token=${token}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return NextResponse.json({ 
        valid: true, 
        user: userData 
      });
    } else {
      const errorData = await response.json();
      return NextResponse.json({ 
        valid: false, 
        error: errorData.message || 'Invalid token' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Network error during verification' 
    }, { status: 500 });
  }
}
