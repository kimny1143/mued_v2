# Figma デザイン → コード実装ワークフロー

## 基本原則

**必須: Figma REST API または Figma MCP サーバー経由でデザインを取得**

**厳禁: スクリーンショットからの直接実装**
- スクリーンショットはプレビュー・確認用途のみ
- 実装時は必ずFigma APIから正確なデザイン仕様を取得
- 理由: 色・サイズ・スペーシング等の精度が著しく低下するため

---

## ワークフロー手順

### 1. Figma Desktop でコンポーネント化

1. デザイン要素（ボタン、カード、入力フィールド等）を選択
2. 右クリック → **「コンポーネントを作成」** (Cmd/Ctrl + Option + K)
3. 適切な命名（例: `buttonPrimary`, `cardDashboard`, `inputText`）

### 2. Figma REST API で仕様を取得

```bash
# 環境変数
export FIGMA_FILE_KEY="your_file_key"
export FIGMA_ACCESS_TOKEN="your_access_token"

# ファイル全体を取得
curl -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_KEY" \
  -o /tmp/figma-design.json

# コンポーネント一覧を確認
jq '.components | keys' /tmp/figma-design.json

# 特定のコンポーネント詳細を取得
jq '.. | objects | select(.id == "2:9689")' /tmp/figma-design.json
```

### 3. デザイン仕様を解析

**取得すべき情報:**
- **色**: RGB値 → Hex変換 → `globals.css` に登録
- **サイズ**: width, height, padding, margin
- **角丸**: cornerRadius
- **フォント**: fontSize, fontWeight, fontFamily, lineHeight
- **シャドウ**: effects配列のDROP_SHADOW

**例:**
```json
{
  "backgroundColor": {"r": 0.459, "g": 0.738, "b": 0.067},
  "cornerRadius": 8.0,
  "paddingLeft": 16.0,
  "paddingRight": 16.0,
  "paddingTop": 8.0,
  "paddingBottom": 8.0
}
```

→ `bg-[#75bc11] rounded-lg px-4 py-2`

### 4. グローバルCSS にデザイントークンを登録

```css
/* app/globals.css */
@theme inline {
  /* Figma Design System Colors */
  --color-brand-green: #75bc11;
  --color-brand-green-hover: #65a20f;
  --color-brand-green-active: #559308;
  --color-brand-text: #000a14;
}
```

### 5. React/TypeScript コンポーネントを実装

```tsx
// components/ui/button.tsx
const variants = {
  default: 'bg-brand-green hover:bg-brand-green-hover text-brand-text',
  // ...
};
```

---

## Figma MCP サーバー経由（推奨）

### セットアップ

```bash
# Figma MCP サーバーを Claude Code に接続
claude mcp add --transport http figma-dev-mode-mcp-server http://127.0.0.1:3845/mcp

# 確認
claude mcp list
```

### 使用方法

1. Figma Desktop で要素を選択
2. Claude Code に指示：
   ```
   Figmaで選択中のボタンを /components/ui/button.tsx として実装して
   ```
3. MCPサーバーが自動的にデザイン仕様を取得
4. コンポーネントを自動生成

### 制限事項

- Figma Desktop アプリが起動している必要あり
- Dev seat または Full seat が必要（Professional/Organization/Enterprise プラン）
- ベータ版のため、一部機能が不安定な可能性あり

---

## トラブルシューティング

### 色の値が正しく取得できない

RGB値（0-1の範囲）をHexに変換：

```javascript
const rgbToHex = (r, g, b) => {
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// RGB(0.459, 0.738, 0.067) → #75bc11
```

### Figma API のレート制限に達した

- `/v1/files/:key/components` で対象を絞る
- 必要な node-ids だけを指定して取得
- キャッシュを活用（一度取得したJSONをローカル保存）
