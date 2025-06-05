/**
 * 自然順ソートのためのユーティリティ関数
 * 日本語の連番パターンを認識して正しい順序でソート
 */

export type SortMethod = 
  | 'date-desc'    // 日付降順（デフォルト）
  | 'date-asc'     // 日付昇順
  | 'title-asc'    // タイトル昇順（自然順ソート）
  | 'title-desc';  // タイトル降順

/**
 * 文字列から数値部分を抽出して比較用の配列を作成
 */
function extractNumbers(str: string): (string | number)[] {
  // 日本語の連番パターン
  const patterns = [
    { regex: /第(\d+)回/g, prefix: '第', suffix: '回' },
    { regex: /第(\d+)話/g, prefix: '第', suffix: '話' },
    { regex: /第(\d+)章/g, prefix: '第', suffix: '章' },
    { regex: /その(\d+)/g, prefix: 'その', suffix: '' },
    { regex: /#(\d+)/g, prefix: '#', suffix: '' },
    { regex: /No\.(\d+)/gi, prefix: 'No.', suffix: '' },
    { regex: /(\d+)章/g, prefix: '', suffix: '章' },
    { regex: /(\d+)話/g, prefix: '', suffix: '話' },
    { regex: /(\d+)回/g, prefix: '', suffix: '回' },
    { regex: /(\d+)\./, prefix: '', suffix: '.' }
  ];

  let result = str;
  const segments: (string | number)[] = [];
  let lastIndex = 0;

  // 各パターンで文字列を処理
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex);
    let match;
    
    regex.lastIndex = 0; // reset regex
    while ((match = regex.exec(str)) !== null) {
      const index = match.index;
      const fullMatch = match[0];
      const number = parseInt(match[1], 10);
      
      // マッチ前の文字列を追加
      if (index > lastIndex) {
        segments.push(str.substring(lastIndex, index));
      }
      
      // 数値部分を追加
      segments.push(number);
      
      lastIndex = index + fullMatch.length;
    }
  }
  
  // 残りの文字列を追加
  if (lastIndex < str.length) {
    segments.push(str.substring(lastIndex));
  }
  
  // セグメントが作成されなかった場合は、元の文字列を返す
  if (segments.length === 0) {
    // 通常の数値パターンを探す
    const parts = str.split(/(\d+)/);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] !== '') {
        if (/^\d+$/.test(parts[i])) {
          segments.push(parseInt(parts[i], 10));
        } else {
          segments.push(parts[i]);
        }
      }
    }
  }
  
  return segments.length > 0 ? segments : [str];
}

/**
 * 自然順ソート比較関数
 */
export function naturalSort(a: string, b: string): number {
  const aParts = extractNumbers(a);
  const bParts = extractNumbers(b);
  
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];
    
    // 片方が undefined の場合
    if (aPart === undefined) return -1;
    if (bPart === undefined) return 1;
    
    // 両方が数値の場合
    if (typeof aPart === 'number' && typeof bPart === 'number') {
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    // 片方だけが数値の場合（数値を先に）
    else if (typeof aPart === 'number') {
      return -1;
    }
    else if (typeof bPart === 'number') {
      return 1;
    }
    // 両方が文字列の場合
    else {
      const strCompare = aPart.localeCompare(bPart, 'ja');
      if (strCompare !== 0) {
        return strCompare;
      }
    }
  }
  
  return 0;
}

/**
 * 記事をソートする関数
 */
export function sortItems<T extends { title: string; pubDate: string }>(
  items: T[], 
  method: SortMethod
): T[] {
  const sortedItems = [...items];
  
  switch (method) {
    case 'date-desc':
      return sortedItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
      
    case 'date-asc':
      return sortedItems.sort((a, b) => 
        new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime()
      );
      
    case 'title-asc':
      return sortedItems.sort((a, b) => naturalSort(a.title, b.title));
      
    case 'title-desc':
      return sortedItems.sort((a, b) => naturalSort(b.title, a.title));
      
    default:
      return sortedItems;
  }
}