const handler = async (request: Request) => {
  console.log('Discogs Search Edge Function 호출됨');
  
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
    // URL에서 쿼리 파라미터 추출
    const url = new URL(request.url);
    const artist = url.searchParams.get('artist') || '';
    const title = url.searchParams.get('title') || '';
    const format = url.searchParams.get('format') || '';

    console.log('검색 파라미터:', { artist, title, format });

    // 검색어가 없으면 에러
    if (!artist && !title) {
      return new Response(
        JSON.stringify({ error: 'Artist or title is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // 환경 변수에서 토큰 가져오기 (서버 측에서는 사용하지 않음)
    // 클라이언트에서 토큰을 헤더로 전달해야 함
    const authHeader = request.headers.get('Authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      // Authorization 헤더가 없다면 쿼리 파라미터에서 확인
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

    // Discogs API 검색 쿼리 구성
    const searchQuery = [artist, title].filter(Boolean).join(' ');
    let discogsUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(searchQuery)}&type=release`;
    
    if (format) {
      discogsUrl += `&format=${encodeURIComponent(format)}`;
    }

    console.log('Discogs API 호출:', discogsUrl);

    // Discogs API 호출
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
    console.log('검색 결과 수:', data.results?.length || 0);

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
