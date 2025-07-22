import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log('🔐 認証テストAPI呼び出し');
    console.log('🌐 リクエストURL:', request.url);

    // Shopify認証を試行
    const { admin, session } = await authenticate.admin(request);
    
    console.log('✅ Shopify認証成功');
    console.log('🏪 セッション情報:', {
      shop: session.shop,
      hasAccessToken: Boolean(session.accessToken),
      scope: session.scope,
      isOnline: session.isOnline
    });

    // 基本的なGraphQLクエリを実行
    const basicQuery = `
      query {
        shop {
          id
          name
          email
          domain
        }
      }
    `;

    console.log('📡 基本GraphQLクエリ実行中...');
    const response = await admin.graphql(basicQuery);
    const result = await response.json();

    console.log('📊 GraphQLレスポンス:', {
      hasData: Boolean(result.data),
      hasErrors: Boolean(result.errors)
    });

    if (result.errors) {
      console.error('🚨 GraphQLエラー:', result.errors);
      return json({
        success: false,
        step: 'graphql',
        error: 'GraphQLクエリでエラーが発生しました',
        details: result.errors,
        session: {
          shop: session.shop,
          hasAccessToken: Boolean(session.accessToken),
          scope: session.scope
        }
      }, { status: 400 });
    }

    return json({
      success: true,
      message: 'Shopify認証とGraphQLクエリが正常に動作しています',
      timestamp: new Date().toISOString(),
      session: {
        shop: session.shop,
        hasAccessToken: Boolean(session.accessToken),
        scope: session.scope,
        isOnline: session.isOnline
      },
      shopData: result.data?.shop,
      test: {
        authentication: '✅ 成功',
        graphqlConnection: '✅ 成功',
        dataRetrieval: '✅ 成功'
      }
    });

  } catch (error) {
    console.error('🚨 認証テストAPIエラー:', error);
    
    const errorInfo = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined
    };

    let errorStep = 'unknown';
    let errorDescription = '不明なエラーが発生しました';

    if (errorInfo.message.includes('authentication') || errorInfo.message.includes('session')) {
      errorStep = 'authentication';
      errorDescription = 'Shopify認証に失敗しました';
    } else if (errorInfo.message.includes('graphql') || errorInfo.message.includes('GraphQL')) {
      errorStep = 'graphql';
      errorDescription = 'GraphQLクエリの実行に失敗しました';
    } else if (errorInfo.message.includes('network') || errorInfo.message.includes('fetch')) {
      errorStep = 'network';
      errorDescription = 'ネットワーク接続に失敗しました';
    }

    return json({
      success: false,
      step: errorStep,
      error: errorDescription,
      details: errorInfo,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        authentication: [
          '1. アプリがShopifyに正しくインストールされているか確認',
          '2. 環境変数SHOPIFY_API_KEYとSHOPIFY_API_SECRETが設定されているか確認', 
          '3. ショップドメインが正しいか確認'
        ],
        graphql: [
          '1. APIアクセス権限（スコープ）が正しく設定されているか確認',
          '2. ショップにアクセス可能な状態か確認',
          '3. Shopifyのサービス状況を確認'
        ],
        network: [
          '1. インターネット接続を確認',
          '2. ファイアウォール設定を確認',
          '3. プロキシ設定を確認'
        ]
      }
    }, { status: 500 });
  }
} 