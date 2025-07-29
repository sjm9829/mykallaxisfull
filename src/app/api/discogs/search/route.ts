import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-discogs-personal-access-token',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');
  const format = searchParams.get('format');

  // 아티스트와 타이틀 중 하나라도 없으면 400 에러 반환
  if (!artist && !title) {
    return NextResponse.json({ error: 'Artist or title is required' }, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-discogs-personal-access-token',
      }
    });
  }

  const personalAccessToken = request.headers.get('x-discogs-personal-access-token');

  let authHeader = '';
  if (personalAccessToken) {
    authHeader = `Discogs token=${personalAccessToken}`;
  } else {
    const DISCOGS_API_KEY = process.env.DISCOGS_API_KEY;
    const DISCOGS_API_SECRET = process.env.DISCOGS_API_SECRET;

    if (!DISCOGS_API_KEY || !DISCOGS_API_SECRET) {
      return NextResponse.json({ error: 'Discogs API credentials are not set up on the server.' }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-discogs-personal-access-token',
        }
      });
    }
    authHeader = `Discogs key=${DISCOGS_API_KEY}, secret=${DISCOGS_API_SECRET}`;
  }
  
  const discogsSearchUrl = new URL('https://api.discogs.com/database/search');
  
  // 아티스트와 타이틀을 조합하여 'q' 파라미터로 전달
  let query = '';
  if (artist) {
    query += artist;
  }
  if (title) {
    query += (query ? ' ' : '') + title; // 아티스트가 있으면 공백 추가
  }
  discogsSearchUrl.searchParams.append('q', query);

  discogsSearchUrl.searchParams.append('type', 'release');
  if (format) {
    discogsSearchUrl.searchParams.append('format', format);
  }

  try {
    const response = await fetch(discogsSearchUrl.toString(), {
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'MKIF-Collection-App/1.0',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Discogs API Error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch data from Discogs' }, { 
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-discogs-personal-access-token',
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-discogs-personal-access-token',
      }
    });
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-discogs-personal-access-token',
      }
    });
  }
}
