const handler = async (request: Request) => {
  console.log('Gist Save Edge Function 호출됨');
  
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

  // POST 요청만 허용
  if (request.method !== 'POST') {
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
    const body = await request.json();
    const { albums, username, collectionName } = body;

    if (!albums || !username || !collectionName) {
      return new Response(
        JSON.stringify({ error: '필수 데이터가 누락되었습니다.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const collectionData = {
      _metadata: {
        username,
        collectionName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      albums,
    };

    console.log('컬렉션 데이터 저장 시작:', { username, collectionName, albumCount: albums.length });

    // dpaste.com을 사용하여 익명으로 데이터 저장
    const response = await fetch('https://dpaste.com/api/v2/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        content: JSON.stringify(collectionData),
        syntax: 'json',
        expiry_days: '365', // 1년 보관
      }),
    });

    console.log('Dpaste API 응답 상태:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Dpaste API Error:', response.status, errorData);
      return new Response(
        JSON.stringify({ error: `컬렉션 공유에 실패했습니다: ${response.statusText}` }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const pasteUrl = await response.text(); // dpaste는 URL을 텍스트로 반환
    
    // dpaste URL에서 ID 추출
    const pasteId = pasteUrl.trim().split('/').pop();
    
    console.log('Dpaste 생성 완료:', { pasteId, pasteUrl: pasteUrl.trim() });
    
    // dpaste 형식을 Gist 형식과 호환되도록 변환
    const gistCompatibleResponse = {
      id: pasteId,
      html_url: pasteUrl.trim(),
      files: {
        [`${collectionName}.json`]: {
          raw_url: `${pasteUrl.trim()}.txt`, // raw 형식 URL
        },
      },
    };

    return new Response(JSON.stringify(gistCompatibleResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Collection sharing error:', error);
    return new Response(
      JSON.stringify({ 
        error: '컬렉션 공유 중 오류가 발생했습니다.',
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
