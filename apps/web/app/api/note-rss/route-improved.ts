// app/api/note-rss/route-improved.ts
import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

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
    category: 'recording',
    keywords: ['レコーディング', '録音']
  },
  {
    id: 'composition',
    title: 'MUED公開教材〜作曲〜',
    description: '作曲に関する教材をまとめたマガジン',
    rssUrl: 'https://note.com/mued_glasswerks/m/me618d465f0ef/rss',
    category: 'composition',
    keywords: ['作曲']
  },
  {
    id: 'songwriting',
    title: 'MUED公開教材〜作詞〜',
    description: '作詞に関する教材をまとめたマガジン',
    rssUrl: 'https://note.com/mued_glasswerks/m/m4f79b7131ae7/rss',
    category: 'songwriting',
    keywords: ['作詞']
  }
];

// ユーザーRSSのURL
const USER_RSS_URL = 'https://note.com/mued_glasswerks/rss';

// 簡易的なメモリキャッシュ
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

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

// キャッシュから取得
function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

// キャッシュに保存
function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ユーザーRSSを取得
async function fetchUserRSS(): Promise<CustomItem[]> {
  const cacheKey = 'user_rss';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const feed: CustomFeed = await parser.parseURL(USER_RSS_URL);
    const items = feed.items || [];
    setCache(cacheKey, items);
    return items;
  } catch (error) {
    console.error('ユーザーRSS取得エラー:', error);
    return [];
  }
}

// 記事をカテゴリでフィルタリング
function filterItemsByCategory(items: CustomItem[], magazine: typeof MAGAZINES[0]): CustomItem[] {
  return items.filter(item => {
    const title = item.title || '';
    return magazine.keywords.some(keyword => 
      title.includes(keyword) && title.includes('【MUED教材】')
    );
  });
}

// 記事を処理
function processItem(item: CustomItem, magazine: typeof MAGAZINES[0]) {
  const content = item['content:encoded'] || item.contentSnippet || item.content || '';
  const description = generateDescription(content);
  const image = extractImage(content);
  
  return {
    title: item.title || 'タイトルなし',
    link: item.link || '',
    description,
    pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
    image,
    contentSnippet: description,
    author: item.creator || item.author || 'MUED Glasswerks',
    magazine: magazine.id,
    category: magazine.category
  };
}

// 特定マガジンのRSSを取得（改善版）
async function fetchMagazineRSSImproved(magazine: typeof MAGAZINES[0]) {
  try {
    // マガジンRSSとユーザーRSSを並行取得
    const [magazineFeed, userItems] = await Promise.all([
      parser.parseURL(magazine.rssUrl).catch(() => null),
      fetchUserRSS()
    ]);

    // マガジンRSSの記事を処理
    const magazineItems = magazineFeed?.items || [];
    const processedMagazineItems = magazineItems.map(item => processItem(item, magazine));

    // ユーザーRSSから該当カテゴリの記事をフィルタリング
    const filteredUserItems = filterItemsByCategory(userItems, magazine);
    const processedUserItems = filteredUserItems.map(item => processItem(item, magazine));

    // 重複を除去して統合
    const itemsMap = new Map<string, any>();
    
    // マガジンの記事を優先
    processedMagazineItems.forEach(item => {
      itemsMap.set(item.link, item);
    });
    
    // ユーザーRSSの記事を追加（重複しないもののみ）
    processedUserItems.forEach(item => {
      if (!itemsMap.has(item.link)) {
        itemsMap.set(item.link, { ...item, source: 'user_rss' });
      }
    });

    // 配列に変換して日付でソート
    const combinedItems = Array.from(itemsMap.values())
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // ログ出力（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log(`${magazine.id}: マガジンRSS ${magazineItems.length}記事, ユーザーRSS追加 ${combinedItems.length - magazineItems.length}記事`);
    }

    return {
      success: true,
      magazine,
      items: combinedItems,
      count: combinedItems.length,
      magazineCount: magazineItems.length,
      userRssAddedCount: combinedItems.length - magazineItems.length
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
    const forceRefresh = searchParams.get('refresh') === 'true';

    // キャッシュをクリア（必要に応じて）
    if (forceRefresh) {
      cache.clear();
    }

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

      const cacheKey = `magazine_${magazineId}`;
      const cached = getFromCache(cacheKey);
      if (cached && !forceRefresh) {
        return NextResponse.json({ ...cached, cached: true });
      }

      const result = await fetchMagazineRSSImproved(magazine);
      setCache(cacheKey, result);
      return NextResponse.json(result);
    }

    // 全マガジンの取得
    console.log('全マガジンのRSSフィードを取得中...');
    
    const cacheKey = 'all_magazines';
    const cached = getFromCache(cacheKey);
    if (cached && !forceRefresh) {
      return NextResponse.json({ ...cached, cached: true });
    }
    
    const results = await Promise.allSettled(
      MAGAZINES.map(magazine => fetchMagazineRSSImproved(magazine))
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

    const response = {
      success: true,
      magazines,
      totalItems,
      successCount,
      totalMagazines: MAGAZINES.length,
      lastUpdated: new Date().toISOString()
    };

    setCache(cacheKey, response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('API エラー:', error);
    
    // エラー時もフォールバックデータを返す（既存の実装を維持）
    const fallbackData = MAGAZINES.map(magazine => ({
      success: false,
      magazine,
      items: [
        {
          title: `${magazine.title}のサンプル記事 - 基礎編`,
          link: "https://note.com/mued_glasswerks",
          description: `${magazine.description}のサンプル記事です。`,
          pubDate: new Date().toISOString(),
          image: "https://images.pexels.com/photos/5561923/pexels-photo-5561923.jpeg",
          contentSnippet: `${magazine.description}のサンプル...`,
          author: "MUED Glasswerks",
          magazine: magazine.id,
          category: magazine.category
        }
      ],
      count: 1,
      error: 'RSSフィード取得失敗'
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