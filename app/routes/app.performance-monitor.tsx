import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useState, useEffect, useRef } from "react";

interface PerformanceData {
  timestamp: string;
  metrics: {
    [key: string]: {
      totalRequests: number;
      successRequests: number;
      errorRequests: number;
      averageResponseTime: number;
      lastError?: string;
      responseTimeHistory: number[];
    };
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await authenticate.admin(request);
    
    const performanceData: PerformanceData = {
      timestamp: new Date().toISOString(),
      metrics: {
        "基本API": {
          totalRequests: 0,
          successRequests: 0,
          errorRequests: 0,
          averageResponseTime: 0,
          responseTimeHistory: []
        },
                 "シンプル注文API": {
           totalRequests: 0,
           successRequests: 0,
           errorRequests: 0,
           averageResponseTime: 0,
           responseTimeHistory: []
         },
         "基本注文API": {
           totalRequests: 0,
           successRequests: 0,
           errorRequests: 0,
           averageResponseTime: 0,
           responseTimeHistory: []
         },
         "注文一覧API（元）": {
           totalRequests: 0,
           successRequests: 0,
           errorRequests: 0,
           averageResponseTime: 0,
           responseTimeHistory: []
         },
        "注文検索API": {
          totalRequests: 0,
          successRequests: 0,
          errorRequests: 0,
          averageResponseTime: 0,
          responseTimeHistory: []
        }
      }
    };

    return json(performanceData);
  } catch (error) {
    return json({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '不明なエラー',
      metrics: {}
    });
  }
}

