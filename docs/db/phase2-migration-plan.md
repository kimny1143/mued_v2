# Phase 2: データベーススキーマ拡張計画

**作成日**: 2025-01-06
**目的**: MIDI/MusicXML対応のためのmaterialsテーブル拡張

---

## 1. 現状のスキーマ

### materialsテーブル（既存）

```typescript
export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),  // ← 現在はJSON文字列（ABC記法含む）
  type: text("type").notNull(), // video, pdf, text, interactive
  url: text("url"),
  tags: jsonb("tags").$type<string[]>(),
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  isPublic: boolean("is_public").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  metadata: jsonb("metadata"),
  // Quality scoring fields
  playabilityScore: decimal("playability_score", { precision: 3, scale: 1 }),
  learningValueScore: decimal("learning_value_score", { precision: 3, scale: 1 }),
  qualityStatus: text("quality_status").default("pending"),
  abcAnalysis: jsonb("abc_analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

## 2. Phase 2 で追加するフィールド

### 2.1 新規カラム

| カラム名 | 型 | NULL許可 | デフォルト値 | 説明 |
|---------|---|---------|------------|------|
| `contentFormat` | `text` | NOT NULL | `'abc'` | コンテンツフォーマット: 'abc' または 'multi-track-json' |
| `midiFile` | `text` | NULL | NULL | base64エンコードされたMIDIファイル |
| `musicXmlFile` | `text` | NULL | NULL | MusicXML文字列 |
| `renderConfig` | `jsonb` | NULL | NULL | OSMD/Tone.js用の表示・再生設定 |

### 2.2 新規カラムの詳細

#### `contentFormat`
- **型**: `text`
- **制約**: `CHECK (contentFormat IN ('abc', 'multi-track-json'))`
- **デフォルト**: `'abc'`（既存データ互換性のため）
- **用途**:
  - `'abc'`: 従来のABC記法（Beginnerレベル）
  - `'multi-track-json'`: 新しいMultiTrackJSON形式（Intermediate/Advanced）

#### `midiFile`
- **型**: `text`
- **サイズ**: 数KB〜数百KB（base64エンコード後）
- **NULL許可**: YES（ABC記法の場合は不要）
- **用途**: ブラウザでのダウンロード、Tone.jsでの再生

**エンコード例**:
```typescript
const midiBase64 = generateMIDI(multiTrackJSON); // lib/utils/midi-generator.ts
await db.update(materials).set({ midiFile: midiBase64 }).where(eq(materials.id, id));
```

#### `musicXmlFile`
- **型**: `text`
- **サイズ**: 数KB〜数MB（XMLテキスト）
- **NULL許可**: YES（ABC記法の場合は不要）
- **用途**: OSMD表示、楽譜ソフトへのエクスポート

**生成例**:
```typescript
const musicXml = generateMusicXML(multiTrackJSON); // lib/utils/musicxml-generator.ts
await db.update(materials).set({ musicXmlFile: musicXml }).where(eq(materials.id, id));
```

#### `renderConfig`
- **型**: `jsonb`
- **NULL許可**: YES
- **用途**: フロントエンドでの表示・再生設定を保存

**構造例**:
```typescript
interface RenderConfig {
  osmd?: {
    backend: 'svg' | 'canvas';
    autoResize: boolean;
    drawTitle: boolean;
    drawPartNames: boolean;
  };
  tonejs?: {
    defaultVolume: number;  // -60〜0 (dB)
    reverbLevel: number;    // 0〜1
  };
  displayMode?: 'midi' | 'musicxml' | 'both';
}
```

---

## 3. マイグレーション戦略

### 3.1 段階的マイグレーション

**Phase 2.1-A: スキーマ拡張（ダウンタイムなし）**
```sql
-- Step 1: 新規カラム追加（NULL許可で追加）
ALTER TABLE materials
ADD COLUMN content_format text DEFAULT 'abc',
ADD COLUMN midi_file text,
ADD COLUMN music_xml_file text,
ADD COLUMN render_config jsonb;

-- Step 2: 制約追加
ALTER TABLE materials
ADD CONSTRAINT chk_content_format
CHECK (content_format IN ('abc', 'multi-track-json'));

-- Step 3: インデックス追加
CREATE INDEX idx_materials_content_format ON materials(content_format);
```

**Phase 2.1-B: 既存データのバックフィル（オプション）**
- ABC記法の既存教材は `contentFormat = 'abc'` のまま維持
- 新規MultiTrack教材は生成時に全フィールド設定

**Phase 2.1-C: NOT NULL制約追加（将来的に、既存データ対応後）**
```sql
-- 全データが contentFormat を持つことを確認後
ALTER TABLE materials
ALTER COLUMN content_format SET NOT NULL;
```

### 3.2 ロールバック計画

**緊急時のロールバック手順**:
```sql
-- 新規カラムを削除（データ損失あり）
ALTER TABLE materials
DROP COLUMN content_format,
DROP COLUMN midi_file,
DROP COLUMN music_xml_file,
DROP COLUMN render_config;

