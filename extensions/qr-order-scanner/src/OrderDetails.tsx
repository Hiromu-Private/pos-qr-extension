import React, { useState } from 'react'
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
import OrderActions from './OrderActions'
import QRGenerator from './QRGenerator'

interface OrderDetailsProps {
  orderInfo: {
    id: string
    orderNumber: string
    customer: string
    total: string
    status: string
    items: string[]
    createdAt?: string
    shippingAddress?: string
    paymentStatus?: string
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
  onBack: () => void
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ orderInfo, onBack }) => {
  const api = useApi()
  const [showActions, setShowActions] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [currentOrderInfo, setCurrentOrderInfo] = useState(orderInfo)

  // 注文操作画面を表示する場合
  if (showActions) {
    return (
      <OrderActions 
        orderInfo={currentOrderInfo} 
        onBack={() => setShowActions(false)}
        onOrderUpdated={(updatedOrder) => {
          setCurrentOrderInfo(updatedOrder)
          api.toast.show('✅ 注文情報が更新されました')
        }}
      />
    )
  }

  // QRコード生成画面を表示する場合
  if (showQRGenerator) {
    return (
      <QRGenerator 
        orderInfo={currentOrderInfo} 
        onBack={() => setShowQRGenerator(false)}
      />
    )
  }

  return (
    <Navigator>
      <Screen name="order-details" title={`注文詳細 - ${currentOrderInfo.orderNumber}`}>
        <ScrollView>
          {/* 注文基本情報セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="📋 注文基本情報" />
              
              <Stack direction="vertical">
                <Stack direction="horizontal">
                  <Text>注文番号:</Text>
                  <Text>{currentOrderInfo.orderNumber}</Text>
                </Stack>
                
                <Stack direction="horizontal">
                  <Text>注文ID:</Text>
                  <Text>{currentOrderInfo.id}</Text>
                </Stack>
                
                {currentOrderInfo.createdAt && (
                  <Stack direction="horizontal">
                    <Text>注文日時:</Text>
                    <Text>{currentOrderInfo.createdAt}</Text>
                  </Stack>
                )}
                
                <Stack direction="horizontal">
                  <Text>配送ステータス:</Text>
                  <Text>{currentOrderInfo.fulfillmentStatus || currentOrderInfo.status}</Text>
                </Stack>
                
                {currentOrderInfo.financialStatus && (
                  <Stack direction="horizontal">
                    <Text>支払い状況:</Text>
                    <Text>{currentOrderInfo.financialStatus}</Text>
                  </Stack>
                )}
                
                {currentOrderInfo.cancelReason && (
                  <Stack direction="vertical">
                    <Text>❌ キャンセル理由:</Text>
                    <Text>{currentOrderInfo.cancelReason}</Text>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Section>

          {/* 顧客情報セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="👤 顧客情報" />
              
              <Stack direction="vertical">
                <Stack direction="horizontal">
                  <Text>顧客名:</Text>
                  <Text>{orderInfo.customer}</Text>
                </Stack>
                
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
              </Stack>
            </Stack>
          </Section>

          {/* 金額詳細セクション */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="💰 金額詳細" />
              
              <Stack direction="vertical">
                {orderInfo.subtotal && (
                  <Stack direction="horizontal">
                    <Text>小計:</Text>
                    <Text>{orderInfo.subtotal}</Text>
                  </Stack>
                )}
                
                {orderInfo.tax && (
                  <Stack direction="horizontal">
                    <Text>税金:</Text>
                    <Text>{orderInfo.tax}</Text>
                  </Stack>
                )}
                
                {orderInfo.shipping && (
                  <Stack direction="horizontal">
                    <Text>送料:</Text>
                    <Text>{orderInfo.shipping}</Text>
                  </Stack>
                )}
                
                <Stack direction="horizontal">
                  <Text>合計金額:</Text>
                  <Text>{orderInfo.total}</Text>
                </Stack>
              </Stack>
            </Stack>
          </Section>

          {/* 商品詳細セクション */}
          {orderInfo.items.length > 0 && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="🛒 注文商品詳細" />
                
                <Stack direction="vertical">
                  {orderInfo.items.map((item, index) => (
                    <Stack key={index} direction="vertical">
                      <Text>• {item}</Text>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Section>
          )}

          {/* 配送情報セクション */}
          {(orderInfo.shippingAddress || (orderInfo.trackingNumbers && orderInfo.trackingNumbers.length > 0)) && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="📦 配送情報" />
                
                <Stack direction="vertical">
                  {orderInfo.shippingAddress && (
                    <Stack direction="vertical">
                      <Text>配送先住所:</Text>
                      <Text>{orderInfo.shippingAddress}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.trackingNumbers && orderInfo.trackingNumbers.length > 0 && (
                    <Stack direction="vertical">
                      <Text>🚚 追跡番号:</Text>
                      {orderInfo.trackingNumbers.map((trackingNumber, index) => (
                        <Stack key={index} direction="horizontal">
                          <Text>• {trackingNumber}</Text>
                          <Button
                            title="📋 コピー"
                            onPress={() => {
                              // 追跡番号をクリップボードにコピー（模擬）
                              api.toast.show(`追跡番号をコピーしました: ${trackingNumber}`)
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Stack>
            </Section>
          )}

          {/* 追加情報セクション */}
          {(orderInfo.tags || orderInfo.note) && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="📝 追加情報" />
                
                <Stack direction="vertical">
                  {orderInfo.tags && orderInfo.tags.length > 0 && (
                    <Stack direction="vertical">
                      <Text>🏷️ タグ:</Text>
                      <Text>{orderInfo.tags.join(', ')}</Text>
                    </Stack>
                  )}
                  
                  {orderInfo.note && (
                    <Stack direction="vertical">
                      <Text>備考:</Text>
                      <Text>{orderInfo.note}</Text>
                    </Stack>
                  )}
                </Stack>
              </Stack>
            </Section>
          )}

          {/* アクションボタン */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="🔧 アクション" />
              
              <Stack direction="vertical">
                <Button
                  title="⚙️ 注文操作（返金・キャンセル等）"
                  onPress={() => {
                    setShowActions(true)
                    api.toast.show('📋 注文操作画面を開きます')
                  }}
                />
                
                <Button
                  title="📱 QRコード生成"
                  onPress={() => {
                    setShowQRGenerator(true)
                    api.toast.show('📱 QRコード生成画面を開きます')
                  }}
                />
                
                <Button
                  title="📧 顧客にメール送信"
                  onPress={() => {
                    api.toast.show('顧客メール機能は開発中です')
                  }}
                />
                
                <Button
                  title="🖨️ 注文詳細を印刷"
                  onPress={() => {
                    api.toast.show('印刷機能は開発中です')
                  }}
                />
                
                <Button
                  title="🔄 注文情報を更新"
                  onPress={() => {
                    api.toast.show('注文情報を最新状態に更新しました')
                  }}
                />
                
                <Button
                  title="⬅️ スキャン画面に戻る"
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

export default OrderDetails 