export default function PerformanceMonitor() {
  const initialData = useLoaderData<typeof loader>();
  const [metrics, setMetrics] = useState<{[key: string]: any}>(initialData.metrics || {});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${emoji} ${message}`, ...prev.slice(0, 49)]);
  };

  // API パフォーマンステスト
  const testAPIPerformance = async (endpoint: string, label: string) => {
    addLog(`${label} パフォーマンステスト開始`, 'info');
    
    const startTime = performance.now();
    try {
      const response = await fetch(endpoint);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      const result = await response.json();
      const success = response.ok;
      
      // メトリクス更新
      setMetrics(prev => {
        const current = prev[label] || {
          totalRequests: 0,
          successRequests: 0,
          errorRequests: 0,
          averageResponseTime: 0,
          responseTimeHistory: []
        };
        
        const newHistory = [...current.responseTimeHistory, responseTime].slice(-20);
        const newTotal = current.totalRequests + 1;
        const newSuccess = success ? current.successRequests + 1 : current.successRequests;
        const newErrors = success ? current.errorRequests : current.errorRequests + 1;
        const newAverage = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);
        
        return {
          ...prev,
          [label]: {
            totalRequests: newTotal,
            successRequests: newSuccess,
            errorRequests: newErrors,
            averageResponseTime: newAverage,
            responseTimeHistory: newHistory,
            lastError: success ? current.lastError : `${response.status}: ${response.statusText}`
          }
        };
      });
      
      if (success) {
        addLog(`${label}: ${responseTime}ms (${response.status})`, 'success');
      } else {
        addLog(`${label}: ${responseTime}ms - エラー ${response.status}`, 'error');
      }
      
      console.log(`${label} 結果:`, { responseTime, status: response.status, data: result });
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      setMetrics(prev => {
        const current = prev[label] || {
          totalRequests: 0,
          successRequests: 0,
          errorRequests: 0,
          averageResponseTime: 0,
          responseTimeHistory: []
        };
        
        return {
          ...prev,
          [label]: {
            ...current,
            totalRequests: current.totalRequests + 1,
            errorRequests: current.errorRequests + 1,
            lastError: error instanceof Error ? error.message : '不明なエラー'
          }
        };
      });
      
      addLog(`${label}: エラー - ${error instanceof Error ? error.message : '不明'}`, 'error');
    }
  };

  // 連続監視の開始/停止
  const toggleMonitoring = () => {
    if (isMonitoring) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      addLog('連続監視を停止しました', 'info');
    } else {
      addLog('連続監視を開始しました', 'info');
             intervalRef.current = setInterval(() => {
         testAPIPerformance('/api/basic', '基本API');
         testAPIPerformance('/api/orders/simple-list?mode=simple&limit=1', 'シンプル注文API');
         testAPIPerformance('/api/orders/simple-list?mode=basic&limit=3', '基本注文API');
         testAPIPerformance('/api/orders/search?query=test', '注文検索API');
       }, 5000);
    }
    setIsMonitoring(!isMonitoring);
  };

  // 自動リフレッシュ
  useEffect(() => {
    if (autoRefresh && !isMonitoring) {
      const interval = setInterval(() => {
        window.location.reload();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isMonitoring]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // メトリクスリセット
  const resetMetrics = () => {
    setMetrics({});
    setLogs([]);
    addLog('メトリクスをリセットしました', 'info');
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1>📊 パフォーマンス監視ダッシュボード</h1>

      {/* 制御パネル */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#f8f9fa" }}>
        <h2>🎛️ 制御パネル</h2>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center" }}>
          <button 
            onClick={toggleMonitoring}
            style={{ 
              padding: "10px 20px", 
              backgroundColor: isMonitoring ? "#dc3545" : "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "5px",
              fontWeight: "bold"
            }}
          >
            {isMonitoring ? '⏹️ 監視停止' : '▶️ 監視開始'}
          </button>
          
          <button 
            onClick={() => testAPIPerformance('/api/basic', '基本API')}
            style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}
          >
            基本APIテスト
          </button>
          
          <button 
            onClick={() => testAPIPerformance('/api/orders/simple-list?mode=simple&limit=1', 'シンプル注文API')}
            style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px" }}
          >
            🔬 シンプル注文APIテスト
          </button>
          
          <button 
            onClick={() => testAPIPerformance('/api/orders/simple-list?mode=basic&limit=3', '基本注文API')}
            style={{ padding: "8px 16px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px" }}
          >
            📊 基本注文APIテスト
          </button>
          
          <button 
            onClick={() => testAPIPerformance('/api/orders/list', '注文一覧API')}
            style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px" }}
          >
            注文一覧APIテスト（元）
          </button>
          
          <button 
            onClick={() => testAPIPerformance('/api/orders/search?query=test', '注文検索API')}
            style={{ padding: "8px 16px", backgroundColor: "#6f42c1", color: "white", border: "none", borderRadius: "4px" }}
          >
            注文検索APIテスト
          </button>
          
          <button 
            onClick={resetMetrics}
            style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px" }}
          >
            リセット
          </button>
          
          <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自動リフレッシュ (30秒)
          </label>
        </div>
        
        {isMonitoring && (
          <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#d4edda", borderRadius: "4px", border: "1px solid #c3e6cb" }}>
            🔴 監視中... 5秒ごとにAPIをテストしています
          </div>
        )}
      </section>

      {/* パフォーマンスメトリクス */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>📈 パフォーマンスメトリクス</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
          {Object.entries(metrics).map(([apiName, metric]) => (
            <div key={apiName} style={{ 
              padding: "20px", 
              border: "2px solid #ddd", 
              borderRadius: "8px",
              backgroundColor: metric.errorRequests > metric.successRequests ? "#fff5f5" : "#f8f9fa"
            }}>
              <h3 style={{ margin: "0 0 15px 0", color: metric.errorRequests > metric.successRequests ? "#dc3545" : "#495057" }}>
                {apiName}
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                <div>
                  <strong>総リクエスト:</strong> {metric.totalRequests}
                </div>
                <div style={{ color: "#28a745" }}>
                  <strong>成功:</strong> {metric.successRequests}
                </div>
                <div style={{ color: "#dc3545" }}>
                  <strong>エラー:</strong> {metric.errorRequests}
                </div>
                <div>
                  <strong>平均応答:</strong> {metric.averageResponseTime}ms
                </div>
              </div>
              
              {metric.responseTimeHistory.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <strong>応答時間履歴 (直近20回):</strong>
                  <div style={{ 
                    display: "flex", 
                    gap: "2px", 
                    marginTop: "5px",
                    height: "30px",
                    alignItems: "end"
                  }}>
                    {metric.responseTimeHistory.map((time: number, index: number) => {
                      const maxTime = Math.max(...metric.responseTimeHistory);
                      const height = (time / maxTime) * 25;
                      const color = time < 500 ? "#28a745" : time < 1000 ? "#ffc107" : "#dc3545";
                      return (
                        <div
                          key={index}
                          style={{
                            width: "8px",
                            height: `${height}px`,
                            backgroundColor: color,
                            borderRadius: "1px"
                          }}
                          title={`${time}ms`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {metric.lastError && (
                <div style={{ 
                  padding: "8px", 
                  backgroundColor: "#f8d7da", 
                  border: "1px solid #f5c6cb", 
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#721c24"
                }}>
                  <strong>最新エラー:</strong> {metric.lastError}
                </div>
              )}
              
              <div style={{ marginTop: "10px" }}>
                <div style={{ 
                  width: "100%", 
                  height: "8px", 
                  backgroundColor: "#e9ecef", 
                  borderRadius: "4px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${metric.totalRequests > 0 ? (metric.successRequests / metric.totalRequests) * 100 : 0}%`,
                    height: "100%",
                    backgroundColor: "#28a745",
                    transition: "width 0.3s ease"
                  }} />
                </div>
                <div style={{ fontSize: "12px", marginTop: "2px", textAlign: "center" }}>
                  成功率: {metric.totalRequests > 0 ? Math.round((metric.successRequests / metric.totalRequests) * 100) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ログ表示 */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>📝 リアルタイムログ</h2>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button onClick={() => setLogs([])} style={{ padding: "5px 10px" }}>
            ログクリア
          </button>
          <span style={{ fontSize: "14px", color: "#666" }}>
            総ログ数: {logs.length} / 50
          </span>
        </div>
        <div style={{ 
          height: "400px", 
          overflow: "auto", 
          border: "1px solid #ccc", 
          padding: "15px", 
          backgroundColor: "#f8f9fa",
          fontFamily: "monospace",
          fontSize: "13px",
          lineHeight: "1.4"
        }}>
          {logs.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>ログはありません。APIテストを実行してください。</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ 
                marginBottom: "3px",
                padding: "2px 0",
                borderBottom: index % 5 === 4 ? "1px solid #dee2e6" : "none"
              }}>
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
          <Link to="/app/pos-debug" style={{ padding: "8px 16px", backgroundColor: "#17a2b8", color: "white", textDecoration: "none", borderRadius: "4px" }}>
            POS拡張デバッグ
          </Link>
          <Link to="/app" style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", textDecoration: "none", borderRadius: "4px" }}>
            メインページ
          </Link>
        </div>
      </section>
    </div>
  );
} 