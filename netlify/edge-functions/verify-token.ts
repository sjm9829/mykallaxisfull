const verifyToken = async (request: Request) => {
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
      headers: corsHeaders,
    });
  }

  // POST 요청만 허용
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.text();
    console.log('🔍 Token verification request received');
    console.log('📝 Raw request body:', body);

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token } = parsedBody;
    console.log('🎯 Extracted token length:', token ? token.length : 0);

    if (!token) {
      console.log('❌ No token provided');
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Token verification successful for user:', userData.username);
      return new Response(JSON.stringify({ 
        valid: true, 
        user: userData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      
      return new Response(JSON.stringify({ 
        valid: false, 
        error: errorData.message || 'Invalid token' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('💥 Token verification error:', error);
    
    return new Response(JSON.stringify({ 
      valid: false, 
      error: 'Network error during verification' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

export default verifyToken;
