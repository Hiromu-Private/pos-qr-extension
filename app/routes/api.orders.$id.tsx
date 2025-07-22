import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// GraphQLクエリ：注文データ取得（拡張版）
const GET_ORDER_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) {
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
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalShippingPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      displayFulfillmentStatus
      displayFinancialStatus
      processedAt
      tags
      note
      shippingAddress {
        firstName
        lastName
        company
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      billingAddress {
        firstName
        lastName
        company
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      lineItems(first: 50) {
        edges {
          node {
            title
            quantity
            variant {
              title
              sku
              price {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
              product {
                title
                handle
              }
            }
            discountedTotalSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
      fulfillments(first: 10) {
        trackingInfo {
          number
          url
        }
        status
        createdAt
        updatedAt
      }
      transactions(first: 10) {
        status
        kind
        amount {
          amount
          currencyCode
        }
        gateway
        createdAt
      }
      createdAt
      updatedAt
      cancelledAt
      cancelReason
      closedAt
    }
  }
`;

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Shopify認証
    const { admin, session } = await authenticate.admin(request);
    
    const orderId = params.id;
    if (!orderId) {
      console.log('❌ 注文IDが指定されていません');
      return json({ 
        success: false,
        error: "注文IDが指定されていません" 
      }, { status: 400 });
    }

    console.log('📡 注文データ取得API呼び出し開始');
    console.log('🔍 セッション情報:', {
      shop: session.shop,
      hasAccessToken: Boolean(session.accessToken),
      scope: session.scope
    });
    console.log('🎯 注文ID:', orderId);

    // GraphQL IDフォーマットに変換
    const gqlOrderId = orderId.startsWith('gid://') 
      ? orderId 
      : `gid://shopify/Order/${orderId}`;

    console.log('🔗 GraphQL注文ID:', gqlOrderId);

    // GraphQLクエリ実行
    const response = await admin.graphql(GET_ORDER_QUERY, {
      variables: { id: gqlOrderId }
    });

    const result = await response.json();
    console.log('📊 GraphQLレスポンス状況:', {
      hasData: Boolean(result.data),
      hasErrors: Boolean(result.errors),
      hasOrder: Boolean(result.data?.order)
    });

    if (result.errors) {
      console.error('🚨 GraphQLエラー詳細:', result.errors);
      return json({ 
        success: false,
        error: `GraphQLエラー: ${result.errors.map((e: any) => e.message).join(', ')}`,
        details: result.errors,
        searchedId: orderId,
        gqlId: gqlOrderId
      }, { status: 400 });
    }

    if (!result.data?.order) {
      console.log('📭 注文が見つかりません:', orderId);
      
      // 可能性のあるIDフォーマットを提案
      const suggestions = [];
      if (!orderId.startsWith('gid://')) {
        suggestions.push(`gid://shopify/Order/${orderId}`);
      }
      if (!orderId.startsWith('#')) {
        suggestions.push(`#${orderId}`);
      }
      
      return json({ 
        success: false,
        error: `注文ID ${orderId} に該当する注文が見つかりません`,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        searchedId: orderId,
        gqlId: gqlOrderId,
        tip: "注文番号ではなく、注文IDを使用してください。注文一覧から正確なIDを確認できます。"
      }, { status: 404 });
    }

    const order = result.data.order;
    console.log('✅ 注文データ取得成功:', {
      id: order.id,
      legacyId: order.legacyResourceId,
      name: order.name,
      customer: order.customer?.displayName,
      total: order.totalPriceSet?.shopMoney?.amount,
      status: order.displayFulfillmentStatus
    });

    // レスポンスデータを整形
    const formattedOrder = {
      id: order.id,
      legacyResourceId: order.legacyResourceId,
      name: order.name,
      email: order.email,
      phone: order.phone,
      customer: order.customer,
      totalPriceSet: order.totalPriceSet,
      subtotalPriceSet: order.subtotalPriceSet,
      totalTaxSet: order.totalTaxSet,
      totalShippingPriceSet: order.totalShippingPriceSet,
      displayFinancialStatus: order.displayFinancialStatus,
      displayFulfillmentStatus: order.displayFulfillmentStatus,
      processedAt: order.processedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      tags: order.tags,
      note: order.note,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      lineItems: order.lineItems,
      fulfillments: order.fulfillments,
      transactions: order.transactions,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      closedAt: order.closedAt
    };

    return json({ 
      success: true,
      message: 'API経由で注文データを正常に取得しました',
      order: formattedOrder,
      metadata: {
        searchedId: orderId,
        gqlId: gqlOrderId,
        retrievedAt: new Date().toISOString(),
        source: 'Shopify Admin GraphQL API'
      }
    });

  } catch (error) {
    console.error('🚨 注文データ取得API重大エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : { message: '不明なエラーが発生しました' };
    
    return json({ 
      success: false,
      error: `注文データ取得エラー: ${errorMessage}`,
      details: errorDetails,
      searchedId: params.id,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        steps: [
          "1. ショップにアクセス権限があることを確認",
          "2. 注文IDが正しい形式であることを確認",
          "3. 注文が存在し、削除されていないことを確認",
          "4. APIアクセストークンの有効性を確認"
        ],
        contact: "問題が続く場合は、デバッグAPIエンドポイント(/api/debug)で詳細情報を確認してください"
      }
    }, { status: 500 });
  }
} 