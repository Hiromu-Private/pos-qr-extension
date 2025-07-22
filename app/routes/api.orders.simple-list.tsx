import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// 最もシンプルな注文一覧取得クエリ
const SIMPLE_ORDERS_QUERY = `
  query simpleOrders($first: Int!) {
    orders(first: $first) {
      edges {
        node {
          id
          name
          createdAt
        }
      }
    }
  }
`;

// 基本情報付きの注文一覧取得クエリ
const BASIC_ORDERS_QUERY = `
  query basicOrders($first: Int!) {
    orders(first: $first) {
      edges {
        node {
          id
          legacyResourceId
          name
          email
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            displayName
          }
          createdAt
        }
      }
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log('🔍 シンプル注文一覧API開始');
    
    const { admin, session } = await authenticate.admin(request);
    console.log('✅ 認証成功:', { shop: session.shop });
    
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'simple'; // simple, basic
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 10);
    
    console.log('📋 リクエストパラメータ:', { mode, limit });

    let query = SIMPLE_ORDERS_QUERY;
    let queryLabel = 'シンプルクエリ';
    
    if (mode === 'basic') {
      query = BASIC_ORDERS_QUERY;
      queryLabel = '基本クエリ';
    }
    
    console.log(`🔎 ${queryLabel}実行開始`);
    
    // GraphQLクエリ実行
    const startTime = Date.now();
    const response = await admin.graphql(query, {
      variables: { first: limit }
    });
    const responseTime = Date.now() - startTime;
    
    console.log('📡 GraphQL応答:', {
      status: response.status,
      responseTime: `${responseTime}ms`
    });

    if (!response.ok) {
      console.error('🚨 GraphQL HTTPエラー:', response.status, response.statusText);
      return json({
        success: false,
        error: `GraphQL HTTPエラー: ${response.status} ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText
        },
        mode,
        responseTime,
        timestamp: new Date().toISOString()
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('📊 GraphQL結果:', {
      hasData: Boolean(result.data),
      hasErrors: Boolean(result.errors),
      hasOrders: Boolean(result.data?.orders?.edges?.length > 0),
      ordersCount: result.data?.orders?.edges?.length || 0
    });

    if (result.errors) {
      console.error('🚨 GraphQLクエリエラー:', result.errors);
      return json({
        success: false,
        error: 'GraphQLクエリエラー',
        details: {
          errors: result.errors,
          extensions: result.extensions
        },
        query: queryLabel,
        mode,
        responseTime,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!result.data?.orders?.edges) {
      console.warn('⚠️ 注文データが空です');
      return json({
        success: false,
        error: '注文データが取得できませんでした',
        details: {
          data: result.data,
          hasShop: Boolean(session.shop)
        },
        query: queryLabel,
        mode,
        responseTime,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const orders = result.data.orders.edges;
    console.log(`✅ 注文一覧取得成功: ${orders.length}件`);

    // 注文データの整形
    const formattedOrders = orders.map((edge: any) => {
      const order = edge.node;
      const formatted: any = {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt
      };

      // 基本モードの場合は追加情報も含める
      if (mode === 'basic') {
        formatted.legacyResourceId = order.legacyResourceId;
        formatted.email = order.email;
        formatted.customer = order.customer?.displayName || 'ゲスト顧客';
        formatted.totalPrice = {
          amount: order.totalPriceSet?.shopMoney?.amount || '0',
          currencyCode: order.totalPriceSet?.shopMoney?.currencyCode || 'JPY',
          formatted: `${order.totalPriceSet?.shopMoney?.currencyCode || 'JPY'} ${order.totalPriceSet?.shopMoney?.amount || '0'}`
        };
        formatted.financialStatus = order.displayFinancialStatus;
        formatted.fulfillmentStatus = order.displayFulfillmentStatus;
      }

      return formatted;
    });

    return json({
      success: true,
      orders: formattedOrders,
      pagination: {
        hasNextPage: result.data.orders.pageInfo?.hasNextPage || false,
        hasPreviousPage: result.data.orders.pageInfo?.hasPreviousPage || false,
        endCursor: result.data.orders.pageInfo?.endCursor
      },
      metadata: {
        query: queryLabel,
        mode,
        count: formattedOrders.length,
        responseTime,
        retrievedAt: new Date().toISOString(),
        shop: session.shop
      }
    });

  } catch (error) {
    console.error('🚨 シンプル注文一覧API重大エラー:', error);
    
    const errorDetails = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : '不明なエラー',
      stack: error instanceof Error ? error.stack : undefined
    };

    return json({
      success: false,
      error: `API実行エラー: ${errorDetails.message}`,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        steps: [
          "1. ショップにアクセス権限があることを確認",
          "2. 'read_orders' スコープが設定されていることを確認", 
          "3. ショップに注文が存在することを確認",
          "4. 基本APIテスト(/api/basic)で接続確認"
        ],
        testUrls: [
          "/api/orders/simple-list?mode=simple&limit=1",
          "/api/orders/simple-list?mode=basic&limit=3",
          "/api/basic",
          "/api/debug"
        ]
      }
    }, { status: 500 });
  }
} 