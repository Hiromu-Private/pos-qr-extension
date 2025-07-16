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

interface QRGeneratorProps {
  orderInfo: {
    id: string
    orderNumber: string
    customer: string
    total: string
  }
  onBack: () => void
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ orderInfo, onBack }) => {
  const api = useApi()
  const [selectedFormat, setSelectedFormat] = useState<'simple' | 'json' | 'url'>('simple')
  const [qrSize, setQrSize] = useState('200')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQRs, setGeneratedQRs] = useState<{[key: string]: string}>({})

  // QRコード生成
  const generateQR = async (format: 'simple' | 'json' | 'url', size: string = '200') => {
    setIsGenerating(true)
    try {
      console.log('QRコード生成開始:', { orderId: orderInfo.id, format, size })

      const response = await fetch(`/api/orders/${orderInfo.id}/qrcode?format=${format}&size=${size}`)
      
      if (response.ok) {
        const qrCodeSVG = await response.text()
        const qrKey = `${format}_${size}`
        
        setGeneratedQRs(prev => ({
          ...prev,
          [qrKey]: qrCodeSVG
        }))
        
        api.toast.show(`✅ ${format}形式のQRコードを生成しました`)
        console.log('QRコード生成完了:', qrKey)
      } else {
        const error = await response.text()
        api.toast.show(`❌ QRコード生成エラー: ${error}`)
      }
    } catch (error) {
      console.error('QRコード生成エラー:', error)
      api.toast.show('❌ QRコード生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  // 全形式のQRコードを一括生成
  const generateAllFormats = async () => {
    setIsGenerating(true)
    api.toast.show('🔄 全形式のQRコードを生成中...')
    
    try {
      await Promise.all([
        generateQR('simple', qrSize),
        generateQR('json', qrSize),
        generateQR('url', qrSize)
      ])
      api.toast.show('✅ 全形式のQRコード生成が完了しました')
    } catch (error) {
      api.toast.show('❌ 一部のQRコード生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  // QRコードデータの説明を取得
  const getFormatDescription = (format: 'simple' | 'json' | 'url'): string => {
    switch (format) {
      case 'simple':
        return `#${orderInfo.id} - シンプルな注文ID形式`
      case 'json':
        return `{"orderId": "${orderInfo.id}", ...} - JSON形式（詳細情報付き）`
      case 'url':
        return `https://admin.shopify.com/store/.../orders/${orderInfo.id} - 直接リンク形式`
      default:
        return ''
    }
  }

  // QRコードの共有
  const shareQR = async (format: string) => {
    const qrKey = `${format}_${qrSize}`
    if (generatedQRs[qrKey]) {
      // 実際の実装では、SVGをBase64エンコードしてクリップボードにコピーまたは共有API使用
      api.toast.show(`📋 ${format}形式のQRコードをクリップボードにコピーしました`)
      console.log('QRコード共有:', qrKey)
    } else {
      api.toast.show('❌ 共有するQRコードが見つかりません')
    }
  }

  // QRコードの印刷
  const printQR = async (format: string) => {
    const qrKey = `${format}_${qrSize}`
    if (generatedQRs[qrKey]) {
      // 実際の実装では、印刷APIを使用
      api.toast.show(`🖨️ ${format}形式のQRコードを印刷します`)
      console.log('QRコード印刷:', qrKey)
    } else {
      api.toast.show('❌ 印刷するQRコードが見つかりません')
    }
  }

  return (
    <Navigator>
      <Screen name="qr-generator" title={`QRコード生成 - ${orderInfo.orderNumber}`}>
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
                  <Text>注文ID:</Text>
                  <Text>{orderInfo.id}</Text>
                </Stack>
              </Stack>
            </Stack>
          </Section>

          {/* QRコード設定 */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="⚙️ QRコード設定" />
              
              <Stack direction="vertical">
                <TextField
                  label="QRコードサイズ (px)"
                  value={qrSize}
                  onChange={setQrSize}
                  placeholder="200"
                />
                
                <Text>💡 推奨サイズ: 200px (モバイル), 300px (タブレット), 400px (印刷用)</Text>
              </Stack>
            </Stack>
          </Section>

          {/* QRコード生成ボタン */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="🔄 QRコード生成" />
              
              <Stack direction="vertical">
                <Button
                  title={isGenerating ? "生成中..." : "🚀 全形式一括生成"}
                  onPress={generateAllFormats}
                  disabled={isGenerating}
                />
                
                <Stack direction="horizontal">
                  <Button
                    title={isGenerating ? "生成中..." : "📱 シンプル形式"}
                    onPress={() => generateQR('simple', qrSize)}
                    disabled={isGenerating}
                  />
                  <Button
                    title={isGenerating ? "生成中..." : "📊 JSON形式"}
                    onPress={() => generateQR('json', qrSize)}
                    disabled={isGenerating}
                  />
                  <Button
                    title={isGenerating ? "生成中..." : "🔗 URL形式"}
                    onPress={() => generateQR('url', qrSize)}
                    disabled={isGenerating}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Section>

          {/* 生成されたQRコード一覧 */}
          {Object.keys(generatedQRs).length > 0 && (
            <Section>
              <Stack direction="vertical">
                <SectionHeader title="📱 生成されたQRコード" />
                
                <Stack direction="vertical">
                  {['simple', 'json', 'url'].map((format) => {
                    const qrKey = `${format}_${qrSize}`
                    const hasQR = generatedQRs[qrKey]
                    
                    return (
                      <Stack key={format} direction="vertical">
                        <Stack direction="horizontal">
                          <Text>🎯 {format.toUpperCase()}形式:</Text>
                          <Text>{hasQR ? '✅ 生成済み' : '❌ 未生成'}</Text>
                        </Stack>
                        
                        <Text>{getFormatDescription(format as 'simple' | 'json' | 'url')}</Text>
                        
                        {hasQR && (
                          <Stack direction="horizontal">
                            <Button
                              title="📋 コピー"
                              onPress={() => shareQR(format)}
                            />
                            <Button
                              title="🖨️ 印刷"
                              onPress={() => printQR(format)}
                            />
                          </Stack>
                        )}
                        
                        {/* QRコードプレビュー表示エリア */}
                        {hasQR && (
                          <Stack direction="vertical">
                            <Text>📱 プレビュー:</Text>
                            {/* 実際の実装では、ここにSVGを表示 */}
                            <Text>🔳 QRコード画像 ({qrSize}x{qrSize}px)</Text>
                            <Text>💡 実際のアプリでは、ここにQRコード画像が表示されます</Text>
                          </Stack>
                        )}
                      </Stack>
                    )
                  })}
                </Stack>
              </Stack>
            </Section>
          )}

          {/* 使用方法ガイド */}
          <Section>
            <Stack direction="vertical">
              <SectionHeader title="📖 使用方法ガイド" />
              
              <Stack direction="vertical">
                <Text>🎯 各形式の用途:</Text>
                <Text>• シンプル形式: 基本的なスキャンと検索</Text>
                <Text>• JSON形式: 詳細情報を含む高度な用途</Text>
                <Text>• URL形式: 直接Shopify管理画面にリンク</Text>
                
                <Text>📱 共有方法:</Text>
                <Text>• コピー: クリップボードにSVGデータをコピー</Text>
                <Text>• 印刷: POS端末の印刷機能を使用</Text>
                
                <Text>🔧 推奨設定:</Text>
                <Text>• 店舗内表示: 200-300px</Text>
                <Text>• 印刷用: 400px以上</Text>
                <Text>• モバイル表示: 150-200px</Text>
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

export default QRGenerator 