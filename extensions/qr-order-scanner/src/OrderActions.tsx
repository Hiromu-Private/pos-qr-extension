import React, { useState } from 'react'
import { 
  Text, 
  Screen, 
  ScrollView, 
  Navigator, 
  Button, 
  TextField,
  Stack,
  Section,
  SectionHeader,
  reactExtension, 
  useApi 
} from '@shopify/ui-extensions-react/point-of-sale'

interface OrderActionsProps {
  orderInfo: {
    id: string
    orderNumber: string
    customer: string
    total: string
    status: string
    financialStatus?: string
    fulfillmentStatus?: string
  }
  onBack: () => void
  onOrderUpdated: (updatedOrder: any) => void
}

const OrderActions: React.FC<OrderActionsProps> = ({ orderInfo, onBack, onOrderUpdated }) => {
  const api = useApi()
  const [isProcessing, setIsProcessing] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [fulfillmentStatus, setFulfillmentStatus] = useState(orderInfo.fulfillmentStatus || '')

  // 返金処理
  const handleRefund = async () => {
    if (!refundAmount || !refundReason) {
      api.toast.show('❌ 返金金額と理由を入力してください')
      return
    }

    setIsProcessing(true)
    try {
      // 実際のShopify Admin APIで返金処理を実装
      const response = await fetch(`/api/orders/${orderInfo.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason,
          notify: true
        })
      })

      if (response.ok) {
        api.toast.show(`✅ ¥${refundAmount}の返金処理を開始しました`)
        setRefundAmount('')
        setRefundReason('')
        
        // 注文情報を更新
        const updatedOrder = await response.json()
        onOrderUpdated(updatedOrder)
      } else {
        const error = await response.json()
        api.toast.show(`❌ 返金処理エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('返金処理エラー:', error)
      api.toast.show('❌ 返金処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // 注文キャンセル
  const handleCancel = async () => {
    if (!cancelReason) {
      api.toast.show('❌ キャンセル理由を入力してください')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/orders/${orderInfo.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason,
          notify: true
        })
      })

      if (response.ok) {
        api.toast.show('✅ 注文をキャンセルしました')
        setCancelReason('')
        
        const updatedOrder = await response.json()
        onOrderUpdated(updatedOrder)
      } else {
        const error = await response.json()
        api.toast.show(`❌ キャンセル処理エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('キャンセル処理エラー:', error)
      api.toast.show('❌ キャンセル処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // 配送状況更新
  const handleFulfillmentUpdate = async () => {
    if (!fulfillmentStatus) {
      api.toast.show('❌ 配送状況を選択してください')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/orders/${orderInfo.id}/fulfillment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: fulfillmentStatus,
          notify: true
        })
      })

      if (response.ok) {
        api.toast.show(`✅ 配送状況を「${fulfillmentStatus}」に更新しました`)
        
        const updatedOrder = await response.json()
        onOrderUpdated(updatedOrder)
      } else {
        const error = await response.json()
        api.toast.show(`❌ 配送状況更新エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('配送状況更新エラー:', error)
      api.toast.show('❌ 配送状況更新に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // 配送完了処理
  const handleMarkAsFulfilled = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/orders/${orderInfo.id}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notify: true
        })
      })

      if (response.ok) {
        api.toast.show('✅ 注文を配送完了にマークしました')
        
        const updatedOrder = await response.json()
        onOrderUpdated(updatedOrder)
      } else {
        const error = await response.json()
        api.toast.show(`❌ 配送完了処理エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('配送完了処理エラー:', error)
      api.toast.show('❌ 配送完了処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // 顧客通知の送信
  const handleSendNotification = async (type: 'email' | 'sms') => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/orders/${orderInfo.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          orderNumber: orderInfo.orderNumber
        })
      })

      if (response.ok) {
        const notificationMethod = type === 'email' ? 'メール' : 'SMS'
        api.toast.show(`✅ 顧客に${notificationMethod}通知を送信しました`)
      } else {
        const error = await response.json()
        api.toast.show(`❌ 通知送信エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('通知送信エラー:', error)
      api.toast.show('❌ 通知送信に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Navigator>
      <Screen name="order-actions" title={`注文操作 - ${orderInfo.orderNumber}`}>
        <ScrollView>
          {/* 注文情報サマリー */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="📋 注文情報" />
              
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
              </Stack>
            </Stack>
          </Section>

          {/* 返金処理セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="💰 返金処理" />
              
              <Stack direction="vertical">
                <TextField
                  label="返金金額"
                  value={refundAmount}
                  onChange={setRefundAmount}
                  placeholder="1000"
                />
                
                <TextField
                  label="返金理由"
                  value={refundReason}
                  onChange={setRefundReason}
                  placeholder="商品不備のため返金"
                />
                
                <Button
                  title={isProcessing ? "処理中..." : "💰 返金を実行"}
                  onPress={handleRefund}
                  disabled={isProcessing}
                />
              </Stack>
            </Stack>
          </Section>

          {/* 注文キャンセルセクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="❌ 注文キャンセル" />
              
              <Stack direction="vertical">
                <TextField
                  label="キャンセル理由"
                  value={cancelReason}
                  onChange={setCancelReason}
                  placeholder="顧客都合によるキャンセル"
                />
                
                <Button
                  title={isProcessing ? "処理中..." : "❌ 注文をキャンセル"}
                  onPress={handleCancel}
                  disabled={isProcessing}
                />
              </Stack>
            </Stack>
          </Section>

          {/* 配送状況更新セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="📦 配送状況更新" />
              
              <Stack direction="vertical">
                <TextField
                  label="配送状況"
                  value={fulfillmentStatus}
                  onChange={setFulfillmentStatus}
                  placeholder="配送準備中"
                />
                
                <Button
                  title={isProcessing ? "処理中..." : "📦 配送状況を更新"}
                  onPress={handleFulfillmentUpdate}
                  disabled={isProcessing}
                />
                
                <Button
                  title={isProcessing ? "処理中..." : "✅ 配送完了にマーク"}
                  onPress={handleMarkAsFulfilled}
                  disabled={isProcessing}
                />
              </Stack>
            </Stack>
          </Section>

          {/* 顧客通知セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="📧 顧客通知" />
              
              <Stack direction="vertical">
                <Button
                  title={isProcessing ? "送信中..." : "📧 メール通知を送信"}
                  onPress={() => handleSendNotification('email')}
                  disabled={isProcessing}
                />
                
                <Button
                  title={isProcessing ? "送信中..." : "📱 SMS通知を送信"}
                  onPress={() => handleSendNotification('sms')}
                  disabled={isProcessing}
                />
              </Stack>
            </Stack>
          </Section>

          {/* ナビゲーション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="🔧 ナビゲーション" />
              
              <Stack direction="vertical">
                <Button
                  title="⬅️ 注文詳細に戻る"
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

export default OrderActions 