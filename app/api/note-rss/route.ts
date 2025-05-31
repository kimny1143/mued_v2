// app/api/note-rss/route.ts
// 先にnpm install rss-parserが必要です
import Parser from 'rss-parser';
import { NextResponse } from 'next/server';

type CustomFeed = Parser.Output<CustomItem>;
type CustomItem = Parser.Item & {
  'content:encoded'?: string;
  'content:encodedSnippet'?: string;
  author?: string;
};

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

export async function GET() {
  try {
    const rssUrl = 'https://note.com/mued_glasswerks/rss';
    
    console.log('RSSフィードを取得中:', rssUrl);
    
    const feed: CustomFeed = await parser.parseURL(rssUrl);
    
    const items = feed.items.slice(0, 12).map((item: CustomItem) => {
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
        author: item.creator || item.author || 'MUED Glasswerks'
      };
    });

    return NextResponse.json({
      success: true,
      channel: {
        title: feed.title || 'MUED Glasswerks',
        description: feed.description || '',
        link: feed.link || 'https://note.com/mued_glasswerks'
      },
      items,
      lastUpdated: new Date().toISOString(),
      totalItems: items.length
    });

  } catch (error) {
    console.error('RSS取得エラー:', error);
    
    // フォールバック: 静的なダミーデータを返す
    const fallbackItems = [
      {
        title: "音楽理論の基礎講座",
        link: "https://note.com/mued_glasswerks",
        description: "音楽理論の基礎について詳しく解説します。初心者の方にもわかりやすく説明しています。",
        pubDate: new Date().toISOString(),
        image: "https://images.pexels.com/photos/5561923/pexels-photo-5561923.jpeg",
        contentSnippet: "音楽理論の基礎について...",
        author: "MUED Glasswerks"
      },
      {
        title: "DTM制作のコツ",
        link: "https://note.com/mued_glasswerks",
        description: "DAWを使った楽曲制作のポイントを解説。効率的な制作フローを身につけましょう。",
        pubDate: new Date(Date.now() - 86400000).toISOString(),
        image: "https://images.pexels.com/photos/164938/pexels-photo-164938.jpeg",
        contentSnippet: "DAWを使った楽曲制作...",
        author: "MUED Glasswerks"
      }
    ];

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      items: fallbackItems, // エラー時もコンテンツを表示
      lastUpdated: new Date().toISOString(),
      fallback: true
    }, { status: 200 }); // 200で返してフロントエンドでエラー表示
  }
}