import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log('🧪 基本テストAPI呼び出し');
    console.log('🌐 リクエストURL:', request.url);
    console.log('🔗 リクエストヘッダー:', Object.fromEntries(request.headers.entries()));

    return json({
      success: true,
      message: '基本API接続が正常に動作しています',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        shopifyApiKey: process.env.SHOPIFY_API_KEY ? '設定済み' : '未設定',
        shopifyApiSecret: process.env.SHOPIFY_API_SECRET ? '設定済み' : '未設定',
        shopifyAppUrl: process.env.SHOPIFY_APP_URL || '未設定',
        scopes: process.env.SCOPES || '未設定'
      },
      request: {
        url: request.url,
        method: request.method,
        hasAuthHeaders: request.headers.has('authorization')
      }
    });

  } catch (error) {
    console.error('🚨 基本テストAPIエラー:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : { error: '詳細不明' },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 