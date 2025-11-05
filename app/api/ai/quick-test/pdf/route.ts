/**
 * Quick Test PDF Export API
 *
 * 生成された小テストを即座にPDF出力
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import puppeteer from 'puppeteer';
import abcjs from 'abcjs';
import type { QuickTestResult } from '@/lib/ai/quick-test-generator';

export async function POST(req: NextRequest) {
  try {
    // 認証確認
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quickTest } = await req.json() as { quickTest: QuickTestResult };

    if (!quickTest || !quickTest.problems) {
      return NextResponse.json(
        { error: 'Quick test data required' },
        { status: 400 }
      );
    }

    console.log('[QuickTestPDF] Generating PDF for:', quickTest.title);

    // HTMLを生成
    const html = renderQuickTestToHtml(quickTest);

    // Puppeteerでヘッドレスブラウザ起動
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();

    // HTMLをロード
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // PDF生成
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });

    await browser.close();

    console.log('[QuickTestPDF] PDF generated successfully');

    // PDFをレスポンスとして返す
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(quickTest.title)}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[QuickTestPDF] Error:', error);
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
 * 小テストを印刷用HTMLに変換
 */
function renderQuickTestToHtml(quickTest: QuickTestResult): string {
  const problemsHtml = quickTest.problems
    .map((problem, idx) => {
      // ABC記法をSVGにレンダリング
      const container: { innerHTML: string } = { innerHTML: '' };

      try {
        // abcjsのrenderAbc関数を使用してSVGを生成
        abcjs.renderAbc(container as unknown as HTMLElement, problem.abc, {
          responsive: 'resize',
          staffwidth: 500,
          scale: 0.9,
        });

        const svgContent = container.innerHTML || '<p>Failed to render notation</p>';

        return `
          <div class="problem-block ${idx > 0 ? 'page-break-before' : ''}">
            <div class="problem-header">
              <h2 class="problem-number">Problem ${problem.problemNumber}</h2>
              <span class="difficulty-badge difficulty-${problem.difficulty}">
                ${problem.difficulty.toUpperCase()}
              </span>
            </div>

            <h3 class="problem-title">${problem.title}</h3>
            <p class="problem-instruction">${problem.instruction}</p>

            <div class="problem-details">
              <span>Target: Bars ${problem.targetBars.startBar}-${problem.targetBars.endBar}</span>
              <span>Time: ~${problem.estimatedTime}s</span>
            </div>

            <div class="notation-container">
              ${svgContent}
            </div>
          </div>
        `;
      } catch (error) {
        console.error('[QuickTestPDF] Failed to render problem:', error);
        return `
          <div class="problem-block">
            <h2>Problem ${problem.problemNumber}</h2>
            <p class="error">Failed to render notation</p>
          </div>
        `;
      }
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${quickTest.title}</title>
      <style>
        ${getQuickTestPdfStyles()}
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${quickTest.title}</h1>
        <p class="description">${quickTest.description}</p>
        <div class="metadata">
          <span>⏱️ Estimated time: ${quickTest.estimatedTime} minutes</span>
          <span>📊 ${quickTest.problems.length} problems</span>
          <span>🎵 ${quickTest.totalBars} bars total</span>
        </div>
        <p class="date">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      ${problemsHtml}

      <div class="footer">
        <p>Generated with MUED LMS | ${new Date().toLocaleDateString('en-US')}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * PDF用のスタイルシート
 */
function getQuickTestPdfStyles(): string {
  return `
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
    }

    .header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 3px solid #75bc11;
    }

    .title {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 8px 0;
      color: #000;
    }

    .description {
      font-size: 16px;
      color: #6b7280;
      margin: 8px 0 16px 0;
    }

    .metadata {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin: 12px 0;
      font-size: 14px;
      color: #4b5563;
    }

    .date {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 8px;
    }

    .problem-block {
      margin: 24px 0;
      padding: 20px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      page-break-inside: avoid;
    }

    .page-break-before {
      page-break-before: always;
    }

    .problem-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .problem-number {
      font-size: 20px;
      font-weight: bold;
      color: #75bc11;
      margin: 0;
    }

    .difficulty-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .difficulty-high {
      background: #fee2e2;
      color: #991b1b;
    }

    .difficulty-medium {
      background: #fed7aa;
      color: #9a3412;
    }

    .difficulty-low {
      background: #d1fae5;
      color: #065f46;
    }

    .problem-title {
      font-size: 18px;
      font-weight: bold;
      margin: 8px 0;
      color: #111827;
    }

    .problem-instruction {
      font-size: 14px;
      color: #4b5563;
      margin: 8px 0 16px 0;
      line-height: 1.6;
    }

    .problem-details {
      display: flex;
      gap: 16px;
      margin: 12px 0;
      font-size: 13px;
      color: #6b7280;
    }

    .notation-container {
      margin: 16px 0;
      padding: 12px;
      background: #f9fafb;
      border-radius: 6px;
    }

    .notation-container svg {
      max-width: 100%;
      height: auto;
    }

    .error {
      color: #dc2626;
      font-weight: bold;
    }

    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .problem-block {
        page-break-inside: avoid;
      }
    }
  `;
}

/**
 * ファイル名のサニタイズ
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100);
}
