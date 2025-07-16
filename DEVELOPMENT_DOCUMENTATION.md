# Shopify POS QR注文スキャナー - 開発ドキュメント

## プロジェクト概要

### 目的
Shopify POSで使用できるQRコードスキャナーを開発し、QRコードをスキャンして注文情報を表示するUI拡張機能を作成する。

### プロジェクト名
`PJ_ShopifyPOS-QRapp`

### 開発期間
2024年12月

## 技術スタック

### フレームワーク・ライブラリ
- **Remix** - Web アプリケーションフレームワーク
- **React** - UIライブラリ
- **TypeScript** - 型安全性確保
- **Shopify UI Extensions** - POS UI拡張機能
- **Prisma** - データベースORM
- **Vite** - ビルドツール

### API・サービス
- **Shopify Admin GraphQL API** - 注文データ取得
- **Shopify POS UI Extensions API** - カメラスキャナー機能
- **Cloudflare** - 開発時プレビュー環境

## プロジェクト構成

```
pos-qr-extension/
├── app/                          # Remix アプリケーション
│   ├── routes/
│   │   ├── api.orders.$id.tsx   # 注文データ取得API（削除済み）
│   │   └── ...
│   ├── db.server.ts
│   ├── shopify.server.ts
│   └── ...
├── extensions/
│   └── qr-order-scanner/        # POS UI Extension
│       └── src/
│           ├── Modal.tsx        # メインコンポーネント
│           └── Modal_with_qr.tsx # QR機能実装版（削除済み）
├── prisma/                      # データベース設定
├── shopify.app.toml            # Shopify アプリ設定
└── package.json
```

## 実装機能一覧

### ✅ 完了した機能

#### 1. QRコードスキャン機能
- **CameraScanner コンポーネント**: Shopify POS UI ExtensionsのCameraScannerを使用
- **リアルタイムスキャン**: `useScannerDataSubscription`フックでスキャンデータを受信
- **マルチフォーマット対応**: 複数のQRコード形式に対応
  - 注文番号形式: `#1179`
  - 数値ID形式: `6668391842074`
  - URL形式: `order_id=6668391842074`
  - JSON形式: `{"orderId": "6668391842074"}`

#### 2. 手動入力機能
- **フォールバック手段**: カメラが利用できない場合の代替手段
- **入力検証**: 注文IDの形式チェック
- **リアルタイム検索**: 入力と同時に検索実行

#### 3. 注文データ取得API
- **Remix APIエンドポイント**: `/api/orders/$id`
- **GraphQL クエリ**: Shopify Admin APIから包括的な注文データを取得
- **取得データ項目**:
  - 顧客情報（名前、メール）
  - 注文詳細（合計金額、ステータス、商品リスト）
  - 商品情報（タイトル、数量、価格、画像）
  - タイムスタンプとメタデータ

#### 4. エラーハンドリングとフォールバック
- **包括的エラー処理**: API障害時の適切なメッセージ表示
- **モックデータフォールバック**: API失敗時の代替データ表示
- **トースト通知**: ユーザーフレンドリーな通知システム

#### 5. デバッグ・トラブルシューティング機能
- **詳細ステータス表示**: カメラ状態、スキャン状況の監視
- **カメラリセット機能**: カメラ起動問題の解決手段
- **コンソールログ**: 開発時のデバッグ情報出力

#### 6. 注文情報表示機能
- **注文サマリー表示**: 注文基本情報の一覧表示
- **詳細情報表示**: 顧客情報、商品リスト、価格詳細
- **ステータス表示**: 注文状況とフルフィルメント状態
- **レスポンシブレイアウト**: 各種画面サイズに対応した表示

### 🔄 開発中・改善された機能

#### 1. レスポンシブUI
- **状態管理**: 複数の UI状態（スキャン中、ローディング、エラー、データ表示）
- **条件付きレンダリング**: 状況に応じた最適なUI表示
- **ビジュアルフィードバック**: ローディングインジケーターとステータス表示

#### 2. カメラ機能の最適化
- **レイアウト調整**: カメラ表示領域の配置最適化
- **起動タイミング制御**: カメラの安定した起動処理
- **視覚的スキャンエリア**: L字型ターゲットフレーム表示

### 🚧 計画中の機能

#### 1. 注文詳細ページ遷移機能
- **遷移ボタン**: 注文サマリー表示後に「詳細を見る」ボタンを配置
- **ディープリンク**: Shopify管理画面の該当注文ページへの直接遷移
- **実装方法**: 
  - POS UI Extensions の `Navigator` コンポーネントを使用
  - Shopify Admin URLスキーマ: `https://{shop-domain}/admin/orders/{order-id}`
  - 適切な権限チェックとアクセス制御
- **UX改善**: 
  - サマリー → 詳細への自然な遷移フロー
  - 戻るボタンでの元画面復帰機能

## 技術的課題と解決策

### 課題1: カメラスキャナーAPI の実装
**問題**: 初期実装でCameraScannerコンポーネントの正しい使用方法が不明
**解決策**: 
- Shopify公式ドキュメント調査
- `useScannerDataSubscription`フックの正しい実装
- リアルタイムデータ受信の実装

### 課題2: TypeScript型エラー
**問題**: GraphQLレスポンスとUIコンポーネントの型不整合
**解決策**:
- 適切な型定義の追加
- `TextVariant`型の正しい使用
- `any`型の段階的な型安全化

