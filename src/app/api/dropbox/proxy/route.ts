import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, data, accessToken } = await request.json();
    
    console.log('Dropbox proxy request:', { action, data: JSON.stringify(data), accessTokenLength: accessToken?.length });
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
    }

    let response;
    
    switch (action) {
      case 'list_files':
        const listPath = data.path === '/' ? '' : (data.path || '');
        const listBody = {
          path: listPath,
          recursive: false
        };
        console.log('Dropbox list_folder request body:', listBody);
        
        response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(listBody)
        });
        break;
        
      case 'download_file':
        const downloadPath = data.path;
        console.log('Download file path:', downloadPath);
        
        // 한글 파일명 문제 해결을 위해 URL 인코딩 후 디코딩
        try {
          const pathForApi = downloadPath;
          console.log('Path for API:', pathForApi);
          
          // Dropbox API 호출 시 헤더에 한글이 포함된 경우의 처리
          const dropboxApiArg = JSON.stringify({ path: pathForApi });
          
          // Latin-1 charset으로 안전하게 변환
          const safeApiArg = Buffer.from(dropboxApiArg, 'utf8').toString('latin1');
          
          console.log('Safe API arg:', safeApiArg);
          
          response = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Dropbox-API-Arg': safeApiArg
            }
          });

          if (response.ok) {
            const content = await response.text();
            // 파일명 추출 (경로에서 파일명만 가져오기)
            const fileName = downloadPath.split('/').pop() || 'collection.json';
            
            return NextResponse.json({ 
              content,
              fileName: fileName,
              contentType: 'application/json'
            }, {
              headers: {
                'Content-Disposition': `inline; filename="${fileName}"`,
                'X-Content-Type-Options': 'nosniff',
                'Content-Type': 'application/json'
              }
            });
          }
        } catch (error) {
          console.error('Download file error:', error);
          // 영문으로 된 임시 파일명으로 테스트 제안
          throw new Error('한글 파일명으로 인한 다운로드 오류. 영문 파일명을 사용해주세요.');
        }
        break;
        
      case 'upload_file':
        response = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({
              path: data.path,
              mode: data.mode || 'add'
            }),
            'Content-Type': 'application/octet-stream'
          },
          body: data.content
        });
        break;
        
      case 'delete_file':
        response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: data.path
          })
        });
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dropbox API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        action: action
      });
      return NextResponse.json({ 
        error: 'Dropbox API request failed',
        details: errorText,
        status: response.status
      }, { status: response.status });
    }

    // For download_file, return text content
    if (action === 'download_file') {
      const content = await response.text();
      return NextResponse.json({ content });
    }

    // For other actions, return JSON
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Dropbox proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
