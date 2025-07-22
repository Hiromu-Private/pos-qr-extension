import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// 最小限のテストクエリ
const BASIC_SHOP_QUERY = `
  query {
    shop {
      id
      name
      myshopifyDomain
    }
  }
`;

// アプリ情報取得クエリ
const APP_INFO_QUERY = `
  query {
    app {
      id
      handle
    }
  }
`;

// 基本的な顧客データアクセステスト
const SIMPLE_CUSTOMERS_QUERY = `
  query {
    customers(first: 1) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

// 最もシンプルな注文クエリ
const MINIMAL_ORDERS_QUERY = `
  query {
    orders(first: 1) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log('🔍 アクセス権限詳細テスト開始');
    
    const { admin, session } = await authenticate.admin(request);
    console.log('✅ 認証成功:', { 
      shop: session.shop,
      scope: session.scope,
      isOnline: session.isOnline
    });

    const testResults: any = {
      session: {
        shop: session.shop,
        scope: session.scope,
        isOnline: session.isOnline,
        hasAccessToken: Boolean(session.accessToken)
      },
      tests: {},
      timestamp: new Date().toISOString()
    };

    // テスト1: 基本的なShop情報
    try {
      console.log('🏪 基本Shop情報テスト開始');
      const shopResponse = await admin.graphql(BASIC_SHOP_QUERY);
      const shopResult = await shopResponse.json();
      
      testResults.tests.basicShop = {
        success: !shopResult.errors && Boolean(shopResult.data?.shop),
        status: shopResponse.status,
        errors: shopResult.errors || null,
        data: shopResult.data || null
      };
      
      console.log('🏪 基本Shop情報結果:', testResults.tests.basicShop);
    } catch (error) {
      testResults.tests.basicShop = {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }

    // テスト2: アプリ情報取得
    try {
      console.log('📱 アプリ情報テスト開始');
      const appResponse = await admin.graphql(APP_INFO_QUERY);
      const appResult = await appResponse.json();
      
      testResults.tests.appInfo = {
        success: !appResult.errors && Boolean(appResult.data?.app),
        status: appResponse.status,
        errors: appResult.errors || null,
        data: appResult.data || null
      };
      
      console.log('📱 アプリ情報結果:', testResults.tests.appInfo);
    } catch (error) {
      testResults.tests.appInfo = {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }

    // テスト3: 顧客データアクセステスト
    try {
      console.log('👥 顧客データアクセステスト開始');
      const customersResponse = await admin.graphql(SIMPLE_CUSTOMERS_QUERY);
      const customersResult = await customersResponse.json();
      
      testResults.tests.customers = {
        success: !customersResult.errors,
        status: customersResponse.status,
        errors: customersResult.errors || null,
        hasData: Boolean(customersResult.data?.customers?.edges?.length > 0),
        count: customersResult.data?.customers?.edges?.length || 0
      };
      
      console.log('👥 顧客データ結果:', testResults.tests.customers);
    } catch (error) {
      testResults.tests.customers = {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }

    // テスト4: 注文データアクセステスト（最小限）
    try {
      console.log('📦 注文データアクセステスト開始');
      const ordersResponse = await admin.graphql(MINIMAL_ORDERS_QUERY);
      const ordersResult = await ordersResponse.json();
      
      testResults.tests.orders = {
        success: !ordersResult.errors,
        status: ordersResponse.status,
        errors: ordersResult.errors || null,
        hasData: Boolean(ordersResult.data?.orders?.edges?.length > 0),
        count: ordersResult.data?.orders?.edges?.length || 0
      };
      
      console.log('📦 注文データ結果:', testResults.tests.orders);
    } catch (error) {
      testResults.tests.orders = {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }

    // アクセス権限分析
    testResults.analysis = {
      canAccessShop: testResults.tests.basicShop?.success || false,
      canAccessApp: testResults.tests.appInfo?.success || false,
      canAccessCustomers: testResults.tests.customers?.success || false,
      canAccessOrders: testResults.tests.orders?.success || false,
      overallStatus: 'unknown'
    };

    // 総合ステータス判定
    if (testResults.analysis.canAccessOrders) {
      testResults.analysis.overallStatus = 'full_access';
    } else if (testResults.analysis.canAccessCustomers) {
      testResults.analysis.overallStatus = 'partial_access';
    } else if (testResults.analysis.canAccessShop) {
      testResults.analysis.overallStatus = 'basic_access';
    } else {
      testResults.analysis.overallStatus = 'no_access';
    }

    // 推奨アクション
    testResults.recommendations = [];
    
    if (!testResults.analysis.canAccessOrders) {
      testResults.recommendations.push({
        priority: 'high',
        issue: '注文データにアクセスできません',
        action: 'アプリのスコープに "read_orders" が含まれていることを確認してください',
        details: 'shopify.app.toml の scopes 設定を確認'
      });
      
      testResults.recommendations.push({
        priority: 'high',
        issue: 'Protected Customer Data ポリシー',
        action: 'Development store での開発であることを確認してください',
        details: 'Production store では追加の承認が必要です'
      });
    }

    if (!testResults.analysis.canAccessCustomers) {
      testResults.recommendations.push({
        priority: 'medium',
        issue: '顧客データにアクセスできません',
        action: 'アプリのスコープに "read_customers" が含まれていることを確認してください'
      });
    }

    return json({
      success: true,
      ...testResults
    });

  } catch (error) {
    console.error('🚨 アクセス権限テスト重大エラー:', error);
    
    return json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      details: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString(),
      recommendations: [
        {
          priority: 'critical',
          issue: 'アプリの基本認証に失敗',
          action: 'shopify app dev を再起動してください',
          details: '認証トークンが無効になっている可能性があります'
        }
      ]
    }, { status: 500 });
  }
} 