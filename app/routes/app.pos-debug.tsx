import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useState } from "react";

interface POSDebugData {
  timestamp: string;
  extensionInfo: {
    name: string;
    handle: string;
    type: string;
    directory: string;
  };
  mockOrderData: any[];
  qrTestData: {
    sampleOrderIds: string[];
    qrUrls: string[];
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    
    const debugData: POSDebugData = {
      timestamp: new Date().toISOString(),
      extensionInfo: {
        name: "qr-order-scanner",
        handle: "qr-order-scanner",
        type: "ui_extension",
        directory: "extensions/qr-order-scanner"
      },
      mockOrderData: [
        {
          id: "gid://shopify/Order/1001",
          orderNumber: "#1001",
          customer: "田中太郎",
          total: "¥5,000",
          status: "配送済み",
          items: ["商品A x2", "商品B x1"],
          createdAt: "2025-01-15T10:30:00Z",
          qrData: `${request.url.split('/app')[0]}/api/orders/1001`
        },
        {
          id: "gid://shopify/Order/1002", 
          orderNumber: "#1002",
          customer: "佐藤花子",
          total: "¥8,500",
          status: "処理中",
          items: ["商品C x1", "商品D x3"],
          createdAt: "2025-01-16T14:20:00Z",
          qrData: `${request.url.split('/app')[0]}/api/orders/1002`
        },
        {
          id: "gid://shopify/Order/1003",
          orderNumber: "#1003", 
          customer: "山田次郎",
          total: "¥12,000",
          status: "配送準備中",
          items: ["商品E x2", "商品F x1", "商品G x1"],
          createdAt: "2025-01-17T09:15:00Z",
          qrData: `${request.url.split('/app')[0]}/api/orders/1003`
        }
      ],
      qrTestData: {
        sampleOrderIds: [
          "gid://shopify/Order/1001",
          "gid://shopify/Order/1002", 
          "gid://shopify/Order/1003"
        ],
        qrUrls: [
          `${request.url.split('/app')[0]}/api/orders/1001/qrcode`,
          `${request.url.split('/app')[0]}/api/orders/1002/qrcode`,
          `${request.url.split('/app')[0]}/api/orders/1003/qrcode`
        ]
      }
    };

    return json(debugData);
  } catch (error) {
    return json({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '不明なエラー',
      extensionInfo: {
        name: "qr-order-scanner",
        handle: "qr-order-scanner", 
        type: "ui_extension",
        directory: "extensions/qr-order-scanner"
      },
      mockOrderData: [],
      qrTestData: {
        sampleOrderIds: [],
        qrUrls: []
      }
    });
  }
}

