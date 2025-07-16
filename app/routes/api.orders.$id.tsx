import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// GraphQLクエリ：注文データ取得（拡張版）
const GET_ORDER_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) {
      id
      name
      email
      phone
      customer {
        displayName
        firstName
        lastName
        email
      }
      totalPrice {
        amount
        currencyCode
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
    const { admin } = await authenticate.admin(request);
    
    const orderId = params.id;
    if (!orderId) {
      return json({ error: "注文IDが指定されていません" }, { status: 400 });
    }

    console.log('注文データ取得API呼び出し - 注文ID:', orderId);

    // GraphQL IDフォーマットに変換
    const gqlOrderId = orderId.startsWith('gid://') 
      ? orderId 
      : `gid://shopify/Order/${orderId}`;

    console.log('GraphQL注文ID:', gqlOrderId);

    // GraphQLクエリ実行
    const response = await admin.graphql(GET_ORDER_QUERY, {
      variables: { id: gqlOrderId }
    });

    const result = await response.json();
    console.log('GraphQLレスポンス:', JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error('GraphQLエラー:', result.errors);
      return json({ 
        error: `GraphQLエラー: ${result.errors.map((e: any) => e.message).join(', ')}` 
      }, { status: 400 });
    }

    if (!result.data?.order) {
      console.log('注文が見つかりません:', orderId);
      return json({ 
        error: `注文ID ${orderId} に該当する注文が見つかりません` 
      }, { status: 404 });
    }

    const order = result.data.order;
    console.log('取得した注文データ:', order);

    return json({ 
      order,
      message: 'API経由で注文データを正常に取得しました'
    });

  } catch (error) {
    console.error('注文データ取得APIエラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return json({ 
      error: `注文データ取得エラー: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 