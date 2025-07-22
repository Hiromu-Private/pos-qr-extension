import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";

interface DebugData {
  success: boolean;
  timestamp: string;
  session: {
    shop: string;
    hasAccessToken: boolean;
    scope: string;
  };
  shopInfo?: {
    id: string;
    name: string;
    email: string;
    domain: string;
    myshopifyDomain: string;
    plan?: string;
  };
  ordersData?: {
    totalFound: number;
    hasOrders: boolean;
    orders: Array<{
      id: string;
      name: string;
      createdAt: string;
      financialStatus?: string;
      fulfillmentStatus?: string;
      total: string;
      currency: string;
      customer: string;
    }>;
  };
  apiCapabilities?: {
    canReadOrders: boolean;
    canReadShop: boolean;
    timestamp: string;
  };
  error?: string;
  details?: any;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // デバッグAPIエンドポイントから情報を取得
    const debugResponse = await fetch(new URL('/api/debug', request.url).toString(), {
      headers: request.headers
    });
    
    const debugData: DebugData = await debugResponse.json();
    
    return json({ debugData });
  } catch (error) {
    console.error('デバッグデータ取得エラー:', error);
    return json({ 
      debugData: { 
        success: false, 
        error: 'デバッグデータの取得に失敗しました',
        timestamp: new Date().toISOString()
      } 
    });
  }
};

