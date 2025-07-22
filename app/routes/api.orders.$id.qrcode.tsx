import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// QRCode生成ライブラリを想定（実際にはqrcode npmパッケージが必要）
// npm install qrcode @types/qrcode

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Shopify認証
    const { admin } = await authenticate.admin(request);
    
    const orderId = params.id;
    if (!orderId) {
      return new globalThis.Response("注文IDが指定されていません", { status: 400 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'simple'; // simple, json, url
    const size = parseInt(url.searchParams.get('size') || '200'); // QRコードサイズ

    console.log('QRコード生成リクエスト:', { orderId, format, size });

    // QRコードに埋め込むデータを形式に応じて生成
    let qrData: string;
    
    switch (format) {
      case 'json':
        qrData = JSON.stringify({
          orderId: orderId,
          type: 'shopify_order',
          timestamp: new Date().toISOString()
        });
        break;
      
      case 'url':
        // 注文詳細ページのURLを生成（実際のShopify Admin URLまたはカスタムURL）
        qrData = `https://admin.shopify.com/store/your-store/orders/${orderId}`;
        break;
        
      case 'simple':
      default:
        qrData = `#${orderId}`;
        break;
    }

    console.log('QRデータ:', qrData);

    // 実際のQRコード生成（qrcodeライブラリを使用）
    // この部分は実際の実装では qrcode npm パッケージを使用
    const qrCodeSVG = generateQRCodeSVG(qrData, size);
    
    // SVGレスポンスとして返す
    return new globalThis.Response(qrCodeSVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
        'Content-Disposition': `inline; filename="order-${orderId}-qr.svg"`
      }
    });

  } catch (error) {
    console.error('QRコード生成エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return new globalThis.Response(`QRコード生成エラー: ${errorMessage}`, { 
      status: 500 
    });
  }
}

// シンプルなQRコードSVG生成関数（実際のプロダクションでは qrcode ライブラリを使用）
function generateQRCodeSVG(data: string, size: number): string {
  // これは模擬実装です。実際の実装では qrcode ライブラリを使用してください
  // npm install qrcode @types/qrcode
  
  const gridSize = 25; // QRコードのグリッドサイズ
  const cellSize = size / gridSize;
  
  // 簡単なQRコード風のパターンを生成（実際のQRコードではありません）
  let pattern = '';
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // データのハッシュ値を基にパターンを生成
      const hash = simpleHash(data + x + y);
      if (hash % 2 === 0) {
        pattern += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  }
  
  // ファインダーパターン（QRコードの角の四角）を追加
  const finderPattern = `
    <rect x="0" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
    <rect x="${cellSize}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
    <rect x="${cellSize * 2}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
    
    <rect x="${cellSize * (gridSize - 7)}" y="0" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
    <rect x="${cellSize * (gridSize - 6)}" y="${cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
    <rect x="${cellSize * (gridSize - 5)}" y="${cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
    
    <rect x="0" y="${cellSize * (gridSize - 7)}" width="${cellSize * 7}" height="${cellSize * 7}" fill="black"/>
    <rect x="${cellSize}" y="${cellSize * (gridSize - 6)}" width="${cellSize * 5}" height="${cellSize * 5}" fill="white"/>
    <rect x="${cellSize * 2}" y="${cellSize * (gridSize - 5)}" width="${cellSize * 3}" height="${cellSize * 3}" fill="black"/>
  `;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="white"/>
      ${pattern}
      ${finderPattern}
      <text x="${size / 2}" y="${size - 10}" text-anchor="middle" font-family="Arial" font-size="10" fill="gray">Order #${data.replace('#', '')}</text>
    </svg>
  `.trim();
}

// 簡単なハッシュ関数
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash);
} 