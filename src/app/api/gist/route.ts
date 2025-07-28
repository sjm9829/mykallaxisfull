import { NextRequest, NextResponse } from 'next/server';
import type { CollectionData } from '@/services/gist';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { albums, username, collectionName } = body;

    if (!albums || !username || !collectionName) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const collectionData: CollectionData = {
      _metadata: {
        username,
        collectionName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      albums,
    };

    // 대안: dpaste.com을 사용하여 익명으로 데이터 저장
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Dpaste API Error:', response.status, errorData);
      return NextResponse.json(
        { error: `컬렉션 공유에 실패했습니다: ${response.statusText}` },
        { status: response.status }
      );
    }

    const pasteUrl = await response.text(); // dpaste는 URL을 텍스트로 반환
    
    // dpaste URL에서 ID 추출
    const pasteId = pasteUrl.trim().split('/').pop();
    
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

    return NextResponse.json(gistCompatibleResponse);
  } catch (error) {
    console.error('Collection sharing error:', error);
    return NextResponse.json(
      { error: '컬렉션 공유 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
