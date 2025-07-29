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
  console.log('🔍 Token verification request received');
  
  try {
    const body = await request.text();
    console.log('📝 Raw request body:', body);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    const { token } = parsedBody;
    console.log('🎯 Extracted token length:', token ? token.length : 0);
    
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Token is required' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    console.log('🔍 Verifying Discogs token...');

    // Discogs API를 통해 토큰 검증
    const response = await fetch('https://api.discogs.com/oauth/identity', {
      headers: {
        'User-Agent': 'MKIF-Collection-App/1.0',
        'Authorization': `Discogs token=${token}`,
      },
    });

    console.log('📡 Discogs API response status:', response.status);
    console.log('📡 Discogs API response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Token verification successful for user:', userData.username);
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
      console.log('❌ Discogs API error response:', errorText);
      
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
    console.error('💥 Token verification error:', error);
    
    // 에러 타입에 따른 구체적인 로깅
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 Network error: Failed to reach Discogs API');
    } else if (error instanceof SyntaxError) {
      console.error('📝 JSON parsing error');
    }
    
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
