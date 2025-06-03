# note.com RSSフィード調査結果と改善提案

## 調査結果

### 問題の詳細
- **問題の記事**: 「【MUED教材】【公開】作曲〜第二章〜メロディ」
- **URL**: https://note.com/mued_glasswerks/n/nae03fd284ca0
- **公開日時**: 2025年5月28日 12:51:21 JST
- **現象**: マガジンのRSSフィードには含まれていないが、ユーザーのRSSフィードには存在する

### RSSフィードの現状

#### 1. マガジンRSSフィードの状況
- **作曲マガジンRSS**: `https://note.com/mued_glasswerks/m/me618d465f0ef/rss`
- **記事数**: 4記事のみ（第一章、第三章、第四章基礎編、第四章実践編）
- **問題**: 第二章が欠落している

#### 2. ユーザーRSSフィードの状況
- **ユーザーRSS**: `https://note.com/mued_glasswerks/rss`
- **状況**: 第二章の記事が正常に含まれている

### 原因の可能性

1. **マガジンへの記事追加の遅延または失敗**
   - 記事がマガジンに正しく追加されていない可能性
   - マガジンRSSの更新タイミングの問題

2. **noteのRSSフィード制限**
   - マガジンRSSは最新記事のみを配信する仕様の可能性
   - 記事数の制限（現在4記事のみ表示）

3. **時系列の問題**
   - 第二章（12:51）→第三章（13:17）→第四章基礎（21:20）→第四章実践（翌日0:47）
   - 短時間に複数投稿した際の処理の問題

## 改善提案

### 1. 短期的な対策

#### A. ユーザーRSSを併用した実装
```typescript
// app/api/note-rss/route.ts の改善案

// ユーザーRSSも含めた取得
const USER_RSS_URL = 'https://note.com/mued_glasswerks/rss';

async function fetchUserRSS() {
  try {
    const feed = await parser.parseURL(USER_RSS_URL);
    return feed.items;
  } catch (error) {
    console.error('ユーザーRSS取得エラー:', error);
    return [];
  }
}

// マガジンRSSとユーザーRSSを統合
async function fetchCombinedRSS(magazine: typeof MAGAZINES[0]) {
  const [magazineItems, userItems] = await Promise.all([
    fetchMagazineRSS(magazine),
    fetchUserRSS()
  ]);
  
  // ユーザーRSSからマガジンに関連する記事をフィルタリング
  const filteredUserItems = userItems.filter(item => {
    const title = item.title || '';
    return title.includes(magazine.category === 'composition' ? '作曲' : 
           magazine.category === 'recording' ? 'レコーディング' : '作詞');
  });
  
  // 重複を除去して統合
  const combinedItems = [...magazineItems.items];
  filteredUserItems.forEach(userItem => {
    if (!combinedItems.find(item => item.link === userItem.link)) {
      combinedItems.push(userItem);
    }
  });
  
  // 日付でソート
  return combinedItems.sort((a, b) => 
    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}
```

#### B. キャッシュ戦略の実装
```typescript
// Redisまたはメモリキャッシュを使用
import { LRUCache } from 'lru-cache';

const rssCache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5分間のキャッシュ
});

async function getCachedRSS(key: string, fetcher: () => Promise<any>) {
  const cached = rssCache.get(key);
  if (cached) return cached;
  
  const fresh = await fetcher();
  rssCache.set(key, fresh);
  return fresh;
}
```

### 2. 長期的な改善

#### A. 記事数制限の撤廃
```typescript
// 現在のslice(0, 20)を削除または増加
const items = feed.items.map((item: CustomItem) => {
  // 全記事を処理（または必要に応じて制限を増やす）
});
```

#### B. エラーハンドリングとログの強化
```typescript
async function fetchMagazineRSS(magazine: typeof MAGAZINES[0]) {
  try {
    const feed = await parser.parseURL(magazine.rssUrl);
    
    // 取得した記事数をログ
    console.log(`${magazine.id}: ${feed.items.length}記事を取得`);
    
    // 記事タイトルをログ（デバッグ用）
    if (process.env.NODE_ENV === 'development') {
      feed.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.title}`);
      });
    }
    
    return { success: true, items: processedItems };
  } catch (error) {
    // 詳細なエラーログ
    console.error(`マガジン ${magazine.id} の取得エラー:`, {
      url: magazine.rssUrl,
      error: error instanceof Error ? error.message : '不明なエラー',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return { success: false, error };
  }
}
```

#### C. 定期的な整合性チェック
```typescript
// 定期的にマガジンとユーザーRSSの差分をチェック
async function checkRSSConsistency() {
  for (const magazine of MAGAZINES) {
    const magazineItems = await fetchMagazineRSS(magazine);
    const userItems = await fetchUserRSS();
    
    // カテゴリに基づいてユーザー記事をフィルタ
    const relevantUserItems = filterByCategory(userItems, magazine.category);
    
    // 差分を検出
    const missingInMagazine = relevantUserItems.filter(userItem =>
      !magazineItems.items.find(magItem => magItem.link === userItem.link)
    );
    
    if (missingInMagazine.length > 0) {
      console.warn(`${magazine.id}で欠落している記事:`, missingInMagazine);
      // 通知やアラートを送信
    }
  }
}
```

### 3. 代替案

#### A. note APIの直接利用（可能な場合）
- noteが提供するAPIがあれば、それを使用してより確実な記事取得を実現

#### B. スクレイピングの検討（最終手段）
- RSSフィードが不安定な場合、Webページから直接情報を取得
- ただし、利用規約とパフォーマンスに注意

#### C. 手動管理システムの構築
- 記事URLを手動でデータベースに登録
- RSSフィードと併用して確実性を向上

## 推奨実装順序

1. **即座に実装**: ユーザーRSSとの統合
2. **次に実装**: キャッシュ戦略
3. **検証後実装**: 記事数制限の調整
4. **継続的改善**: ログとモニタリングの強化

## まとめ

noteのマガジンRSSフィードには記事の欠落問題があることが判明しました。これは、マガジンへの記事追加のタイミングやnoteのRSSフィード生成の仕様に起因する可能性があります。

短期的にはユーザーRSSとの統合により問題を回避し、長期的にはより堅牢なシステムの構築を推奨します。