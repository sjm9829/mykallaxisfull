/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface RouteContext {
  params: {
    id: string;
  };
}

export const GET = (async (request: NextRequest, context: RouteContext) => {
  const { id: releaseId } = await context.params;

  if (!releaseId) {
    return NextResponse.json({ error: 'Release ID is required' }, { status: 400 });
  }

  const personalAccessToken = request.headers.get('x-discogs-personal-access-token');

  let authHeader = '';
  if (personalAccessToken) {
    authHeader = `Discogs token=${personalAccessToken}`;
  } else {
    const DISCOGS_API_KEY = process.env.DISCOGS_API_KEY;
    const DISCOGS_API_SECRET = process.env.DISCOGS_API_SECRET;

    if (!DISCOGS_API_KEY || !DISCOGS_API_SECRET) {
      return NextResponse.json(
        { error: 'Discogs API credentials are not set up on the server.' },
        { status: 500 }
      );
    }
    authHeader = `Discogs key=${DISCOGS_API_KEY}, secret=${DISCOGS_API_SECRET}`;
  }

  const discogsReleaseUrl = `https://api.discogs.com/releases/${releaseId}`;

  try {
    const response = await fetch(discogsReleaseUrl, {
      headers: {
        Authorization: authHeader,
        'User-Agent': 'MKIF-Collection-App/0.1',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Discogs API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch data from Discogs' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}) as any;