-- インデックス削除
DROP INDEX IF EXISTS idx_materials_content_format;
```

---

## 4. Drizzle ORMスキーマ更新

### 4.1 `db/schema.ts` 更新

```typescript
export const materials = pgTable("materials", {
  // ... 既存フィールド
  content: text("content"),

  // Phase 2: 新規フィールド
  contentFormat: text("content_format").notNull().default('abc'),  // 'abc' | 'multi-track-json'
  midiFile: text("midi_file"),  // base64エンコードされたMIDIファイル
  musicXmlFile: text("music_xml_file"),  // MusicXML文字列
  renderConfig: jsonb("render_config").$type<{
    osmd?: {
      backend: 'svg' | 'canvas';
      autoResize: boolean;
      drawTitle: boolean;
      drawPartNames: boolean;
    };
    tonejs?: {
      defaultVolume: number;
      reverbLevel: number;
    };
    displayMode?: 'midi' | 'musicxml' | 'both';
  }>(),

  // ... 既存フィールド（createdAt, updatedAt等）
}, (table) => ({
  // ... 既存インデックス
  contentFormatIdx: index("idx_materials_content_format").on(table.contentFormat),
}));
```

### 4.2 TypeScript型定義更新

```typescript
// lib/types/material.ts（新規または既存ファイル拡張）
export type MaterialContentFormat = 'abc' | 'multi-track-json';

export interface MaterialRenderConfig {
  osmd?: {
    backend: 'svg' | 'canvas';
    autoResize: boolean;
    drawTitle: boolean;
    drawPartNames: boolean;
  };
  tonejs?: {
    defaultVolume: number;
    reverbLevel: number;
  };
  displayMode?: 'midi' | 'musicxml' | 'both';
}
```

---

## 5. データ移行パターン

### 5.1 新規教材生成時（Intermediate/Advanced）

```typescript
// lib/services/ai-material.service.ts
async function createMultiTrackMaterial(params: MaterialGenerationParams) {
  // 1. AI生成でMultiTrackJSONを取得
  const multiTrackJSON = await generateMultiTrackJSON(params);

  // 2. MIDI/MusicXML生成
  const midiBase64 = generateMIDI(multiTrackJSON);
  const musicXml = generateMusicXML(multiTrackJSON);

  // 3. DB保存
  const [material] = await db.insert(materials).values({
    title: params.title,
    description: params.description,
    content: JSON.stringify(multiTrackJSON),  // JSON文字列として保存
    contentFormat: 'multi-track-json',
    midiFile: midiBase64,
    musicXmlFile: musicXml,
    renderConfig: {
      displayMode: 'both',
      osmd: { backend: 'svg', autoResize: true, drawTitle: true, drawPartNames: true },
    },
    type: 'music',
    difficulty: params.difficulty,
    creatorId: params.userId,
  }).returning();

  return material;
}
```

### 5.2 既存ABC教材（変更なし）

```typescript
// Beginner教材は従来通り
const [material] = await db.insert(materials).values({
  // ...
  content: JSON.stringify({ abcNotation: "...", learningPoints: [...] }),
  contentFormat: 'abc',  // デフォルト値
  midiFile: null,  // ABC記法ではnull
  musicXmlFile: null,
  // ...
});
```

---

## 6. ストレージ影響分析

### 6.1 推定データサイズ

| 教材タイプ | contentFormat | MIDI (base64) | MusicXML | 合計増加 |
|-----------|--------------|---------------|----------|---------|
| Beginner (ABC) | 'abc' | - | - | 0 KB |
| Intermediate (2-3トラック) | 'multi-track-json' | 5-10 KB | 20-50 KB | 25-60 KB |
| Advanced (5トラック) | 'multi-track-json' | 10-20 KB | 50-100 KB | 60-120 KB |

**例**: 100件のIntermediate教材 → 約2.5-6 MB増加

### 6.2 最適化案

1. **圧縮**: MusicXMLをgzip圧縮（50-70%削減）
   ```typescript
   import pako from 'pako';
   const compressed = pako.gzip(musicXml);
   const base64Compressed = Buffer.from(compressed).toString('base64');
   ```

2. **オンデマンド生成**: MIDI/MusicXMLをリクエスト時に生成（DB保存なし）
   - メリット: ストレージ節約
   - デメリット: 生成コスト（CPU）、レスポンス遅延

3. **外部ストレージ**: S3/CloudinaryにMIDI/MusicXMLを保存、URLのみDB保存
   - メリット: PostgreSQL負荷軽減
   - デメリット: 複雑性増加、追加コスト

**推奨**: Phase 2.1では**DB直接保存**、パフォーマンス問題が発生したら外部ストレージ検討

---

## 7. パフォーマンス考慮事項

### 7.1 クエリパフォーマンス

**インデックス戦略**:
```sql
-- 必須インデックス
CREATE INDEX idx_materials_content_format ON materials(content_format);

