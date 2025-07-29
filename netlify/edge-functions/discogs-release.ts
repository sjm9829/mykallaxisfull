const handler = async (request: Request) => {
  console.log('Discogs Release Edge Function 호출됨');
  
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Preflight 요청 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // GET 요청만 허용
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }

  try {
    // URL에서 릴리즈 ID 추출
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const releaseId = pathSegments[pathSegments.length - 1];

    console.log('릴리즈 ID:', releaseId);

    if (!releaseId || releaseId === 'route.ts') {
      return new Response(
        JSON.stringify({ error: 'Release ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // 토큰 가져오기
    const authHeader = request.headers.get('Authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      token = url.searchParams.get('token') || undefined;
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Discogs token is required' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Discogs API 호출
    const discogsUrl = `https://api.discogs.com/releases/${releaseId}`;
    console.log('Discogs API 호출:', discogsUrl);

    const discogsResponse = await fetch(discogsUrl, {
      headers: {
        'User-Agent': 'MyKallaxisFull/1.0',
        'Authorization': `Discogs token=${token}`,
      },
    });

    console.log('Discogs API 응답 상태:', discogsResponse.status);

    if (!discogsResponse.ok) {
      const errorText = await discogsResponse.text();
      console.error('Discogs API 오류:', errorText);
      
      if (discogsResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid Discogs token' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      if (discogsResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Release not found' }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Discogs API error: ${discogsResponse.status}`,
          details: errorText 
        }),
        {
          status: discogsResponse.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const data = await discogsResponse.json();
    console.log('릴리즈 데이터 가져옴:', data.title);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Edge Function 오류:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

export default handler;
