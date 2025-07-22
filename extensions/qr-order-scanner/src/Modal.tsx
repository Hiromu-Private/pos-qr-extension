import React, { useState, useEffect } from 'react'
import { 
  Text, 
  Screen, 
  ScrollView, 
  Navigator, 
  Button, 
  TextField,
  CameraScanner,
  Stack,
  Section,
  SectionHeader,
  reactExtension, 
  useApi,
  useScannerDataSubscription
} from '@shopify/ui-extensions-react/point-of-sale'
import OrderDetails from './OrderDetails'
import OfflineManager from './OfflineManager'

interface OrderInfo {
  id: string
  legacyResourceId?: string
  orderNumber: string
  customer: string
  total: string
  status: string
  items: string[]
  createdAt?: string
  shippingAddress?: string
  paymentStatus?: string
  // 拡張された詳細情報
  phone?: string
  email?: string
  subtotal?: string
  tax?: string
  shipping?: string
  fulfillmentStatus?: string
  financialStatus?: string
  tags?: string[]
  note?: string
  trackingNumbers?: string[]
  cancelReason?: string
  itemsCount?: number
  lineItems?: Array<{
        title: string
        quantity: number
        variant?: {
          title?: string
          sku?: string
          price?: {
            amount: string
            currencyCode: string
          }
          image?: {
            url: string
            altText?: string
          }
          product?: {
            title: string
        }
      }
    }>
  }

interface SearchResult {
  success: boolean
  message: string
  searchTerm: string
  searchType: string
  totalFound: number
  orders: Array<{
    id: string
    legacyResourceId?: string
    name: string
    customer: string
    email?: string
    phone?: string
    totalPrice?: {
      amount: string
      currency: string
      formatted: string
    }
    financialStatus?: string
    fulfillmentStatus?: string
    createdAt: string
    processedAt?: string
    updatedAt?: string
    tags?: string[]
    note?: string
    itemsCount: number
    shippingAddress?: any
    billingAddress?: any
    lineItems: Array<any>
    fulfillments?: Array<any>
    transactions?: Array<any>
  }>
  timestamp: string
}

