import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log('🔍 カスタムGraphQLテスト開始');
    
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const query = formData.get('query') as string;

    if (!query) {
      return json({
        success: false,
        error: 'GraphQLクエリが提供されていません',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('📡 実行するGraphQLクエリ:', query);

    const startTime = Date.now();
    const response = await admin.graphql(query);
    const result = await response.json();
    const responseTime = Date.now() - startTime;

    console.log('📊 GraphQLレスポンス:', {
      status: response.status,
      hasData: Boolean(result.data),
      hasErrors: Boolean(result.errors),
      responseTime
    });

    return json({
      success: !result.errors,
      query: query,
      response: {
        status: response.status,
        data: result.data,
        errors: result.errors,
        extensions: result.extensions
      },
      session: {
        shop: session.shop,
        scope: session.scope
      },
      responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🚨 GraphQLテストエラー:', error);
    
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

export async function loader({ request }: LoaderFunctionArgs) {
  // GETリクエストの場合は基本的な使用方法を返す
  return json({
    message: 'このエンドポイントはPOSTリクエストでGraphQLクエリをテストします',
    usage: {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      fields: {
        query: 'GraphQLクエリ文字列'
      }
    },
    examples: [
      {
        name: '店舗情報取得',
        query: `query {
  shop {
    id
    name
    email
    domain
  }
}`
      },
      {
        name: '注文一覧取得',
        query: `query {
  orders(first: 5) {
    edges {
      node {
        id
        name
        createdAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
      }
    }
  }
}`
      }
    ],
    timestamp: new Date().toISOString()
  });
} 