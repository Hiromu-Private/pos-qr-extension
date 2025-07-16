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
}

interface ShopifyOrder {
  id: string
  name: string
  email?: string
  phone?: string
  customer?: {
    displayName?: string
    firstName?: string
    lastName?: string
    email?: string
  }
  totalPriceSet?: {
    shopMoney?: {
      amount: string
      currencyCode: string
    }
  }
  subtotalPriceSet?: {
    shopMoney?: {
      amount: string
      currencyCode: string
    }
  }
  totalTaxSet?: {
    shopMoney?: {
      amount: string
      currencyCode: string
    }
  }
  totalShippingPriceSet?: {
    shopMoney?: {
      amount: string
      currencyCode: string
    }
  }
  displayFinancialStatus?: string
  displayFulfillmentStatus?: string
  processedAt?: string
  tags?: string[]
  note?: string
  shippingAddress?: {
    firstName?: string
    lastName?: string
    address1?: string
    city?: string
    province?: string
    zip?: string
    country?: string
  }
  lineItems?: {
    edges: Array<{
      node: {
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
        discountedTotalSet?: {
          shopMoney?: {
            amount: string
            currencyCode: string
          }
        }
      }
    }>
  }
  fulfillments?: Array<{
    trackingInfo?: {
      number?: string
      url?: string
    }
    status?: string
  }>
  createdAt?: string
  cancelReason?: string
}

