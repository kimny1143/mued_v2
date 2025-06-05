// app/api/note-rss/route.ts
import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

// このルートは動的である必要があるため、明示的に指定
export const dynamic = 'force-dynamic';

type CustomFeed = Parser.Output<CustomItem>;
type CustomItem = Parser.Item & {
  'content:encoded'?: string;
  'content:encodedSnippet'?: string;
  author?: string;
};

// マガジン設定
const MAGAZINES = [
  {
    id: 'recording',
    title: 'MUED公開教材〜録音〜',
    description: 'レコーディングに関する教材をまとめたマガジン',
    rssUrl: 'https://note.com/mued_glasswerks/m/m6c6d04036790/rss',
    category: 'recording'
  },
  {
    id: 'composition',
    title: 'MUED公開教材〜作曲〜',
    description: '作曲に関する教材をまとめたマガジン',
    rssUrl: 'https://note.com/mued_glasswerks/m/me618d465f0ef/rss',
    category: 'composition'
  },
  {
    id: 'songwriting',
    title: 'MUED公開教材〜作詞〜',
    description: '作詞に関する教材をまとめたマガジン',
    rssUrl: 'https://note.com/mued_glasswerks/m/m4f79b7131ae7/rss',
    category: 'songwriting'
  }
];

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'content:encodedSnippet', 'author']
  }
});

// HTMLタグを除去してプレーンテキストに変換
function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// 画像URLを抽出
function extractImage(content: string): string | undefined {
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  // OGPの画像も試す
  const ogMatch = content.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  return ogMatch ? ogMatch[1] : undefined;
}

// 説明文を生成
function generateDescription(content: string, maxLength: number = 150): string {
  const plainText = stripHtml(content);
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substring(0, maxLength).trim() + '...';
}

// 読了時間を抽出
function extractReadingTime(content: string): number | undefined {
  // パターン: （読了：約X分）または（読了：X分）
  const patterns = [
    /（読了：約(\d+)分）/,
    /（読了：(\d+)分）/,
    /\(読了：約(\d+)分\)/,
    /\(読了：(\d+)分\)/
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const minutes = parseInt(match[1], 10);
      // 妥当性チェック: 1〜999分の範囲内
      if (minutes > 0 && minutes < 1000) {
        return minutes;
      }
    }
  }
  
  return undefined;
}

// 特定マガジンのRSSを取得
async function fetchMagazineRSS(magazine: typeof MAGAZINES[0]) {
  try {
    const feed: CustomFeed = await parser.parseURL(magazine.rssUrl);
    
    const items = feed.items.slice(0, 20).map((item: CustomItem) => {
      const content = item['content:encoded'] || item.contentSnippet || item.content || '';
      const description = generateDescription(content);
      const image = extractImage(content);
      const readingTime = extractReadingTime(content);
      
      return {
        title: item.title || 'タイトルなし',
        link: item.link || '',
        description,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        image,
        contentSnippet: description,
        author: item.creator || item.author || 'MUED Glasswerks',
        magazine: magazine.id,
        category: magazine.category,
        readingTime
      };
    });

    return {
      success: true,
      magazine,
      items,
      count: items.length
    };
  } catch (error) {
    console.error(`マガジン ${magazine.id} の取得エラー:`, error);
    return {
      success: false,
      magazine,
      items: [],
      count: 0,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const magazineId = searchParams.get('magazine');

    // 特定のマガジンのみ取得
    if (magazineId) {
      const magazine = MAGAZINES.find(m => m.id === magazineId);
      if (!magazine) {
        return NextResponse.json({
          success: false,
          error: 'マガジンが見つかりません',
          magazines: MAGAZINES.map(m => ({ id: m.id, title: m.title }))
        }, { status: 400 });
      }

      const result = await fetchMagazineRSS(magazine);
      return NextResponse.json(result);
    }

    // 全マガジンの取得
    console.log('全マガジンのRSSフィードを取得中...');
    
    const results = await Promise.allSettled(
      MAGAZINES.map(magazine => fetchMagazineRSS(magazine))
    );

    const magazines = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          magazine: MAGAZINES[index],
          items: [],
          count: 0,
          error: result.reason?.message || '不明なエラー'
        };
      }
    });

    const totalItems = magazines.reduce((sum, mag) => sum + mag.count, 0);
    const successCount = magazines.filter(mag => mag.success).length;

    return NextResponse.json({
      success: true,
      magazines,
      totalItems,
      successCount,
      totalMagazines: MAGAZINES.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('API エラー:', error);
    
    // フォールバック: サンプルデータを返す
    const fallbackData = MAGAZINES.map(magazine => ({
      success: false,
      magazine,
      items: [
        {
          title: `${magazine.title}のサンプル記事 - 基礎編`,
          link: "https://note.com/mued_glasswerks",
          description: `${magazine.description}のサンプル記事です。実際の教材では詳しい解説とともに実践的な内容をお届けします。`,
          pubDate: new Date().toISOString(),
          image: "https://images.pexels.com/photos/5561923/pexels-photo-5561923.jpeg",
          contentSnippet: `${magazine.description}のサンプル...`,
          author: "MUED Glasswerks",
          magazine: magazine.id,
          category: magazine.category,
          readingTime: 10
        },
        {
          title: `${magazine.title}のサンプル記事 - 応用編`,
          link: "https://note.com/mued_glasswerks",
          description: `${magazine.description}の応用編です。より実践的な内容をカバーしています。`,
          pubDate: new Date(Date.now() - 86400000).toISOString(),
          image: "https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg",
          contentSnippet: `${magazine.description}の応用編...`,
          author: "MUED Glasswerks",
          magazine: magazine.id,
          category: magazine.category,
          readingTime: 15
        }
      ],
      count: 2,
      error: 'RSSフィード取得失敗（サンプルデータ表示中）'
    }));

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      magazines: fallbackData,
      totalItems: fallbackData.length,
      successCount: 0,
      totalMagazines: MAGAZINES.length,
      fallback: true,
      lastUpdated: new Date().toISOString()
    }, { status: 200 });
  }
}