const Modal = () => {
  const api = useApi()
  const { data: scannerData } = useScannerDataSubscription()
  const [showScanner, setShowScanner] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [searchType, setSearchType] = useState('auto')
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [searchResults, setSearchResults] = useState<OrderInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [lastScannedData, setLastScannedData] = useState<string | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showOfflineManager, setShowOfflineManager] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // QRコード解析関数（マルチフォーマット対応）
  const parseQRCode = (qrData: string): string | null => {
    try {
      console.log('QRコード解析中:', qrData)
      
      // パターン1: #1179形式
      const hashMatch = qrData.match(/^#(\d+)$/)
      if (hashMatch) {
        return hashMatch[1]
      }

      // パターン2: 数値のみ
      const numberMatch = qrData.match(/^\d+$/)
      if (numberMatch) {
        return qrData
      }

      // パターン3: URL形式
      const urlMatch = qrData.match(/\/orders\/(\d+)/)
      if (urlMatch) {
        return urlMatch[1]
      }

      // パターン4: Shopify注文番号形式
      const shopifyOrderMatch = qrData.match(/gid:\/\/shopify\/Order\/(\d+)/)
      if (shopifyOrderMatch) {
        return shopifyOrderMatch[1]
      }

      // パターン5: JSON形式
      try {
        const jsonData = JSON.parse(qrData)
        if (jsonData.orderId || jsonData.order_id || jsonData.id) {
          return jsonData.orderId || jsonData.order_id || jsonData.id
        }
      } catch (e) {
        // JSONではない場合は無視
      }

      return null
    } catch (error) {
      console.error('QRコード解析エラー:', error)
      return null
    }
  }

  // 新しい検索APIを使用して注文データを取得
  const searchOrders = async (searchTerm: string, type: string = 'auto'): Promise<OrderInfo[]> => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('📱 注文検索開始:', { searchTerm, type })

      const response = await fetch(`/api/orders/search?q=${encodeURIComponent(searchTerm)}&type=${type}&limit=10`)
      const data: SearchResult = await response.json()

      console.log('📱 検索レスポンス:', data)

      if (!response.ok) {
        throw new Error(data.error || `検索API呼び出しエラー: ${response.status}`)
      }

      if (!data.success || !data.orders) {
        if (data.message) {
          setError(data.message)
        }
        return []
      }

      // 検索結果を表示用形式に変換
      const orderInfoList: OrderInfo[] = data.orders.map((order) => ({
        id: order.id,
        legacyResourceId: order.legacyResourceId,
        orderNumber: order.name || `#${order.legacyResourceId || 'Unknown'}`,
        customer: order.customer || 'ゲスト顧客',
        total: order.totalPrice?.formatted || '¥0',
        status: order.fulfillmentStatus || '未配送',
        items: order.lineItems?.map(item => {
          const variantTitle = item.variant?.title ? ` (${item.variant.title})` : ''
          return `${item.title}${variantTitle} × ${item.quantity}`
        }) || [],
        // 詳細情報
        createdAt: order.createdAt ? new Date(order.createdAt).toLocaleDateString('ja-JP') : undefined,
        phone: order.phone,
        email: order.email,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        tags: order.tags,
        note: order.note,
        itemsCount: order.itemsCount,
        shippingAddress: order.shippingAddress 
          ? `${order.shippingAddress.address1 || ''} ${order.shippingAddress.city || ''} ${order.shippingAddress.province || ''} ${order.shippingAddress.zip || ''}`.trim()
          : undefined,
        lineItems: order.lineItems
      }))

      console.log('📱 変換された注文情報:', orderInfoList)
      return orderInfoList

    } catch (error) {
      console.error('📱 注文検索エラー:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // 実際のShopify Admin APIから注文データを取得（後方互換性のため）
  const fetchOrderData = async (orderId: string): Promise<OrderInfo | null> => {
    try {
      const results = await searchOrders(orderId, 'id')
      return results.length > 0 ? results[0] : null
    } catch (error) {
      console.error('📱 注文データ取得エラー:', error)
      throw error
    }
  }

  // カメラスキャンの開始
  const startCameraScanning = () => {
    setShowScanner(true)
    setError(null)
    setLastScannedData(null)
  }

  // カメラスキャンの停止
  const stopCameraScanning = () => {
    setShowScanner(false)
    setLastScannedData(null)
  }

  // スキャンデータの監視と処理
  useEffect(() => {
    if (scannerData && showScanner && scannerData !== lastScannedData) {
      console.log('新しいスキャンデータ:', scannerData)
      setLastScannedData(scannerData)
      setScanCount(prev => prev + 1)
      setShowScanner(false)
      
      const handleScanSuccess = async () => {
        await api.toast.show(`📱 QRコードをスキャンしました`)
        
        const orderId = parseQRCode(scannerData)
        if (orderId) {
          const order = await fetchOrderData(orderId)
          if (order) {
            setOrderInfo(order)
            await api.toast.show(`✅ 注文 ${order.orderNumber} を取得しました`)
          }
        } else {
          setError('QRコードの形式が正しくありません')
          await api.toast.show('❌ QRコードを認識できませんでした')
        }
      }

      handleScanSuccess()
    }
  }, [scannerData, showScanner, lastScannedData, api.toast])

  // 手動検索での注文検索
  const handleManualSearch = async () => {
    if (!manualInput.trim()) {
      setError('検索クエリを入力してください')
      return
    }

    try {
      const results = await searchOrders(manualInput.trim(), searchType)
      if (results.length === 1) {
        // 単一の結果の場合は直接表示
        setOrderInfo(results[0])
      setManualInput('')
      setScanCount(prev => prev + 1)
      } else if (results.length > 1) {
        // 複数の結果の場合は選択画面を表示
        setSearchResults(results)
        setShowSearchResults(true)
        await api.toast.show(`🔍 ${results.length}件の注文が見つかりました`)
      }
    } catch (error) {
      console.error('検索エラー:', error)
      setError(error instanceof Error ? error.message : '検索中にエラーが発生しました')
    }
  }

  // 検索結果から注文を選択
  const selectOrderFromResults = (order: OrderInfo) => {
    setOrderInfo(order)
    setShowSearchResults(false)
    setSearchResults([])
    api.toast.show(`✅ 注文 ${order.orderNumber} を選択しました`)
  }

  // 注文詳細画面への遷移
  const viewOrderDetails = () => {
    if (orderInfo) {
      setShowOrderDetails(true)
      api.toast.show(`📋 注文詳細画面を表示: ${orderInfo.orderNumber}`)
    }
  }

  // 詳細画面から戻る
  const handleBackFromDetails = () => {
    setShowOrderDetails(false)
    api.toast.show('📱 スキャン画面に戻りました')
  }

  // 検索結果画面から戻る
  const handleBackFromSearchResults = () => {
    setShowSearchResults(false)
    setSearchResults([])
    api.toast.show('📱 メイン画面に戻りました')
  }

  // 詳細画面を表示する場合
  if (showOrderDetails && orderInfo) {
    return (
      <OrderDetails 
        orderInfo={orderInfo} 
        onBack={handleBackFromDetails}
      />
    )
  }

  // 検索結果一覧を表示する場合
  if (showSearchResults && searchResults.length > 0) {
    return (
      <Navigator>
        <Screen name="SearchResults" title="検索結果">
          <ScrollView>
            <SectionHeader title={`検索結果 (${searchResults.length}件)`} />
            
            {searchResults.map((order, index) => (
              <Section key={order.id || index}>
                <Stack direction="vertical">
                  <Stack direction="horizontal">
                    <Text>注文番号:</Text>
                    <Text>{order.orderNumber}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>顧客:</Text>
                    <Text>{order.customer}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>合計金額:</Text>
                    <Text>{order.total}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>ステータス:</Text>
                    <Text>{order.status}</Text>
                  </Stack>
                  
                  {order.createdAt && (
                    <Stack direction="horizontal">
                      <Text>注文日:</Text>
                      <Text>{order.createdAt}</Text>
                    </Stack>
                  )}
                  
                  <Button
                    title="📋 この注文を選択"
                    onPress={() => selectOrderFromResults(order)}
                  />
                </Stack>
              </Section>
            ))}
            
            <Section>
              <Button
                title="⬅️ 戻る"
                onPress={handleBackFromSearchResults}
              />
            </Section>
          </ScrollView>
        </Screen>
      </Navigator>
    )
  }

  // オフライン管理画面を表示する場合
  if (showOfflineManager) {
    return (
      <OfflineManager 
        onBack={() => {
          setShowOfflineManager(false)
          api.toast.show('📱 メイン画面に戻りました')
        }}
      />
    )
  }

  return (
    <Navigator>
      <Screen name="QRScanner" title="QR注文スキャナー">
        <ScrollView>
          {/* メインヘッダー */}
          <SectionHeader title="注文情報スキャナー" />
          
          {/* エラー表示 */}
          {error && (
            <Section>
              <Stack direction="vertical">
                <Text>❌ エラー: {error}</Text>
              </Stack>
            </Section>
          )}

          {/* QRスキャン機能 */}
          <Section>
            <Stack direction="vertical">
              <Text>📱 QRコードスキャン</Text>
              
              {showScanner ? (
                <Stack direction="vertical">
                  <CameraScanner />
                  <Text>QRコードをカメラに向けてスキャンしてください</Text>
                  {scannerData && (
                    <Text>スキャンデータ: {scannerData}</Text>
                  )}
                  <Button
                    title="⏹️ スキャンを停止"
                    onPress={stopCameraScanning}
                  />
                </Stack>
              ) : (
                <Stack direction="vertical">
                  <Button
                    title="📸 カメラでQRスキャン"
                    onPress={startCameraScanning}
                    isDisabled={isLoading}
                  />
                  <Text>💡 QRコードが読み取れない場合は、手動検索をお試しください</Text>
                </Stack>
              )}
            </Stack>
          </Section>

          {/* 手動検索機能 */}
          {!showScanner && (
            <Section>
              <Stack direction="vertical">
                <Text>🔍 手動検索</Text>
                
                {/* 検索タイプ選択 */}
                <Stack direction="vertical">
                  <Text>検索方法:</Text>
                  <Button
                    title={`自動判別 ${searchType === 'auto' ? '✓' : ''}`}
                    onPress={() => setSearchType('auto')}
                  />
                  <Button
                    title={`注文ID ${searchType === 'id' ? '✓' : ''}`}
                    onPress={() => setSearchType('id')}
                  />
                  <Button
                    title={`注文番号 ${searchType === 'name' ? '✓' : ''}`}
                    onPress={() => setSearchType('name')}
                  />
                  <Button
                    title={`顧客名 ${searchType === 'customer' ? '✓' : ''}`}
                    onPress={() => setSearchType('customer')}
                  />
                  <Button
                    title={`メールアドレス ${searchType === 'email' ? '✓' : ''}`}
                    onPress={() => setSearchType('email')}
                  />
                </Stack>
                
                <TextField
                  label="検索クエリ"
                  value={manualInput}
                  onChange={setManualInput}
                  placeholder="例: 1179, #1179, customer@example.com"
                />
                <Button
                  title="🔍 注文を検索"
                  onPress={handleManualSearch}
                  isDisabled={isLoading || !manualInput.trim()}
                />
              </Stack>
            </Section>
          )}

          {/* 注文情報表示 */}
          {orderInfo && !showScanner && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="📋 注文情報" />
                
                {/* 注文概要 */}
                <Stack direction="vertical">
                  <Stack direction="horizontal">
                    <Text>注文番号:</Text>
                    <Text>{orderInfo.orderNumber}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>顧客:</Text>
                    <Text>{orderInfo.customer}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>合計金額:</Text>
                    <Text>{orderInfo.total}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>配送ステータス:</Text>
                    <Text>{orderInfo.status}</Text>
                  </Stack>
                  
                  {orderInfo.financialStatus && (
                    <Stack direction="horizontal">
                      <Text>支払い状況:</Text>
                      <Text>{orderInfo.financialStatus}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.createdAt && (
                    <Stack direction="horizontal">
                      <Text>注文日時:</Text>
                      <Text>{orderInfo.createdAt}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.email && (
                    <Stack direction="horizontal">
                      <Text>Email:</Text>
                      <Text>{orderInfo.email}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.phone && (
                    <Stack direction="horizontal">
                      <Text>電話番号:</Text>
                      <Text>{orderInfo.phone}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.shippingAddress && (
                    <Stack direction="vertical">
                      <Text>📦 配送先:</Text>
                      <Text>{orderInfo.shippingAddress}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.tags && orderInfo.tags.length > 0 && (
                    <Stack direction="vertical">
                      <Text>🏷️ タグ:</Text>
                      <Text>{orderInfo.tags.join(', ')}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.note && (
                    <Stack direction="vertical">
                      <Text>📝 備考:</Text>
                      <Text>{orderInfo.note}</Text>
                    </Stack>
                  )}
                </Stack>

                {/* 商品一覧 */}
                {orderInfo.items.length > 0 && (
                  <Stack direction="vertical">
                    <Text>🛒 注文商品 ({orderInfo.itemsCount || orderInfo.items.length}点):</Text>
                    {orderInfo.items.map((item, index) => (
                      <Text key={index}>• {item}</Text>
                    ))}
                  </Stack>
                )}

                {/* アクションボタン */}
                <Stack direction="horizontal">
                  <Button
                    title="📱 詳細を見る"
                    onPress={viewOrderDetails}
                  />
                  <Button
                    title="🔄 新しく検索"
                    onPress={() => {
                      setOrderInfo(null)
                      setError(null)
                      setLastScannedData(null)
                      setManualInput('')
                    }}
                  />
                </Stack>
              </Stack>
            </Section>
          )}

          {/* システム情報とデバッグ */}
          {!showScanner && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="🔧 システム情報" />
                
                <Stack direction="vertical">
                  <Stack direction="horizontal">
                    <Text>スキャン回数:</Text>
                    <Text>{scanCount}回</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>読み込み状態:</Text>
                    <Text>{isLoading ? '⏳ 処理中' : '✅ 待機中'}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>注文データ:</Text>
                    <Text>{orderInfo ? '✅ 読み込み済み' : '📭 なし'}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>カメラ状態:</Text>
                    <Text>{showScanner ? '📹 稼働中' : '📵 停止中'}</Text>
                  </Stack>
                  
                  <Stack direction="horizontal">
                    <Text>検索タイプ:</Text>
                    <Text>{searchType}</Text>
                  </Stack>
                  
                  {scannerData && (
                    <Stack direction="horizontal">
                      <Text>最新スキャン:</Text>
                      <Text>{scannerData}</Text>
                    </Stack>
                  )}
                </Stack>
                
                <Button
                  title="🧪 API接続テスト"
                  onPress={async () => {
                    try {
                      const response = await fetch('/api/debug')
                      const data = await response.json()
                      if (data.success) {
                        await api.toast.show('✅ API接続正常')
                      } else {
                        await api.toast.show('❌ API接続エラー')
                      }
                    } catch (error) {
                      await api.toast.show('❌ 接続テスト失敗')
                    }
                  }}
                />
                
                <Button
                  title="🌐 オフライン管理"
                  onPress={() => {
                    setShowOfflineManager(true)
                    api.toast.show('🌐 オフライン管理画面を開きます')
                  }}
                />
              </Stack>
            </Section>
          )}
        </ScrollView>
      </Screen>
    </Navigator>
  )
}

export default reactExtension('pos.home.modal.render', () => <Modal />);