-- 複合インデックス（よく使われるクエリ用）
CREATE INDEX idx_materials_format_difficulty ON materials(content_format, difficulty);
CREATE INDEX idx_materials_format_public ON materials(content_format, is_public);
```

**クエリ例**:
```typescript
// MultiTrack教材のみ取得
const multiTrackMaterials = await db
  .select()
  .from(materials)
  .where(eq(materials.contentFormat, 'multi-track-json'));

// Intermediate以上 かつ MultiTrack
const advancedMultiTrack = await db
  .select()
  .from(materials)
  .where(
    and(
      eq(materials.contentFormat, 'multi-track-json'),
      inArray(materials.difficulty, ['intermediate', 'advanced'])
    )
  );
```

### 7.2 N+1問題の回避

```typescript
// 悪い例: N+1クエリ
const materials = await db.select().from(materials);
for (const material of materials) {
  const creator = await db.select().from(users).where(eq(users.id, material.creatorId));
}

// 良い例: JOIN使用
const materialsWithCreators = await db
  .select({
    material: materials,
    creator: users,
  })
  .from(materials)
  .leftJoin(users, eq(materials.creatorId, users.id));
```

---

## 8. マイグレーション実行手順

### 8.1 開発環境

```bash
# 1. マイグレーションファイル生成
npx drizzle-kit generate:pg

# 2. マイグレーション実行
npx drizzle-kit push:pg

# 3. 動作確認
npm run db:test-connection
```

### 8.2 本番環境（将来）

```bash
# 1. バックアップ
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d).sql

# 2. マイグレーション実行（読み取り専用モード推奨）
# アプリケーションをメンテナンスモードに設定

npx drizzle-kit push:pg --config=drizzle.config.prod.ts

# 3. 検証
# サンプルクエリ実行、データ整合性確認

# 4. アプリケーション再開
```

---

## 9. テスト計画

### 9.1 マイグレーションテスト

```typescript
// tests/db/migration-phase2.test.ts
describe('Phase 2 Migration', () => {
  it('should add new columns to materials table', async () => {
    const material = await db.select().from(materials).limit(1);
    expect(material[0]).toHaveProperty('contentFormat');
    expect(material[0]).toHaveProperty('midiFile');
    expect(material[0]).toHaveProperty('musicXmlFile');
    expect(material[0]).toHaveProperty('renderConfig');
  });

  it('should default contentFormat to "abc"', async () => {
    const [material] = await db.insert(materials).values({
      title: 'Test',
      content: '{}',
      type: 'music',
      difficulty: 'beginner',
      creatorId: testUserId,
    }).returning();

    expect(material.contentFormat).toBe('abc');
  });

  it('should accept multi-track-json format', async () => {
    const multiTrackJSON = createSampleMultiTrackJSON();
    const midiBase64 = generateMIDI(multiTrackJSON);
    const musicXml = generateMusicXML(multiTrackJSON);

    const [material] = await db.insert(materials).values({
      title: 'Multi-Track Test',
      content: JSON.stringify(multiTrackJSON),
      contentFormat: 'multi-track-json',
      midiFile: midiBase64,
      musicXmlFile: musicXml,
      type: 'music',
      difficulty: 'intermediate',
      creatorId: testUserId,
    }).returning();

    expect(material.contentFormat).toBe('multi-track-json');
    expect(material.midiFile).toBeTruthy();
    expect(material.musicXmlFile).toBeTruthy();
  });
});
```

---

## 10. 次のアクション

### Phase 2.1-A: スキーマ拡張実装（今週）

- [ ] `db/schema.ts` 更新
- [ ] Drizzle migration生成
- [ ] 開発環境でマイグレーション実行
- [ ] テストコード作成・実行

### Phase 2.1-B: バックエンド統合（来週）

- [ ] `lib/services/ai-material.service.ts` でMultiTrack教材生成
- [ ] MIDI/MusicXML自動生成フロー実装
- [ ] API エンドポイント更新（GET/POST/PATCH）

### Phase 2.1-C: 検証（再来週）

- [ ] 統合テスト実行
- [ ] パフォーマンステスト
- [ ] ドキュメント更新

---

**最終更新**: 2025-01-06
**ステータス**: 設計完了、実装準備中
**次回レビュー**: マイグレーション実行後
