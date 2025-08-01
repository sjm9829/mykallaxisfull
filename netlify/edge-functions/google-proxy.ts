const handler = async (request: Request) => {
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
      headers: corsHeaders
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('🔍 Google Drive proxy request started');

  try {
    const body = await request.json();
    const { action, data, accessToken } = body;

    console.log('🔍 Action:', action);
    console.log('🔍 Access token:', accessToken ? 'Present' : 'Missing');

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Access token is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let response: Response;

    switch (action) {
      case 'list_files':
        console.log('🔍 Listing Google Drive files');
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
        console.log('🔍 Downloading file from Google Drive:', data.fileId);
        response = await fetch(`https://www.googleapis.com/drive/v3/files/${data.fileId}?alt=media`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        break;

      case 'upload_file':
        console.log('🔍 Uploading file to Google Drive:', data.fileName);
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
        console.log('🔍 Updating file in Google Drive:', data.fileId);
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
        console.log('🔍 Deleting file from Google Drive:', data.fileId);
        response = await fetch(`https://www.googleapis.com/drive/v3/files/${data.fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Google Drive API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        action: action
      });
      return new Response(JSON.stringify({ 
        error: 'Google Drive API request failed',
        details: errorText,
        status: response.status
      }), { 
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For download_file, return text content
    if (action === 'download_file') {
      const content = await response.text();
      return new Response(JSON.stringify({ content }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For other actions, return JSON
    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('🔍 Google Drive proxy error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

export default handler;
