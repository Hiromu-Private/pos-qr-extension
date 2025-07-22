import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// デバッグ用GraphQLクエリ：ショップ情報とアクセス権限を確認
const DEBUG_SHOP_QUERY = `
  query {
    shop {
      id
      name
      email
      domain
      myshopifyDomain
      plan {
        displayName
      }
      features {
        availableChannelDefinitions {
          channelName
          handle
        }
      }
    }
    orders(first: 5) {
      edges {
        node {
          id
          name
          createdAt
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
        }
      }
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Shopify認証
    const { admin, session } = await authenticate.admin(request);
    
    console.log('🔍 デバッグ: API接続テスト開始');
    console.log('🔍 セッション情報:', {
      shop: session.shop,
      accessToken: session.accessToken ? '取得済み' : '未取得',
      scope: session.scope
    });

    // GraphQLクエリ実行
    const response = await admin.graphql(DEBUG_SHOP_QUERY);
    const result = await response.json();

    console.log('🔍 GraphQLレスポンス:', JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error('🚨 GraphQLエラー:', result.errors);
      return json({ 
        success: false,
        error: `GraphQLエラー: ${result.errors.map((e: any) => e.message).join(', ')}`,
        details: result.errors,
        session: {
          shop: session.shop,
          hasAccessToken: Boolean(session.accessToken),
          scope: session.scope
        }
      }, { status: 400 });
    }

    const { shop, orders } = result.data;
    
    console.log('✅ API接続成功');
    console.log('🏪 ショップ情報:', shop);
    console.log('📦 注文データ:', orders);

    return json({
      success: true,
      message: 'API接続とスコープが正常に動作しています',
      timestamp: new Date().toISOString(),
      session: {
        shop: session.shop,
        hasAccessToken: Boolean(session.accessToken),
        scope: session.scope
      },
      shopInfo: {
        id: shop.id,
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        myshopifyDomain: shop.myshopifyDomain,
        plan: shop.plan?.displayName
      },
      ordersData: {
        totalFound: orders.edges.length,
        hasOrders: orders.edges.length > 0,
        orders: orders.edges.map((edge: any) => ({
          id: edge.node.id,
          name: edge.node.name,
          createdAt: edge.node.createdAt,
          financialStatus: edge.node.displayFinancialStatus,
          fulfillmentStatus: edge.node.displayFulfillmentStatus,
          total: edge.node.totalPriceSet?.shopMoney?.amount || '0',
          currency: edge.node.totalPriceSet?.shopMoney?.currencyCode || 'JPY',
          customer: edge.node.customer?.displayName || 'ゲスト'
        }))
      },
      apiCapabilities: {
        canReadOrders: true,
        canReadShop: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🚨 API接続エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return json({ 
      success: false,
      error: `API接続エラー: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 