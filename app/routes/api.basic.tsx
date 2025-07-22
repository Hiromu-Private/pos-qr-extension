// Remixのインポートを最小限に抑制
export async function loader({ request }: { request: Request }) {
  try {
    console.log('🔥 基本テスト開始');
    
    const data = {
      success: true,
      message: 'Basicテストが成功しました',
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    };

    console.log('✅ 基本テスト成功:', data);

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('🚨 基本テストエラー:', error);
    
    const errorData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorData, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
} 