const Modal = () => {
  const api = useApi()
  const { data: scannerData } = useScannerDataSubscription()
  const [showScanner, setShowScanner] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [lastScannedData, setLastScannedData] = useState<string | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showOfflineManager, setShowOfflineManager] = useState(false)

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

  // 実際のShopify Admin APIから注文データを取得
  const fetchOrderData = async (orderId: string): Promise<OrderInfo | null> => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('📱 注文データ取得開始:', orderId)

      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()

      console.log('📱 APIレスポンス:', data)

      if (!response.ok) {
        throw new Error(data.error || `API呼び出しエラー: ${response.status}`)
      }

      if (!data.order) {
        throw new Error('注文データが見つかりません')
      }

      const order: ShopifyOrder = data.order

      // 注文データを表示用形式に変換
      const orderInfo: OrderInfo = {
        id: order.id || orderId,
        orderNumber: order.name || `#${orderId}`,
        customer: order.customer?.displayName || 
                 `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() ||
                 order.email || 'ゲスト顧客',
        total: order.totalPriceSet?.shopMoney?.amount 
               ? `¥${parseFloat(order.totalPriceSet.shopMoney.amount).toLocaleString()}`
               : '¥0',
        status: order.displayFulfillmentStatus || '未配送',
        items: order.lineItems?.edges.map(edge => {
          const item = edge.node
          const variantTitle = item.variant?.title ? ` (${item.variant.title})` : ''
          return `${item.title}${variantTitle} × ${item.quantity}`
        }) || [],
        // 詳細情報
        createdAt: order.createdAt ? new Date(order.createdAt).toLocaleDateString('ja-JP') : undefined,
        phone: order.phone || order.customer?.email,
        email: order.email || order.customer?.email,
        subtotal: order.subtotalPriceSet?.shopMoney?.amount 
                 ? `¥${parseFloat(order.subtotalPriceSet.shopMoney.amount).toLocaleString()}`
                 : undefined,
        tax: order.totalTaxSet?.shopMoney?.amount 
            ? `¥${parseFloat(order.totalTaxSet.shopMoney.amount).toLocaleString()}`
            : undefined,
        shipping: order.totalShippingPriceSet?.shopMoney?.amount 
                 ? `¥${parseFloat(order.totalShippingPriceSet.shopMoney.amount).toLocaleString()}`
                 : undefined,
        financialStatus: order.displayFinancialStatus,
        fulfillmentStatus: order.displayFulfillmentStatus,
        tags: order.tags,
        note: order.note,
        trackingNumbers: order.fulfillments?.map(f => f.trackingInfo?.number).filter((num): num is string => Boolean(num)) || [],
        cancelReason: order.cancelReason,
        shippingAddress: order.shippingAddress 
          ? `${order.shippingAddress.address1 || ''} ${order.shippingAddress.city || ''} ${order.shippingAddress.province || ''} ${order.shippingAddress.zip || ''}`.trim()
          : undefined
      }

      console.log('📱 変換された注文情報:', orderInfo)
      return orderInfo

    } catch (error) {
      console.error('📱 注文データ取得エラー:', error)
      throw error
    } finally {
      setIsLoading(false)
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

  // 手動入力での注文検索
  const handleManualSearch = async () => {
    if (!manualInput.trim()) {
      setError('注文IDを入力してください')
      return
    }

    const order = await fetchOrderData(manualInput.trim())
    if (order) {
      setOrderInfo(order)
      setManualInput('')
      setScanCount(prev => prev + 1)
    }
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

  // 詳細画面を表示する場合
  if (showOrderDetails && orderInfo) {
    return (
      <OrderDetails 
        orderInfo={orderInfo} 
        onBack={handleBackFromDetails}
      />
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
                  <Text>💡 QRコードが読み取れない場合は、手動入力をお試しください</Text>
                </Stack>
              )}
            </Stack>
          </Section>

          {/* 手動入力機能 */}
          {!showScanner && (
            <Section>
              <Stack direction="vertical">
                <Text>⌨️ 手動入力</Text>
                <TextField
                  label="注文ID"
                  value={manualInput}
                  onChange={setManualInput}
                  placeholder="例: 1179"
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
                  
                  {(orderInfo.subtotal || orderInfo.tax || orderInfo.shipping) && (
                    <Stack direction="vertical">
                      <Text>💰 金額詳細:</Text>
                      {orderInfo.subtotal && (
                        <Stack direction="horizontal">
                          <Text>　小計:</Text>
                          <Text>{orderInfo.subtotal}</Text>
                        </Stack>
                      )}
                      {orderInfo.tax && (
                        <Stack direction="horizontal">
                          <Text>　税金:</Text>
                          <Text>{orderInfo.tax}</Text>
                        </Stack>
                      )}
                      {orderInfo.shipping && (
                        <Stack direction="horizontal">
                          <Text>　送料:</Text>
                          <Text>{orderInfo.shipping}</Text>
                        </Stack>
                      )}
                    </Stack>
                  )}
                  
                  {orderInfo.shippingAddress && (
                    <Stack direction="vertical">
                      <Text>📦 配送先:</Text>
                      <Text>{orderInfo.shippingAddress}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.trackingNumbers && orderInfo.trackingNumbers.length > 0 && (
                    <Stack direction="vertical">
                      <Text>🚚 追跡番号:</Text>
                      {orderInfo.trackingNumbers.map((trackingNumber, index) => (
                        <Text key={index}>• {trackingNumber}</Text>
                      ))}
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
                  
                  {orderInfo.cancelReason && (
                    <Stack direction="vertical">
                      <Text>❌ キャンセル理由:</Text>
                      <Text>{orderInfo.cancelReason}</Text>
                    </Stack>
                  )}
                </Stack>

                {/* 商品一覧 */}
                {orderInfo.items.length > 0 && (
                  <Stack direction="vertical">
                    <Text>🛒 注文商品:</Text>
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
                    title="🔄 新しくスキャン"
                    onPress={() => {
                      setOrderInfo(null)
                      setError(null)
                      setLastScannedData(null)
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
                  
                  {scannerData && (
                    <Stack direction="horizontal">
                      <Text>最新スキャン:</Text>
                      <Text>{scannerData}</Text>
                    </Stack>
                  )}
                </Stack>
                
                <Button
                  title="🧪 接続テスト"
                  onPress={() => api.toast.show('🎉 システムは正常に動作しています')}
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