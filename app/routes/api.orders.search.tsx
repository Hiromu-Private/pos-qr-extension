import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// 注文検索用GraphQLクエリ
const SEARCH_ORDERS_QUERY = `
  query searchOrders($query: String!, $first: Int!) {
    orders(first: $first, query: $query) {
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
          displayFinancialStatus
          displayFulfillmentStatus
          processedAt
          createdAt
          updatedAt
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
          lineItems(first: 20) {
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
          cancelledAt
          cancelReason
          closedAt
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

// 単一注文取得用GraphQLクエリ
const GET_ORDER_BY_ID_QUERY = `
  query getOrderById($id: ID!) {
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
      displayFinancialStatus
      displayFulfillmentStatus
      processedAt
      createdAt
      updatedAt
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
      lineItems(first: 20) {
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
      cancelledAt
      cancelReason
      closedAt
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Shopify認証
    const { admin, session } = await authenticate.admin(request);
    
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('q') || '';
    const searchType = url.searchParams.get('type') || 'auto';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

    if (!searchTerm.trim()) {
      return json({ error: "検索クエリが指定されていません" }, { status: 400 });
    }

    console.log('✅ 注文検索認証成功:', { shop: session.shop });
    console.log('🔍 注文検索開始:', { searchTerm, searchType, limit });

    let result;
    let searchResults = [];

    // 検索タイプに応じて検索方法を決定
    if (searchType === 'id' || (searchType === 'auto' && /^\d+$/.test(searchTerm))) {
      // ID検索 (数値のみの場合)
      console.log('📍 ID検索を実行:', searchTerm);
      
      const gqlOrderId = searchTerm.startsWith('gid://') 
        ? searchTerm 
        : `gid://shopify/Order/${searchTerm}`;

      const response = await admin.graphql(GET_ORDER_BY_ID_QUERY, {
        variables: { id: gqlOrderId }
      });

      result = await response.json();
      
      if (result.data?.order) {
        searchResults = [result.data.order];
      }
    } else {
      // 汎用検索（注文番号、顧客名、メールなど）
      let query = '';
      
      if (searchType === 'name' || searchType === 'auto') {
        // 注文番号で検索
        if (searchTerm.startsWith('#')) {
          query = `name:${searchTerm}`;
        } else if (searchTerm.match(/^\d+$/)) {
          query = `name:#${searchTerm}`;
        } else {
          query = `name:*${searchTerm}*`;
        }
      } else if (searchType === 'email') {
        // メールアドレスで検索
        query = `email:${searchTerm}`;
      } else if (searchType === 'customer') {
        // 顧客名で検索
        query = `customer.first_name:*${searchTerm}* OR customer.last_name:*${searchTerm}* OR customer.email:*${searchTerm}*`;
      } else if (searchType === 'phone') {
        // 電話番号で検索
        query = `phone:*${searchTerm}*`;
      } else {
        // 自動検索：様々な条件で検索
        if (searchTerm.includes('@')) {
          query = `email:${searchTerm}`;
        } else if (searchTerm.startsWith('#')) {
          query = `name:${searchTerm}`;
        } else if (/^\d+$/.test(searchTerm)) {
          query = `name:#${searchTerm}`;
        } else {
          query = `name:*${searchTerm}* OR customer.first_name:*${searchTerm}* OR customer.last_name:*${searchTerm}* OR customer.email:*${searchTerm}*`;
        }
      }

      console.log('📍 GraphQL検索クエリ:', query);

      const response = await admin.graphql(SEARCH_ORDERS_QUERY, {
        variables: { 
          query: query,
          first: limit
        }
      });

      result = await response.json();
      
      if (result.data?.orders?.edges) {
        searchResults = result.data.orders.edges.map((edge: any) => edge.node);
      }
    }

    console.log('📊 検索結果:', `${searchResults.length}件の注文が見つかりました`);

    if (result.errors) {
      console.error('🚨 GraphQLエラー:', result.errors);
      return json({ 
        error: `GraphQLエラー: ${result.errors.map((e: any) => e.message).join(', ')}`,
        details: result.errors
      }, { status: 400 });
    }

    if (searchResults.length === 0) {
      return json({ 
        message: `検索条件「${searchTerm}」に該当する注文が見つかりませんでした`,
        searchTerm,
        searchType,
        totalFound: 0,
        orders: []
      });
    }

    // 結果を整形
    const formattedOrders = searchResults.map((order: any) => ({
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
      createdAt: order.createdAt,
      processedAt: order.processedAt,
      updatedAt: order.updatedAt,
      tags: order.tags,
      note: order.note,
      itemsCount: order.lineItems?.edges?.length || 0,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      lineItems: order.lineItems?.edges?.map((edge: any) => edge.node) || [],
      fulfillments: order.fulfillments || [],
      transactions: order.transactions || []
    }));

    return json({
      success: true,
      message: `${searchResults.length}件の注文が見つかりました`,
      searchTerm,
      searchType,
      totalFound: searchResults.length,
      orders: formattedOrders,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🚨 注文検索エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return json({ 
      error: `注文検索エラー: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 