import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, data, accessToken } = await request.json();
    
    console.log('Google Drive proxy request:', { action, data: JSON.stringify(data), accessTokenLength: accessToken?.length });
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
    }

    let response: Response;
    
    switch (action) {
      case 'list_files':
        // Google Drive API로 JSON 파일만 검색
        const query = "name contains '.json' and mimeType != 'application/vnd.google-apps.folder'";
        const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,modifiedTime)`;
        
        response = await fetch(listUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        break;
        
      case 'download_file':
        response = await fetch(`https://www.googleapis.com/drive/v3/files/${data.fileId}?alt=media`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        break;
        
      case 'upload_file':
        // Google Drive에 파일 업로드
        const metadata = {
          name: data.fileName,
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([data.content], { type: 'application/json' }));
        
        response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: form
        });
        break;
        
      case 'update_file':
        console.log('Google Drive update_file request:', data);
        response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${data.fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: data.content
        });
        break;
        
      case 'delete_file':
        response = await fetch(`https://www.googleapis.com/drive/v3/files/${data.fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Drive API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        action: action
      });
      return NextResponse.json({ 
        error: 'Google Drive API request failed',
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
    console.error('Google Drive proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