### 課題3: カメラ起動の不安定性
**問題**: 開発環境でカメラが起動しない、または起動が遅い
**解決策**:
- カメラリセット機能の追加
- 手動入力での代替手段提供
- 詳細なデバッグ情報表示

### 課題4: API統合とエラーハンドリング
**問題**: Shopify Admin API呼び出し時の認証とエラー処理
**解決策**:
- 適切な認証ヘッダー設定
- 包括的なエラーキャッチング
- フォールバックデータの実装

## API仕様

### GraphQL クエリ（注文データ取得）
```graphql
query getOrder($id: ID!) {
  order(id: $id) {
    id
    name
    email
    customer {
      displayName
    }
    totalPrice {
      amount
      currencyCode
    }
    displayFulfillmentStatus
    lineItems(first: 10) {
      edges {
        node {
          title
          quantity
          variant {
            price {
              amount
              currencyCode
            }
            image {
              url
            }
          }
        }
      }
    }
    createdAt
    updatedAt
  }
}
```

### QRコード解析ロジック
```typescript
const extractOrderIdFromQR = (qrContent: string): string | null => {
  // パターン1: 注文番号形式 (#TEST-6668391842074)
  const orderNumberMatch = qrContent.match(/#([A-Z0-9-]+)/i)
  if (orderNumberMatch) {
    const orderNumber = orderNumberMatch[1]
    if (orderNumber.startsWith('TEST-')) {
      return orderNumber.replace('TEST-', '')
    }
    return orderNumber
  }
  
  // パターン2: 数字のみ (6668391842074)
  const numberMatch = qrContent.match(/^\d+$/)
  if (numberMatch) return qrContent
  
  // パターン3: URL形式 (order_id=6668391842074)
  const urlMatch = qrContent.match(/order[_-]?id[=:](\d+)/i)
  if (urlMatch) return urlMatch[1]
  
  // パターン4: JSON形式
  try {
    const json = JSON.parse(qrContent)
    return json.orderId || json.order_id || json.id
  } catch (e) {
    return null
  }
}
```

## テスト・検証方法

### 開発環境
- **Shopify CLI**: ローカル開発サーバー
- **Test Store**: `test-wagatsuma.myshopify.com`
- **Preview URL**: Cloudflare経由のプレビュー環境

### テストデータ
- **実際の注文ID**: `6622754046234`, `6668391842074`
- **モックデータ**: API障害時のフォールバック

### テストシナリオ
1. **QRコードスキャン**: 実際のQRコードでのスキャンテスト
2. **手動入力**: 注文IDの直接入力テスト
3. **エラーケース**: 無効なIDや API障害のテスト
4. **UI状態遷移**: 各種状態の表示確認

## デプロイメント情報

### 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# Shopify CLI でのプレビュー
shopify app dev
```

### 環境変数
- `SHOPIFY_API_KEY`: アプリケーションAPIキー
- `SHOPIFY_API_SECRET`: アプリケーションシークレット
- `DATABASE_URL`: データベース接続URL

## パフォーマンス考慮事項

### 最適化実装
- **遅延読み込み**: 必要な時のみカメラを起動
- **メモリ管理**: 不要なデータの適切なクリアアップ
- **ネットワーク効率**: GraphQLクエリの最適化

### 制限事項
- **カメラ互換性**: 一部の環境でカメラ起動に制限
- **API制限**: Shopify Admin APIのレート制限
- **ブラウザ依存**: モバイルブラウザでの動作差異

## 今後の改善点

### 機能追加候補
1. **注文詳細ページ遷移**: 注文サマリー表示後、詳細ページへの遷移ボタン追加
2. **バッチスキャン**: 複数QRコードの連続処理
3. **履歴機能**: スキャン履歴の保存と表示
4. **オフライン対応**: ネットワーク断絶時の基本機能
5. **多言語対応**: UI の国際化対応

### 技術的改善
1. **型安全性**: より厳密なTypeScript型定義
2. **テスト coverage**: 単体テスト・統合テストの充実
3. **エラー分析**: より詳細なエラー分類と対応
4. **パフォーマンス**: レンダリング最適化

## 参考資料

### Shopify ドキュメント
- [POS UI Extensions - CameraScanner](https://shopify.dev/docs/api/pos-ui-extensions/2025-04/components/camerascanner)
- [Shopify Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)

### 技術記事
- [Remix Documentation](https://remix.run/docs)
- [React + TypeScript Best Practices](https://react.dev/learn/typescript)

## プロジェクト状態

### 現在のステータス: 基本機能完了 ✅
- QRスキャン機能: 実装完了
- 手動入力機能: 実装完了
- API統合: 実装完了
- エラーハンドリング: 実装完了
- デバッグ機能: 実装完了

### 次のマイルストーン
1. **注文詳細ページ遷移機能の実装**
   - 注文サマリー表示後の詳細ページ遷移ボタン追加
   - Shopifyのオーダーページへのディープリンク実装
   - 管理者と店舗スタッフ向けの適切な権限設定
2. プロダクション環境でのテスト
3. ユーザビリティテストの実施
4. パフォーマンス最適化
5. 本格運用への準備

---

**作成日**: 2024年12月19日（JST）  
**最終更新**: 2024年12月19日（JST）  
**作成者**: 開発チーム 