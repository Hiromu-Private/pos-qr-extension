import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";

interface DebugData {
  timestamp: string;
  environment: {
    nodeEnv: string;
    shopifyAppUrl: string;
    hasApiKey: boolean;
    hasApiSecret: boolean;
    scopes: string;
  };
  session?: {
    shop: string;
    hasAccessToken: boolean;
    isOnline: boolean;
    scope: string;
  };
  shopInfo?: any;
  apiTests: {
    [key: string]: {
      success: boolean;
      status: number;
      message: string;
      responseTime: number;
      data?: any;
    };
  };
  errors: string[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const startTime = Date.now();
  const debugData: DebugData = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      shopifyAppUrl: process.env.SHOPIFY_APP_URL || '未設定',
      hasApiKey: Boolean(process.env.SHOPIFY_API_KEY),
      hasApiSecret: Boolean(process.env.SHOPIFY_API_SECRET),
      scopes: process.env.SCOPES || '未設定'
    },
    apiTests: {},
    errors: []
  };

  // 1. Shopify認証テスト
  try {
    const { admin, session } = await authenticate.admin(request);
    debugData.session = {
      shop: session.shop,
      hasAccessToken: Boolean(session.accessToken),
      isOnline: session.isOnline || false,
      scope: session.scope || '不明'
    };

    // 2. 基本的なShop情報取得テスト
    try {
      const shopQuery = `
        query {
          shop {
            id
            name
            email
            myshopifyDomain
            plan {
              displayName
            }
          }
        }
      `;
      
      const shopResponse = await admin.graphql(shopQuery);
      const shopResult = await shopResponse.json();
      
      debugData.apiTests.shopInfo = {
        success: !shopResult.errors,
        status: shopResponse.status,
        message: shopResult.errors ? '店舗情報取得エラー' : '店舗情報取得成功',
        responseTime: Date.now() - startTime,
        data: shopResult.data || shopResult.errors
      };
      
      if (!shopResult.errors) {
        debugData.shopInfo = shopResult.data.shop;
      }
    } catch (shopError) {
      debugData.apiTests.shopInfo = {
        success: false,
        status: 500,
        message: `店舗情報取得エラー: ${shopError instanceof Error ? shopError.message : '不明'}`,
        responseTime: Date.now() - startTime
      };
    }

    // 3. 注文一覧取得テスト
    try {
      const ordersQuery = `
        query {
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
      
      const ordersResponse = await admin.graphql(ordersQuery);
      const ordersResult = await ordersResponse.json();
      
      debugData.apiTests.ordersQuery = {
        success: !ordersResult.errors,
        status: ordersResponse.status,
        message: ordersResult.errors ? '注文一覧取得エラー' : '注文一覧取得成功',
        responseTime: Date.now() - startTime,
        data: ordersResult.data || ordersResult.errors
      };
    } catch (ordersError) {
      debugData.apiTests.ordersQuery = {
        success: false,
        status: 500,
        message: `注文一覧取得エラー: ${ordersError instanceof Error ? ordersError.message : '不明'}`,
        responseTime: Date.now() - startTime
      };
    }

  } catch (authError) {
    debugData.errors.push(`認証エラー: ${authError instanceof Error ? authError.message : '不明なエラー'}`);
    debugData.apiTests.authentication = {
      success: false,
      status: 401,
      message: `認証失敗: ${authError instanceof Error ? authError.message : '不明'}`,
      responseTime: Date.now() - startTime
    };
  }

  return json(debugData);
}

export default function DebugDashboard() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [testOrderId, setTestOrderId] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 99)]);
  };

  // API接続テスト関数
  const testApiEndpoint = async (endpoint: string, label: string) => {
    addLog(`${label}テスト開始...`);
    try {
      const response = await fetch(endpoint);
      const result = await response.json();
      addLog(`${label}: ${response.ok ? '✅ 成功' : '❌ 失敗'} (${response.status})`);
      console.log(`${label}結果:`, result);
    } catch (error) {
      addLog(`${label}: ❌ エラー - ${error instanceof Error ? error.message : '不明'}`);
    }
  };

  // 注文検索テスト
  const testOrderSearch = async () => {
    if (!testOrderId) {
      addLog('注文IDを入力してください');
      return;
    }
    await testApiEndpoint(`/api/orders/${testOrderId}`, `注文ID ${testOrderId}`);
  };

  // カスタムGraphQLクエリテスト
  const testCustomQuery = () => {
    if (!customQuery) {
      addLog('GraphQLクエリを入力してください');
      return;
    }
    
    fetcher.submit(
      { query: customQuery },
      { method: "post", action: "/api/graphql-test" }
    );
    addLog('カスタムGraphQLクエリ実行中...');
  };

  useEffect(() => {
    if (fetcher.data) {
      addLog('カスタムクエリ結果を受信');
      console.log('カスタムクエリ結果:', fetcher.data);
    }
  }, [fetcher.data]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>🔧 Shopify POS QR Extension - デバッグダッシュボード</h1>
      
      {/* 基本情報 */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>📊 基本情報</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "15px" }}>
          <div>
            <h3>環境設定</h3>
            <ul>
              <li>Node環境: <code>{data.environment.nodeEnv}</code></li>
              <li>アプリURL: <code>{data.environment.shopifyAppUrl}</code></li>
              <li>API Key: {data.environment.hasApiKey ? '✅ 設定済み' : '❌ 未設定'}</li>
              <li>API Secret: {data.environment.hasApiSecret ? '✅ 設定済み' : '❌ 未設定'}</li>
              <li>スコープ: <code>{data.environment.scopes}</code></li>
            </ul>
          </div>
          
          {data.session && (
            <div>
              <h3>セッション情報</h3>
              <ul>
                <li>ショップ: <code>{data.session.shop}</code></li>
                <li>アクセストークン: {data.session.hasAccessToken ? '✅ あり' : '❌ なし'}</li>
                <li>オンライン: {data.session.isOnline ? '✅ はい' : '❌ いいえ'}</li>
                <li>スコープ: <code>{data.session.scope}</code></li>
              </ul>
            </div>
          )}
          
          {data.shopInfo && (
            <div>
              <h3>ショップ情報</h3>
              <ul>
                <li>名前: <code>{data.shopInfo.name}</code></li>
                <li>ドメイン: <code>{data.shopInfo.domain}</code></li>
                <li>Myshopifyドメイン: <code>{data.shopInfo.myshopifyDomain}</code></li>
                <li>プラン: <code>{data.shopInfo.plan?.displayName || '不明'}</code></li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* APIテスト結果 */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>🔌 API接続テスト結果</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "15px" }}>
          {Object.entries(data.apiTests).map(([key, test]) => (
            <div key={key} style={{ 
              padding: "15px", 
              border: `2px solid ${test.success ? '#28a745' : '#dc3545'}`,
              borderRadius: "6px",
              backgroundColor: test.success ? '#f8f9fa' : '#fff5f5'
            }}>
              <h4 style={{ margin: "0 0 10px 0" }}>
                {test.success ? '✅' : '❌'} {key}
              </h4>
              <p><strong>ステータス:</strong> {test.status}</p>
              <p><strong>メッセージ:</strong> {test.message}</p>
              <p><strong>応答時間:</strong> {test.responseTime}ms</p>
              {test.data && (
                <details>
                  <summary>詳細データ</summary>
                  <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "200px" }}>
                    {JSON.stringify(test.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 手動テスト */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>🧪 手動テスト</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          
          {/* APIエンドポイントテスト */}
          <div>
            <h3>APIエンドポイントテスト</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button onClick={() => testApiEndpoint('/api/basic', '基本API')}>
                基本APIテスト
              </button>
              <button onClick={() => testApiEndpoint('/api/debug', 'デバッグAPI')}>
                デバッグAPIテスト
              </button>
              <button onClick={() => testApiEndpoint('/api/orders/list', '注文一覧API')}>
                注文一覧APIテスト
              </button>
              <button onClick={() => testApiEndpoint('/api/orders/search?query=test', '注文検索API')}>
                注文検索APIテスト
              </button>
            </div>
          </div>

          {/* 注文IDテスト */}
          <div>
            <h3>注文IDテスト</h3>
            <input
              type="text"
              value={testOrderId}
              onChange={(e) => setTestOrderId(e.target.value)}
              placeholder="注文ID (例: gid://shopify/Order/123456)"
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <button onClick={testOrderSearch} style={{ width: "100%" }}>
              注文データ取得テスト
            </button>
          </div>

          {/* カスタムGraphQLテスト */}
          <div>
            <h3>カスタムGraphQLテスト</h3>
            <textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="GraphQLクエリを入力..."
              rows={4}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <button onClick={testCustomQuery} style={{ width: "100%" }}>
              GraphQLクエリ実行
            </button>
          </div>
        </div>
      </section>

      {/* エラー情報 */}
      {data.errors.length > 0 && (
        <section style={{ marginBottom: "30px", padding: "20px", border: "2px solid #dc3545", borderRadius: "8px", backgroundColor: "#fff5f5" }}>
          <h2>❌ エラー情報</h2>
          <ul>
            {data.errors.map((error, index) => (
              <li key={index} style={{ color: "#dc3545", marginBottom: "5px" }}>
                {error}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ログ表示 */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>📝 テストログ</h2>
        <button onClick={() => setLogs([])} style={{ marginBottom: "10px" }}>
          ログクリア
        </button>
        <div style={{ 
          height: "300px", 
          overflow: "auto", 
          border: "1px solid #ccc", 
          padding: "10px", 
          backgroundColor: "#f8f9fa",
          fontFamily: "monospace",
          fontSize: "12px"
        }}>
          {logs.length === 0 ? (
            <p>ログはありません</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: "2px" }}>
                {log}
              </div>
            ))
          )}
        </div>
      </section>

      {/* ナビゲーション */}
      <section style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>🔗 関連ページ</h2>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <Link to="/app" style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", textDecoration: "none", borderRadius: "4px" }}>
            メインページ
          </Link>
          <Link to="/app/additional" style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", textDecoration: "none", borderRadius: "4px" }}>
            追加機能
          </Link>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>
            ページリロード
          </button>
        </div>
      </section>
    </div>
  );
} 