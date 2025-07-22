import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// 注文一覧取得用GraphQLクエリ
const LIST_ORDERS_QUERY = `
  query listOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT, reverse: true) {
      edges {
        node {
          id
          legacyResourceId
          name
          email
          phone
          customer {
            displayName
            firstName
            lastName
            email
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFinancialStatus
          displayFulfillmentStatus
          processedAt
          createdAt
          updatedAt
          tags
          note
          lineItems(first: 5) {
            edges {
              node {
                title
                quantity
                variant {
                  title
                  product {
                    title
                  }
                }
              }
            }
          }
          shippingAddress {
            firstName
            lastName
            city
            province
            country
          }
          cancelledAt
          cancelReason
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Shopify認証
    const { admin, session } = await authenticate.admin(request);
    
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const after = url.searchParams.get('after') || undefined;
    const filter = url.searchParams.get('filter') || '';

    console.log('📋 注文一覧取得開始');
    console.log('🔍 セッション情報:', {
      shop: session.shop,
      hasAccessToken: Boolean(session.accessToken),
      scope: session.scope
    });
    console.log('📊 パラメータ:', { limit, after, filter });

    // フィルター条件を構築
    let query = '';
    if (filter) {
      switch (filter) {
        case 'today':
          const today = new Date().toISOString().split('T')[0];
          query = `created_at:>=${today}`;
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          query = `created_at:>=${weekAgo.toISOString().split('T')[0]}`;
          break;
        case 'pending':
          query = `fulfillment_status:unfulfilled`;
          break;
        case 'fulfilled':
          query = `fulfillment_status:fulfilled`;
          break;
        case 'paid':
          query = `financial_status:paid`;
          break;
        case 'unpaid':
          query = `financial_status:pending OR financial_status:authorized`;
          break;
        default:
          query = filter;
      }
    }

    console.log('🔍 GraphQLクエリ条件:', query);

    // GraphQLクエリ実行
    const response = await admin.graphql(LIST_ORDERS_QUERY, {
      variables: { 
        first: limit,
        after: after,
        query: query || undefined
      }
    });

    const result = await response.json();
    console.log('📊 GraphQLレスポンス状況:', {
      hasData: Boolean(result.data),
      hasErrors: Boolean(result.errors),
      hasOrders: Boolean(result.data?.orders?.edges?.length > 0),
      ordersCount: result.data?.orders?.edges?.length || 0
    });

    if (result.errors) {
      console.error('🚨 GraphQLエラー:', result.errors);
      return json({ 
        success: false,
        error: `GraphQLエラー: ${result.errors.map((e: any) => e.message).join(', ')}`,
        details: result.errors
      }, { status: 400 });
    }

    const orders = result.data?.orders;
    if (!orders) {
      return json({
        success: false,
        error: '注文データを取得できませんでした',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // 注文データを整形
    const formattedOrders = orders.edges.map((edge: any) => {
      const order = edge.node;
      return {
        id: order.id,
        legacyResourceId: order.legacyResourceId,
        name: order.name,
        customer: order.customer?.displayName || 
                 `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() ||
                 order.email || 'ゲスト顧客',
        email: order.email || order.customer?.email,
        phone: order.phone,
        totalPrice: order.totalPriceSet?.shopMoney ? {
          amount: order.totalPriceSet.shopMoney.amount,
          currency: order.totalPriceSet.shopMoney.currencyCode,
          formatted: `${order.totalPriceSet.shopMoney.currencyCode} ${parseFloat(order.totalPriceSet.shopMoney.amount).toLocaleString()}`
        } : null,
        financialStatus: order.displayFinancialStatus,
        fulfillmentStatus: order.displayFulfillmentStatus,
        processedAt: order.processedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        tags: order.tags,
        note: order.note,
        itemsPreview: order.lineItems?.edges?.slice(0, 3).map((lineEdge: any) => {
          const item = lineEdge.node;
          const variantTitle = item.variant?.title ? ` (${item.variant.title})` : '';
          return `${item.title}${variantTitle} × ${item.quantity}`;
        }) || [],
        totalItems: order.lineItems?.edges?.length || 0,
        shippingLocation: order.shippingAddress ? 
          `${order.shippingAddress.city || ''} ${order.shippingAddress.province || ''} ${order.shippingAddress.country || ''}`.trim() :
          null,
        isCancelled: Boolean(order.cancelledAt),
        cancelReason: order.cancelReason
      };
    });

    console.log('✅ 注文一覧取得成功:', {
      count: formattedOrders.length,
      hasNextPage: orders.pageInfo.hasNextPage,
      filter: filter || 'all'
    });

    return json({
      success: true,
      message: `${formattedOrders.length}件の注文を取得しました`,
      orders: formattedOrders,
      pagination: {
        hasNextPage: orders.pageInfo.hasNextPage,
        hasPreviousPage: orders.pageInfo.hasPreviousPage,
        startCursor: orders.pageInfo.startCursor,
        endCursor: orders.pageInfo.endCursor,
        currentLimit: limit,
        currentFilter: filter || 'all'
      },
      filters: {
        available: [
          { key: 'all', label: '全ての注文', active: !filter },
          { key: 'today', label: '今日の注文', active: filter === 'today' },
          { key: 'week', label: '過去7日間', active: filter === 'week' },
          { key: 'pending', label: '未配送', active: filter === 'pending' },
          { key: 'fulfilled', label: '配送済み', active: filter === 'fulfilled' },
          { key: 'paid', label: '支払い済み', active: filter === 'paid' },
          { key: 'unpaid', label: '未払い', active: filter === 'unpaid' }
        ]
      },
      metadata: {
        retrievedAt: new Date().toISOString(),
        source: 'Shopify Admin GraphQL API',
        shop: session.shop
      }
    });

  } catch (error) {
    console.error('🚨 注文一覧取得エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return json({ 
      success: false,
      error: `注文一覧取得エラー: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        steps: [
          "1. APIアクセス権限を確認してください",
          "2. ショップに注文が存在することを確認してください", 
          "3. デバッグAPIで接続状況を確認してください"
        ]
      }
    }, { status: 500 });
  }
} 