export default function POSDebug() {
  const data = useLoaderData<typeof loader>();
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 99)]);
  };

  // QRコード生成テスト
  const testQRGeneration = (orderId: string) => {
    addLog(`QRコード生成テスト開始: ${orderId}`);
    const qrUrl = `/api/orders/${orderId}/qrcode`;
    window.open(qrUrl, '_blank');
    addLog(`QRコードURL: ${qrUrl}`);
  };

  // 注文データ取得テスト
  const testOrderData = async (orderId: string) => {
    addLog(`注文データ取得テスト開始: ${orderId}`);
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();
      addLog(`注文データ取得: ${response.ok ? '✅ 成功' : '❌ 失敗'} (${response.status})`);
      console.log('注文データ:', result);
    } catch (error) {
      addLog(`注文データ取得エラー: ${error instanceof Error ? error.message : '不明'}`);
    }
  };

  // POS拡張機能シミュレーション
  const simulatePOSExtension = (orderId: string) => {
    addLog(`POS拡張機能シミュレーション開始: ${orderId}`);
    
    // モック版POS拡張機能の動作
    const mockOrder = data.mockOrderData.find(order => order.id === orderId);
    if (mockOrder) {
      addLog('✅ 注文データが見つかりました');
      addLog(`注文番号: ${mockOrder.orderNumber}`);
      addLog(`顧客名: ${mockOrder.customer}`);
      addLog(`合計金額: ${mockOrder.total}`);
      addLog(`ステータス: ${mockOrder.status}`);
      
      // Modal表示のシミュレーション
      const modalData = {
        orderInfo: {
          id: mockOrder.id,
          orderNumber: mockOrder.orderNumber,
          customer: mockOrder.customer,
          total: mockOrder.total,
          status: mockOrder.status,
          items: mockOrder.items
        }
      };
      
      console.log('Modal表示データ:', modalData);
      addLog('🖼️ Modal表示シミュレーション完了');
    } else {
      addLog('❌ 注文データが見つかりませんでした');
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>📱 POS拡張機能 - デバッグツール</h1>

      {/* 拡張機能情報 */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>🔧 拡張機能情報</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
          <div>
            <h3>基本情報</h3>
            <ul>
              <li>名前: <code>{data.extensionInfo.name}</code></li>
              <li>ハンドル: <code>{data.extensionInfo.handle}</code></li>
              <li>タイプ: <code>{data.extensionInfo.type}</code></li>
              <li>ディレクトリ: <code>{data.extensionInfo.directory}</code></li>
            </ul>
          </div>
          <div>
            <h3>機能一覧</h3>
            <ul>
              <li>📱 QRコードスキャン</li>
              <li>🖼️ 注文情報Modal表示</li>
              <li>🔍 注文データ検索</li>
              <li>📊 リアルタイムデータ更新</li>
            </ul>
          </div>
        </div>
      </section>

      {/* テスト用注文データ */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>📋 テスト用注文データ</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "15px" }}>
          {data.mockOrderData.map((order, index) => (
            <div key={index} style={{ 
              padding: "15px", 
              border: "1px solid #ccc", 
              borderRadius: "6px", 
              backgroundColor: "#f8f9fa" 
            }}>
              <h4>{order.orderNumber} - {order.customer}</h4>
              <p><strong>合計:</strong> {order.total}</p>
              <p><strong>ステータス:</strong> {order.status}</p>
              <p><strong>商品:</strong> {order.items.join(", ")}</p>
              <p><strong>作成日:</strong> {new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                <button 
                  onClick={() => testQRGeneration(order.id.split('/').pop()!)}
                  style={{ padding: "5px 10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "3px", fontSize: "12px" }}
                >
                  QRコード生成
                </button>
                <button 
                  onClick={() => testOrderData(order.id.split('/').pop()!)}
                  style={{ padding: "5px 10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "3px", fontSize: "12px" }}
                >
                  データ取得
                </button>
                <button 
                  onClick={() => simulatePOSExtension(order.id)}
                  style={{ padding: "5px 10px", backgroundColor: "#ffc107", color: "black", border: "none", borderRadius: "3px", fontSize: "12px" }}
                >
                  POS拡張シミュレート
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 手動テスト */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>🧪 手動テスト</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          
          <div>
            <h3>注文IDテスト</h3>
            <input
              type="text"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              placeholder="注文ID (例: 1001)"
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <button 
                onClick={() => testQRGeneration(selectedOrderId)}
                disabled={!selectedOrderId}
                style={{ padding: "8px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}
              >
                QRコード生成テスト
              </button>
              <button 
                onClick={() => testOrderData(selectedOrderId)}
                disabled={!selectedOrderId}
                style={{ padding: "8px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px" }}
              >
                注文データ取得テスト
              </button>
            </div>
          </div>

          <div>
            <h3>POS拡張機能テスト</h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
              実際のPOS拡張機能での動作をシミュレートします
            </p>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            >
              <option value="">注文を選択...</option>
              {data.qrTestData.sampleOrderIds.map((id, index) => (
                <option key={index} value={id}>{id.split('/').pop()}</option>
              ))}
            </select>
            <button 
              onClick={() => simulatePOSExtension(selectedOrderId)}
              disabled={!selectedOrderId}
              style={{ width: "100%", padding: "8px", backgroundColor: "#ffc107", color: "black", border: "none", borderRadius: "4px" }}
            >
              POS拡張機能実行
            </button>
          </div>

          <div>
            <h3>直接APIテスト</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <button onClick={() => window.open('/api/basic', '_blank')}>
                基本API確認
              </button>
              <button onClick={() => window.open('/api/orders/simple-list?mode=simple&limit=1', '_blank')} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>
                🔬 シンプル注文API確認
              </button>
              <button onClick={() => window.open('/api/orders/simple-list?mode=basic&limit=3', '_blank')} style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>
                📊 基本注文API確認
              </button>
              <button onClick={() => window.open('/api/orders/list', '_blank')}>
                注文一覧API確認（元）
              </button>
              <button onClick={() => window.open('/api/orders/search?query=test', '_blank')}>
                注文検索API確認
              </button>
              <button onClick={() => window.open('/api/graphql-test', '_blank')}>
                GraphQLテストAPI確認
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ログ表示 */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>📝 テストログ</h2>
        <button onClick={() => setLogs([])} style={{ marginBottom: "10px", padding: "5px 10px" }}>
          ログクリア
        </button>
        <div style={{ 
          height: "250px", 
          overflow: "auto", 
          border: "1px solid #ccc", 
          padding: "10px", 
          backgroundColor: "#f8f9fa",
          fontFamily: "monospace",
          fontSize: "12px"
        }}>
          {logs.length === 0 ? (
            <p>テストログはありません</p>
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
          <Link to="/app/debug-dashboard" style={{ padding: "8px 16px", backgroundColor: "#dc3545", color: "white", textDecoration: "none", borderRadius: "4px" }}>
            メインデバッグ
          </Link>
          <Link to="/app" style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", textDecoration: "none", borderRadius: "4px" }}>
            メインページ
          </Link>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>
            ページリロード
          </button>
        </div>
      </section>
    </div>
  );
} 