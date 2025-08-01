export default async (request: Request, context: any) => {
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

  console.log('🔍 Dropbox proxy request started');

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

    let response;
    let result;

    switch (action) {
      case 'list_files':
        console.log('🔍 Listing files with path:', data.path || '');
        response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: data.path || '',
            recursive: false,
            include_media_info: false,
            include_deleted: false,
            include_has_explicit_shared_members: false,
            include_mounted_folders: true,
            limit: 2000
          }),
        });
        break;

      case 'download_file':
        console.log('🔍 Downloading file:', data.path);
        response = await fetch('https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({ path: data.path }),
          },
        });

        if (response.ok) {
          const content = await response.text();
          return new Response(JSON.stringify({ content }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        break;

      case 'upload_file':
        console.log('🔍 Uploading file:', data.path);
        response = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: data.path,
              mode: data.mode || 'add',
              autorename: true
            }),
          },
          body: data.content,
        });
        break;

      case 'delete_file':
        console.log('🔍 Deleting file:', data.path);
        response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: data.path }),
        });
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log('🔍 Dropbox API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Dropbox API error:', errorText);
      return new Response(JSON.stringify({
        error: 'Dropbox API request failed',
        details: errorText,
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // download_file은 이미 위에서 처리됨
    if (action !== 'download_file') {
      result = await response.json();
      console.log('🔍 Dropbox API success');
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🔍 Dropbox proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
