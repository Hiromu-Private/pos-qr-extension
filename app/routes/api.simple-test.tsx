import { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log('🧪 シンプルテスト開始');
    
    const response = {
      success: true,
      message: 'シンプルAPIテストが成功しました',
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method
    };

    console.log('✅ シンプルテスト成功:', response);

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('🚨 シンプルテストエラー:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 