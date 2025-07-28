import { NextRequest, NextResponse } from 'next/server';
import type { GistResponse } from '@/services/gist';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareUrl = searchParams.get('url');

    if (!shareUrl) {
      return NextResponse.json(
        { error: '공유 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    let rawUrl = shareUrl;
    
    // dpaste.com URL 처리 (우선순위)
    if (shareUrl.includes('dpaste.com')) {
      rawUrl = shareUrl.endsWith('.txt') ? shareUrl : `${shareUrl}.txt`;
    }
    // JSONBin URL 처리
    else if (shareUrl.includes('jsonbin.io')) {
      const binId = shareUrl.split('/').pop();
      if (!binId) {
        return NextResponse.json(
          { error: '올바르지 않은 JSONBin URL입니다.' },
          { status: 400 }
        );
      }
      rawUrl = `https://api.jsonbin.io/v3/b/${binId}/latest`;
    }
    // JSONStorage.net URL 처리
    else if (shareUrl.includes('jsonstorage.net')) {
      rawUrl = shareUrl; // JSONStorage는 직접 액세스 가능
    }
    // JSONStore URL 처리
    else if (shareUrl.includes('jsonstore.io')) {
      rawUrl = shareUrl; // JSONStore는 직접 액세스 가능
    }
    // GitHub Gist URL 처리
    else if (shareUrl.includes('gist.github.com')) {
      const gistId = shareUrl.split('/').pop();
      if (!gistId) {
        return NextResponse.json(
          { error: '올바르지 않은 Gist URL입니다.' },
          { status: 400 }
        );
      }
      
      // Gist 정보를 가져와서 파일의 raw URL을 찾음
      const gistResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MyKallaxis-Collection-App',
        },
      });
      
      if (!gistResponse.ok) {
        return NextResponse.json(
          { error: 'Gist를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      const gistData: GistResponse = await gistResponse.json();
      const firstFile = Object.values(gistData.files)[0];
      rawUrl = firstFile.raw_url;
    }

    // Raw 데이터 가져오기
    const headers: Record<string, string> = {
      'User-Agent': 'MyKallaxis-Collection-App',
    };

    // JSONBin API의 경우만 API 키 추가
    if (rawUrl.includes('jsonbin.io')) {
      const jsonbinKey = process.env.JSONBIN_API_KEY;
      if (jsonbinKey) {
        headers['X-Master-Key'] = jsonbinKey;
      }
    }

    const response = await fetch(rawUrl, {
      headers,
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `데이터를 불러올 수 없습니다: ${response.statusText}` },
        { status: response.status }
      );
    }

    // dpaste의 경우 텍스트를 JSON으로 파싱
    let data;
    if (rawUrl.includes('dpaste.com')) {
      const textData = await response.text();
      data = JSON.parse(textData);
    } else {
      data = await response.json();
    }
    
    // JSONBin에서 온 데이터는 record 속성에 담겨있을 수 있음
    const collectionData = data.record || data;
    
    return NextResponse.json(collectionData);
  } catch (error) {
    console.error('Collection load error:', error);
    return NextResponse.json(
      { error: '컬렉션 로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
