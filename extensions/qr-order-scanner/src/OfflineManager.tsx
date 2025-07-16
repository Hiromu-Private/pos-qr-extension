import React, { useState, useEffect } from 'react'
import { 
  Text, 
  Screen, 
  ScrollView, 
  Navigator, 
  Button, 
  Stack,
  Section,
  SectionHeader,
  reactExtension, 
  useApi 
} from '@shopify/ui-extensions-react/point-of-sale'

interface OfflineManagerProps {
  onBack: () => void
}

interface CachedOrder {
  id: string
  orderNumber: string
  customer: string
  total: string
  status: string
  cachedAt: string
  lastSynced?: string
}

interface SyncStatus {
  isOnline: boolean
  lastSync: string | null
  pendingSync: number
  totalCached: number
}

const OfflineManager: React.FC<OfflineManagerProps> = ({ onBack }) => {
  const api = useApi()
  const [cachedOrders, setCachedOrders] = useState<CachedOrder[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: null,
    pendingSync: 0,
    totalCached: 0
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncLog, setSyncLog] = useState<string[]>([])

  // ローカルストレージキー
  const CACHE_KEY = 'pos_qr_cached_orders'
  const SYNC_STATUS_KEY = 'pos_qr_sync_status'
  const SYNC_LOG_KEY = 'pos_qr_sync_log'

  // 初期化時にキャッシュデータを読み込み
  useEffect(() => {
    loadCachedData()
    checkOnlineStatus()
    
    // オンライン状態の監視
    const handleOnline = () => {
      updateSyncStatus({ isOnline: true })
      addSyncLog('✅ オンラインに復帰しました')
      api.toast.show('🌐 オンラインに復帰しました')
    }
    
    const handleOffline = () => {
      updateSyncStatus({ isOnline: false })
      addSyncLog('⚠️ オフラインモードになりました')
      api.toast.show('📴 オフラインモードになりました')
    }

    // 実際の実装では window.addEventListener を使用
    // window.addEventListener('online', handleOnline)
    // window.addEventListener('offline', handleOffline)
    
    return () => {
      // window.removeEventListener('online', handleOnline)
      // window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // キャッシュデータの読み込み
  const loadCachedData = () => {
    try {
      // 実際の実装では localStorage.getItem を使用
      // const cached = localStorage.getItem(CACHE_KEY)
      // const status = localStorage.getItem(SYNC_STATUS_KEY)
      // const logs = localStorage.getItem(SYNC_LOG_KEY)
      
      // 模擬データ
      const mockCachedOrders: CachedOrder[] = [
        {
          id: '1001',
          orderNumber: '#1001',
          customer: '田中太郎',
          total: '¥5,400',
          status: '配送準備中',
          cachedAt: new Date(Date.now() - 3600000).toISOString(),
          lastSynced: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: '1002',
          orderNumber: '#1002',
          customer: '佐藤花子',
          total: '¥12,800',
          status: '配送完了',
          cachedAt: new Date(Date.now() - 7200000).toISOString()
        }
      ]

      setCachedOrders(mockCachedOrders)
      updateSyncStatus({
        totalCached: mockCachedOrders.length,
        pendingSync: mockCachedOrders.filter(order => !order.lastSynced).length,
        lastSync: mockCachedOrders
          .filter(order => order.lastSynced)
          .sort((a, b) => new Date(b.lastSynced!).getTime() - new Date(a.lastSynced!).getTime())[0]?.lastSynced || null
      })
      
      addSyncLog('📊 キャッシュデータを読み込みました')
    } catch (error) {
      console.error('キャッシュデータ読み込みエラー:', error)
      addSyncLog('❌ キャッシュデータの読み込みに失敗しました')
    }
  }

  // オンライン状態の確認
  const checkOnlineStatus = () => {
    // 実際の実装では navigator.onLine を使用
    // const isOnline = navigator.onLine
    const isOnline = true // 模擬データ
    
    updateSyncStatus({ isOnline })
    addSyncLog(`🌐 ネットワーク状態: ${isOnline ? 'オンライン' : 'オフライン'}`)
  }

  // 同期状態の更新
  const updateSyncStatus = (updates: Partial<SyncStatus>) => {
    setSyncStatus(prev => {
      const newStatus = { ...prev, ...updates }
      
      // 実際の実装では localStorage.setItem を使用
      // localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(newStatus))
      
      return newStatus
    })
  }

  // 同期ログの追加
  const addSyncLog = (message: string) => {
    const timestamp = new Date().toLocaleString('ja-JP')
    const logEntry = `[${timestamp}] ${message}`
    
    setSyncLog(prev => {
      const newLog = [logEntry, ...prev].slice(0, 50) // 最新50件を保持
      
      // 実際の実装では localStorage.setItem を使用
      // localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(newLog))
      
      return newLog
    })
  }

  // 注文データをキャッシュに保存
  const cacheOrder = (orderData: any) => {
    const cachedOrder: CachedOrder = {
      id: orderData.id,
      orderNumber: orderData.orderNumber,
      customer: orderData.customer,
      total: orderData.total,
      status: orderData.status,
      cachedAt: new Date().toISOString()
    }

    setCachedOrders(prev => {
      const newOrders = [cachedOrder, ...prev.filter(order => order.id !== cachedOrder.id)]
      
      // 実際の実装では localStorage.setItem を使用
      // localStorage.setItem(CACHE_KEY, JSON.stringify(newOrders))
      
      updateSyncStatus({ 
        totalCached: newOrders.length,
        pendingSync: newOrders.filter(order => !order.lastSynced).length
      })
      
      return newOrders
    })

    addSyncLog(`📦 注文 ${cachedOrder.orderNumber} をキャッシュしました`)
  }

  // データ同期の実行
  const syncData = async () => {
    if (!syncStatus.isOnline) {
      api.toast.show('❌ オフライン中のため同期できません')
      return
    }

    setIsSyncing(true)
    addSyncLog('🔄 データ同期を開始しました')

    try {
      const pendingOrders = cachedOrders.filter(order => !order.lastSynced)
      
      for (const order of pendingOrders) {
        // 実際の実装では、各注文データをAPIで同期
        await new Promise(resolve => setTimeout(resolve, 1000)) // 模擬同期処理
        
        // 同期完了をマーク
        setCachedOrders(prev => 
          prev.map(cachedOrder => 
            cachedOrder.id === order.id 
              ? { ...cachedOrder, lastSynced: new Date().toISOString() }
              : cachedOrder
          )
        )
        
        addSyncLog(`✅ 注文 ${order.orderNumber} を同期しました`)
      }

      updateSyncStatus({
        lastSync: new Date().toISOString(),
        pendingSync: 0
      })

      api.toast.show(`✅ ${pendingOrders.length}件の注文データを同期しました`)
      addSyncLog(`🎉 データ同期が完了しました (${pendingOrders.length}件)`)

    } catch (error) {
      console.error('データ同期エラー:', error)
      api.toast.show('❌ データ同期に失敗しました')
      addSyncLog('❌ データ同期中にエラーが発生しました')
    } finally {
      setIsSyncing(false)
    }
  }

  // キャッシュクリア
  const clearCache = () => {
    setCachedOrders([])
    setSyncLog([])
    updateSyncStatus({
      totalCached: 0,
      pendingSync: 0,
      lastSync: null
    })

    // 実際の実装では localStorage.clear を使用
    // localStorage.removeItem(CACHE_KEY)
    // localStorage.removeItem(SYNC_STATUS_KEY)
    // localStorage.removeItem(SYNC_LOG_KEY)

    api.toast.show('🗑️ キャッシュをクリアしました')
    addSyncLog('🗑️ キャッシュをクリアしました')
  }

  // ネットワーク接続テスト
  const testConnection = async () => {
    addSyncLog('🔍 ネットワーク接続をテスト中...')
    
    try {
      // 実際の実装では、APIエンドポイントにリクエスト
      await new Promise(resolve => setTimeout(resolve, 2000)) // 模擬テスト
      
      updateSyncStatus({ isOnline: true })
      api.toast.show('✅ ネットワーク接続は正常です')
      addSyncLog('✅ ネットワーク接続テスト成功')
    } catch (error) {
      updateSyncStatus({ isOnline: false })
      api.toast.show('❌ ネットワーク接続に失敗しました')
      addSyncLog('❌ ネットワーク接続テスト失敗')
    }
  }

  return (
    <Navigator>
      <Screen name="offline-manager" title="オフライン管理">
        <ScrollView>
          {/* 同期状態セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="🌐 同期状態" />
              
              <Stack direction="vertical">
                <Stack direction="horizontal">
                  <Text>ネットワーク状態:</Text>
                  <Text>{syncStatus.isOnline ? '🟢 オンライン' : '🔴 オフライン'}</Text>
                </Stack>
                
                <Stack direction="horizontal">
                  <Text>キャッシュ済み注文:</Text>
                  <Text>{syncStatus.totalCached}件</Text>
                </Stack>
                
                <Stack direction="horizontal">
                  <Text>同期待ち注文:</Text>
                  <Text>{syncStatus.pendingSync}件</Text>
                </Stack>
                
                {syncStatus.lastSync && (
                  <Stack direction="horizontal">
                    <Text>最終同期:</Text>
                    <Text>{new Date(syncStatus.lastSync).toLocaleString('ja-JP')}</Text>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Section>

          {/* 同期操作セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="🔄 同期操作" />
              
              <Stack direction="vertical">
                <Button
                  title={isSyncing ? "同期中..." : "🔄 データを同期"}
                  onPress={syncData}
                  disabled={isSyncing || !syncStatus.isOnline}
                />
                
                <Button
                  title="🔍 接続テスト"
                  onPress={testConnection}
                />
                
                <Button
                  title="📊 キャッシュ再読み込み"
                  onPress={loadCachedData}
                />
                
                <Button
                  title="🗑️ キャッシュクリア"
                  onPress={clearCache}
                />
              </Stack>
            </Stack>
          </Section>

          {/* キャッシュされた注文一覧 */}
          {cachedOrders.length > 0 && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="📦 キャッシュされた注文" />
                
                <Stack direction="vertical">
                  {cachedOrders.slice(0, 10).map((order) => (
                    <Stack key={order.id} direction="vertical">
                      <Stack direction="horizontal">
                        <Text>{order.orderNumber}</Text>
                        <Text>{order.lastSynced ? '✅' : '⏳'}</Text>
                      </Stack>
                      
                      <Stack direction="horizontal">
                        <Text>顧客: {order.customer}</Text>
                        <Text>{order.total}</Text>
                      </Stack>
                      
                      <Text>キャッシュ: {new Date(order.cachedAt).toLocaleString('ja-JP')}</Text>
                      
                      {order.lastSynced && (
                        <Text>同期: {new Date(order.lastSynced).toLocaleString('ja-JP')}</Text>
                      )}
                    </Stack>
                  ))}
                  
                  {cachedOrders.length > 10 && (
                    <Text>...他 {cachedOrders.length - 10}件</Text>
                  )}
                </Stack>
              </Stack>
            </Section>
          )}

          {/* 同期ログ */}
          {syncLog.length > 0 && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="📋 同期ログ" />
                
                <Stack direction="vertical">
                  {syncLog.slice(0, 10).map((log, index) => (
                    <Text key={index}>{log}</Text>
                  ))}
                  
                  {syncLog.length > 10 && (
                    <Text>...他 {syncLog.length - 10}件のログ</Text>
                  )}
                </Stack>
              </Stack>
            </Section>
          )}

          {/* オフライン機能ガイド */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="📖 オフライン機能について" />
              
              <Stack direction="vertical">
                <Text>🌐 オンライン時:</Text>
                <Text>• すべての機能が利用可能</Text>
                <Text>• データは自動的に同期されます</Text>
                <Text>• QRコード生成も利用可能</Text>
                
                <Text>📴 オフライン時:</Text>
                <Text>• キャッシュされた注文の表示</Text>
                <Text>• QRスキャンは引き続き可能</Text>
                <Text>• データは自動的にキャッシュされます</Text>
                
                <Text>🔄 同期について:</Text>
                <Text>• オンライン復帰時に自動同期</Text>
                <Text>• 手動同期も実行可能</Text>
                <Text>• データの整合性を保持</Text>
              </Stack>
            </Stack>
          </Section>

          {/* ナビゲーション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="🔧 ナビゲーション" />
              
              <Stack direction="vertical">
                <Button
                  title="⬅️ メイン画面に戻る"
                  onPress={onBack}
                />
              </Stack>
            </Stack>
          </Section>
        </ScrollView>
      </Screen>
    </Navigator>
  )
}

export default OfflineManager 