export default function DebugPage() {
  const { debugData } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 QR注文スキャナー - デバッグ情報</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <Link to="/app" style={{ 
          color: '#007bff', 
          textDecoration: 'none',
          padding: '10px 20px',
          border: '1px solid #007bff',
          borderRadius: '4px',
          display: 'inline-block'
        }}>
          ← メインアプリに戻る
        </Link>
      </div>

      {/* ステータス概要 */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: debugData.success ? '#d4edda' : '#f8d7da',
        border: `1px solid ${debugData.success ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px',
        marginBottom: '20px'
      }}>
        <h2>{debugData.success ? '✅ システム正常' : '❌ システムエラー'}</h2>
        <p>最終更新: {new Date(debugData.timestamp).toLocaleString('ja-JP')}</p>
        {debugData.error && (
          <p style={{ color: '#721c24', fontWeight: 'bold' }}>
            エラー: {debugData.error}
          </p>
        )}
      </div>

      {/* セッション情報 */}
      {debugData.session && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🔐 セッション情報</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '15px',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            <p><strong>ショップ:</strong> {debugData.session.shop}</p>
            <p><strong>アクセストークン:</strong> {debugData.session.hasAccessToken ? '✅ 取得済み' : '❌ 未取得'}</p>
            <p><strong>スコープ:</strong> {debugData.session.scope}</p>
          </div>
        </div>
      )}

      {/* ショップ情報 */}
      {debugData.shopInfo && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🏪 ショップ情報</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '15px',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            <p><strong>名前:</strong> {debugData.shopInfo.name}</p>
            <p><strong>ドメイン:</strong> {debugData.shopInfo.domain}</p>
            <p><strong>Shopifyドメイン:</strong> {debugData.shopInfo.myshopifyDomain}</p>
            <p><strong>メール:</strong> {debugData.shopInfo.email}</p>
            {debugData.shopInfo.plan && (
              <p><strong>プラン:</strong> {debugData.shopInfo.plan}</p>
            )}
          </div>
        </div>
      )}

      {/* 注文データ */}
      {debugData.ordersData && (
        <div style={{ marginBottom: '20px' }}>
          <h3>📦 注文データテスト</h3>
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '15px',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            <p><strong>取得した注文数:</strong> {debugData.ordersData.totalFound}</p>
            <p><strong>注文データ有無:</strong> {debugData.ordersData.hasOrders ? '✅ あり' : '❌ なし'}</p>
            
            {debugData.ordersData.orders.length > 0 && (
              <div>
                <h4>最新の注文（最大5件）:</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {debugData.ordersData.orders.map((order, index) => (
                    <div key={order.id} style={{ 
                      padding: '10px',
                      border: '1px solid #ccc',
                      marginBottom: '10px',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}>
                      <p><strong>注文番号:</strong> {order.name}</p>
                      <p><strong>顧客:</strong> {order.customer}</p>
                      <p><strong>金額:</strong> {order.total} {order.currency}</p>
                      <p><strong>注文日:</strong> {new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
                      <p><strong>配送状況:</strong> {order.fulfillmentStatus}</p>
                      <p><strong>支払い状況:</strong> {order.financialStatus}</p>
                      <p style={{ fontSize: '12px', color: '#666' }}>ID: {order.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API機能テスト */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🧪 API機能テスト</h3>
        <div style={{ 
          backgroundColor: '#f8f9fa',
          padding: '15px',
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <h4>直接APIテスト:</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a 
                href="/api/debug" 
                target="_blank"
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                🔧 デバッグAPI
              </a>
              <a 
                href="/api/orders/list" 
                target="_blank"
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                📋 注文一覧API
              </a>
              <a 
                href="/api/orders/search?q=1&type=id" 
                target="_blank"
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                🔍 注文検索API
              </a>
            </div>
          </div>

          {debugData.apiCapabilities && (
            <div>
              <h4>API権限チェック:</h4>
              <p><strong>注文読み取り:</strong> {debugData.apiCapabilities.canReadOrders ? '✅ 可能' : '❌ 不可'}</p>
              <p><strong>ショップ情報読み取り:</strong> {debugData.apiCapabilities.canReadShop ? '✅ 可能' : '❌ 不可'}</p>
              <p><strong>チェック日時:</strong> {new Date(debugData.apiCapabilities.timestamp).toLocaleString('ja-JP')}</p>
            </div>
          )}
        </div>
      </div>

      {/* トラブルシューティング */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🛠️ トラブルシューティング</h3>
        <div style={{ 
          backgroundColor: '#fff3cd',
          padding: '15px',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          <h4>一般的な問題と解決方法:</h4>
          <ul>
            <li><strong>注文データが取得できない場合:</strong>
              <ul>
                <li>ショップに実際の注文が存在することを確認</li>
                <li>アプリのスコープに <code>read_orders</code> が含まれていることを確認</li>
                <li>アプリを再インストールして権限を更新</li>
              </ul>
            </li>
            <li><strong>API接続エラーの場合:</strong>
              <ul>
                <li>インターネット接続を確認</li>
                <li>Shopifyのサービス状況を確認</li>
                <li>アクセストークンの有効性を確認</li>
              </ul>
            </li>
            <li><strong>QRスキャンが動作しない場合:</strong>
              <ul>
                <li>カメラの権限が許可されていることを確認</li>
                <li>手動検索機能を代替手段として利用</li>
                <li>QRコードの形式が正しいことを確認</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      {/* POS拡張機能のテスト */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📱 POS拡張機能</h3>
        <div style={{ 
          backgroundColor: '#e7f3ff',
          padding: '15px',
          border: '1px solid #b6e0ff',
          borderRadius: '4px'
        }}>
          <p>POS拡張機能をテストするには、Shopify POSアプリでこのアプリを開いてください。</p>
          <h4>テスト手順:</h4>
          <ol>
            <li>Shopify POSアプリを開く</li>
            <li>「その他」→「アプリ」から「QR注文スキャナー」を選択</li>
            <li>QRスキャンまたは手動検索で注文を検索</li>
            <li>実際の注文データが表示されることを確認</li>
          </ol>
          
          <h4>テスト用のサンプルQRコード形式:</h4>
          <ul>
            <li><code>#1234</code> - 注文番号形式</li>
            <li><code>1234</code> - 数値のみ</li>
            <li><code>gid://shopify/Order/1234</code> - Shopify GraphQL ID</li>
          </ul>
        </div>
      </div>

      {/* エラー詳細 */}
      {debugData.details && (
        <div style={{ marginBottom: '20px' }}>
          <h3>🚨 エラー詳細</h3>
          <div style={{ 
            backgroundColor: '#f8d7da',
            padding: '15px',
            border: '1px solid #f5c6cb',
            borderRadius: '4px'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              fontSize: '12px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {JSON.stringify(debugData.details, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* フッター */}
      <div style={{ 
        marginTop: '40px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#666' }}>
          QR注文スキャナー v1.0 - Shopify POS拡張機能
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
          問題が解決しない場合は、アプリを再インストールするか、開発者にお問い合わせください。
        </p>
      </div>
    </div>
  );
} 