import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    console.log('Verifying Discogs token...');

    // Discogs API를 통해 토큰 검증
    const response = await fetch('https://api.discogs.com/oauth/identity', {
      headers: {
        'User-Agent': 'MKIF-Collection-App/1.0',
        'Authorization': `Discogs token=${token}`,
      },
    });

    console.log('Discogs API response status:', response.status);

    if (response.ok) {
      const userData = await response.json();
      console.log('Token verification successful');
      return NextResponse.json({ 
        valid: true, 
        user: userData 
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } else {
      const errorText = await response.text();
      console.log('Discogs API error:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: 'Invalid response from Discogs API' };
      }
      
      return NextResponse.json({ 
        valid: false, 
        error: errorData.message || 'Invalid token' 
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Network error during verification' 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}
