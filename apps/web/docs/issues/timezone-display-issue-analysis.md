# タイムゾーン表示問題の分析と解決策

## 問題の概要

ユーザーが日本時間で「6/14 10:00-20:00」と入力したスロットが、カレンダー上で「1:00-11:00」として表示されている。

## 調査結果

### 1. データベースの状態
- データベースに保存されている時刻: `2025-06-14T01:00:00` と `2025-06-14T11:00:00`
- これらの値は**すでに日本時間（JST）として保存されている**
- タイムゾーン指定がない（Zサフィックスなし）

### 2. 問題の原因
- JavaScriptの`new Date()`は、タイムゾーン指定のない時刻文字列を**ローカルタイムゾーン**として解釈する
- ローカル環境がJST（UTC+9）の場合、`2025-06-14T01:00:00`は日本時間の1:00として解釈される
- しかし、この値は実際にはUTC時刻として扱われるべき（JST 10:00 = UTC 01:00）

### 3. 現在の実装の問題点
- `formatJst`関数は正しく実装されているが、入力データが既にJSTとして解釈されているため、変換が効かない
- APIレスポンスにJSTフィールドが追加されているが、フロントエンドで使用されていない

## 解決策

### 方法1: データベースの時刻をUTCとして正しく保存（推奨）

```javascript
// POSTリクエスト時の変換
const jstStartTime = new Date(data.startTime); // 例: 2025-06-14 10:00 JST
const utcStartTime = new Date(jstStartTime.getTime() - 9 * 60 * 60 * 1000); // UTC時刻に変換

// データベースに保存
{
  start_time: utcStartTime.toISOString(), // 2025-06-14T01:00:00.000Z
  end_time: utcEndTime.toISOString()
}
```

### 方法2: データベースの時刻文字列をUTCとして強制的に解釈

```javascript
// APIレスポンス処理時
const dbStartTime = slot.start_time; // "2025-06-14T01:00:00"
const utcStartTime = new Date(dbStartTime + 'Z'); // Zを追加してUTCとして解釈
```

### 方法3: APIレスポンスのJSTフィールドを使用（暫定対応）

```javascript
// SlotsCalendar.tsx での表示
// formatJst(slot.startTime, 'HH:mm') の代わりに
slot.startTimeJst ? slot.startTimeJst.split(' ')[1].substring(0, 5) : formatJst(slot.startTime, 'HH:mm')
```

## 推奨される修正手順

1. **即時対応**: APIレスポンス処理で時刻文字列にZサフィックスを追加
2. **根本対応**: データ作成時にJSTからUTCへの変換を適切に実装
3. **統一化**: すべての時刻処理をUTCベースに統一

## テスト方法

1. デバッグHTMLツールを使用: `/dashboard/slots-calendar/debug-api-response.html`
2. ブラウザのコンソールで時刻変換を確認
3. 異なるタイムゾーン設定でのテスト