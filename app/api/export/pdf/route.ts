/**
 * PDF Export API
 *
 * Puppeteer + 印刷CSSによる高品質PDF生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import puppeteer from 'puppeteer';
import abcjs from 'abcjs';
import { markdownToHtml } from '@/lib/export/markdown-to-html';
import { extractAbcBlocks } from '@/lib/abc-validator';

interface AiMaterial {
  id: string;
  title: string;
  content: string;
  notation: string | null;
  metadata: any;
}

export async function POST(req: NextRequest) {
  try {
    // 認証確認
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { materialId } = await req.json();

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 });
    }

    // 教材データ取得（実際のDB接続は後で実装）
    // TODO: Replace with actual database query
    const material: AiMaterial = {
      id: materialId,
      title: 'Sample Material',
      content: '# Sample Content\n\nThis is a test.',
      notation: JSON.stringify([]),
      metadata: {
        instrument: 'Piano',
        difficulty: 'intermediate',
        duration: 30,
      },
    };

    // SSRで印刷用HTMLを生成
    const html = await renderMaterialToHtml(material);

    // Puppeteerでヘッドレスブラウザ起動
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Dockerなど制約環境対策
      ],
    });

    const page = await browser.newPage();

    // HTMLをロード
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // 印刷用CSSを適用してPDF生成
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();

    // PDFをレスポンスとして返す
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(material.title)}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[PDF Export] Error:', error);
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 教材を印刷用HTMLに変換
 */
async function renderMaterialToHtml(material: AiMaterial): Promise<string> {
  const abcBlocks = extractAbcBlocks(material.content);

  // ABC記法をSVGにレンダリング
  const notationSvgs = abcBlocks.map((block) => {
    const container = document.createElement('div');
    const renderResult = abcjs.renderAbc(container, block.abc, {
      responsive: 'resize',
      staffwidth: 600,
      scale: 1.0,
    });

    return {
      title: block.title,
      svg: renderResult[0]?.svg || '<p>Failed to render notation</p>',
    };
  });

  // Markdownコンテンツをプレビュー用HTMLに変換
  const contentHtml = markdownToHtml(material.content);

  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${material.title}</title>
      <style>
        ${getPdfStyles()}
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${material.title}</h1>
        <div class="subtitle">
          ${material.metadata?.instrument || ''} |
          ${material.metadata?.difficulty || ''} |
          ${material.metadata?.duration || ''}分
        </div>
        <div class="date">Generated: ${new Date().toLocaleDateString('ja-JP')}</div>
      </div>

      <div class="content">
        ${contentHtml}
      </div>

      ${notationSvgs.map((notation, idx) => `
        <div class="notation-block ${notation.svg.length > 2000 ? 'long' : ''}">
          <h3 class="notation-title">${notation.title}</h3>
          <div class="notation-svg">
            ${notation.svg}
          </div>
        </div>
      `).join('')}

      <div class="footer">
        <p>Generated with MUED LMS | ${new Date().toLocaleDateString('ja-JP')}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * PDF用のスタイルシート
 */
function getPdfStyles(): string {
  return `
    /* ページ設定 */
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    /* フォント設定（OS依存を排除） */
    @font-face {
      font-family: 'NotoSans';
      src: local('Noto Sans JP'), local('Hiragino Sans'), local('Yu Gothic');
      font-weight: normal;
      font-style: normal;
    }

    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      font-family: 'NotoSans', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.8;
      color: #333;
      margin: 0;
      padding: 0;
    }

    /* ヘッダー */
    .header {
      margin-bottom: 24px;
      border-bottom: 3px solid #000;
      padding-bottom: 16px;
    }

    .title {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 8px 0;
      color: #000;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
      margin: 4px 0;
    }

    .date {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }

    /* コンテンツ */
    .content {
      margin: 24px 0;
    }

    .content h1 {
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0 12px;
      color: #000;
    }

    .content h2 {
      font-size: 20px;
      font-weight: bold;
      margin: 18px 0 10px;
      color: #222;
    }

    .content h3 {
      font-size: 16px;
      font-weight: bold;
      margin: 16px 0 8px;
      color: #333;
    }

    .content p {
      margin: 8px 0;
      line-height: 1.8;
    }

    .content ul, .content ol {
      margin: 12px 0;
      padding-left: 24px;
    }

    .content li {
      margin: 4px 0;
    }

    .content code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }

    .content pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
    }

    /* 譜面ブロック */
    .notation-block {
      margin: 32px 0;
      page-break-inside: avoid !important;
      -webkit-column-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* 長い譜面は改ページ許可 */
    .notation-block.long {
      page-break-inside: auto;
    }

    .notation-title {
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 12px 0;
      color: #000;
    }

    .notation-svg {
      margin: 12px 0;
    }

    .notation-svg svg {
      max-width: 100%;
      height: auto;
    }

    /* フッター */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 10px;
      color: #999;
    }

    /* 印刷用の調整 */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .notation-block {
        page-break-inside: avoid !important;
      }
    }
  `;
}

/**
 * ファイル名のサニタイズ
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_\-\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '') // 英数字+日本語のみ
    .replace(/\s+/g, '-')
    .substring(0, 100);
}
