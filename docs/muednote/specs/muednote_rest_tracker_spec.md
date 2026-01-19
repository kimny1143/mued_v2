# MUEDnote 休憩トラッカー機能仕様

**ステータス**: 提案段階（MVP 後の Phase 2 候補）  
**最終更新**: 2025-12-20  
**対象読者**: Claude Code / 実装担当者

---

## 1. コンセプト

### 1.1 何を作るか

音楽制作者の「集中」と「休憩」のパターンを**記録・可視化**し、本人が自分のリズムを発見できるツール。

### 1.2 何を作らないか

- ❌ 「90分経ったら休め」式の処方的アラート
- ❌ 一般論を押し付けるコーチング
- ❌ ゲーミフィケーション（バッジ、ストリーク等）

### 1.3 設計思想

```
処方的アプローチ（やらない）     記述的アプローチ（やる）
─────────────────────────────────────────────────────────
「休憩してください」            「3時間連続作業の翌日、
                               午前の生産性が30%低下してます」

「90分が最適です」              「あなたの集中ピークは
                               平均68分で訪れる傾向があります」

「睡眠が足りません」            「良いミックスができた日の前日、
                               平均7.2時間寝ています」
```

**根拠**: 音楽家は自分のやり方に誇りがある。正解を押し付けると使われなくなる。パターンを見せて「自分で気づく、自分で決める」を促す。

---

## 2. 脳科学的根拠

### 2.1 ウルトラディアンリズム（90-120分サイクル）

**参照**: Hayashi et al. (1994), Broughton (2008)

- 人間の認知パフォーマンスは90-120分周期で変動する（Basic Rest-Activity Cycle）
- ただし**個人差が大きい**（60分の人も120分の人もいる）
- 午前〜午後早くに顕著、夕方以降は概日リズムに吸収される

**実装への示唆**:
- 固定の90分ではなく、**その人の実データからサイクルを推定**
- 時間帯による補正（午後は短めサイクルの可能性）

### 2.2 睡眠不足の影響

**参照**: Pilcher & Huffcutt (1996) - メタアナリシス

- 気分が認知・運動パフォーマンスより**先に**影響を受ける
- **部分的な睡眠不足**（毎日1-2時間の削減）は、完全徹夜より影響が過小評価されやすい
- 蓄積効果がある

**実装への示唆**:
- 睡眠時間の**週単位の蓄積**を追跡
- 「今週の睡眠負債」の可視化
- 気分/モチベーションの自己評価と相関を見せる

### 2.3 認知モードの切り替え

**参照**: Levitin (The Organized Mind)

- **Central Executive モード**: 集中、論理的作業（ミックス、編曲）
- **Mind Wandering モード**: 拡散思考、創造性（作曲、アイデア出し）
- Mind Wandering が Central Executive のエネルギーを**回復させる**

**実装への示唆**:
- 作業タイプ（作曲/編曲/ミックス/マスタリング）を記録
- タイプ別の最適サイクル傾向を分析
- 「創造的作業の後に分析的作業」等のパターン発見

### 2.4 聴覚疲労（音楽家特有）

- 一般的な認知疲労とは別軸
- ラウドネス判断、周波数バランスの精度が低下
- 回復には**無音時間**が有効

**実装への示唆**:
- ミックス/マスタリング時は「聴覚リセット休憩」を別カテゴリで提案
- 連続ミックス時間の追跡

---

## 3. データモデル

### 3.1 既存スキーマとの関係

```
muednote_mobile_sessions（既存）
├── id, user_id, started_at, ended_at, duration_seconds
├── session_type, project_name
└── device_id, synced_at

muednote_mobile_logs（既存）
├── id, session_id, timestamp, content
└── log_type, confidence
```

### 3.2 追加スキーマ

```sql
-- 休憩記録
CREATE TABLE muednote_rest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- 時間
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- タイプ
  rest_type TEXT NOT NULL, -- 'micro' | 'cognitive' | 'auditory' | 'sleep'
  
  -- 任意の自己評価（1-5、NULL許容）
  energy_before INTEGER,
  energy_after INTEGER,
  
  -- メタデータ
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 日次サマリー（集計用、夜間バッチで生成）
CREATE TABLE muednote_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- 作業時間
  total_work_seconds INTEGER DEFAULT 0,
  longest_continuous_work_seconds INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  
  -- 休憩時間
  total_rest_seconds INTEGER DEFAULT 0,
  rest_count INTEGER DEFAULT 0,
  
  -- 睡眠（手動入力 or HealthKit連携）
  sleep_seconds INTEGER,
  sleep_source TEXT, -- 'manual' | 'healthkit'
  
  -- 作業タイプ別内訳
  work_by_type JSONB, -- {"compose": 3600, "mix": 7200, ...}
  
  -- 自己評価（その日の終わりに任意入力）
  productivity_rating INTEGER, -- 1-5
  mood_rating INTEGER, -- 1-5
  
  UNIQUE(user_id, date)
);

-- パターン分析結果（週次バッチで生成）
CREATE TABLE muednote_user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- 推定値
  estimated_focus_cycle_minutes INTEGER, -- その人の推定集中サイクル
  peak_hours JSONB, -- [9, 10, 11] など
  chronotype TEXT, -- 'morning' | 'evening' | 'neutral'
  
  -- 相関データ
  correlations JSONB,
  -- 例: {
  --   "sleep_vs_productivity": 0.72,
  --   "continuous_work_vs_next_day_mood": -0.45
  -- }
  
  -- 分析期間
  analyzed_from DATE,
  analyzed_to DATE,
  sample_days INTEGER,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.3 Drizzle スキーマ（TypeScript）

```typescript
// db/schema/muednote-rest.ts

import { pgTable, uuid, text, timestamp, integer, date, jsonb, unique } from 'drizzle-orm/pg-core';

export const muednoteRestEvents = pgTable('muednote_rest_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  
  restType: text('rest_type').notNull(), // 'micro' | 'cognitive' | 'auditory' | 'sleep'
  
  energyBefore: integer('energy_before'),
  energyAfter: integer('energy_after'),
  
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const muednoteDailySummary = pgTable('muednote_daily_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  date: date('date').notNull(),
  
  totalWorkSeconds: integer('total_work_seconds').default(0),
  longestContinuousWorkSeconds: integer('longest_continuous_work_seconds').default(0),
  sessionCount: integer('session_count').default(0),
  
  totalRestSeconds: integer('total_rest_seconds').default(0),
  restCount: integer('rest_count').default(0),
  
  sleepSeconds: integer('sleep_seconds'),
  sleepSource: text('sleep_source'),
  
  workByType: jsonb('work_by_type'),
  
  productivityRating: integer('productivity_rating'),
  moodRating: integer('mood_rating'),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.date),
}));

export const muednoteUserPatterns = pgTable('muednote_user_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  
  estimatedFocusCycleMinutes: integer('estimated_focus_cycle_minutes'),
  peakHours: jsonb('peak_hours'),
  chronotype: text('chronotype'),
  
  correlations: jsonb('correlations'),
  
  analyzedFrom: date('analyzed_from'),
  analyzedTo: date('analyzed_to'),
  sampleDays: integer('sample_days'),
  
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

---

## 4. 機能設計

### 4.1 データ収集（パッシブ）

セッション記録から自動計算。ユーザーの追加操作は最小限。

```typescript
// セッション終了時に自動計算
function onSessionEnd(session: Session) {
  // 前回セッションとの間隔を計算
  const lastSession = await getLastSession(session.userId);
  
  if (lastSession) {
    const gap = session.startedAt - lastSession.endedAt;
    
    // 5分〜4時間の間隔は「休憩」として自動記録
    if (gap >= 5 * 60 * 1000 && gap <= 4 * 60 * 60 * 1000) {
      await createRestEvent({
        userId: session.userId,
        startedAt: lastSession.endedAt,
        endedAt: session.startedAt,
        durationSeconds: Math.floor(gap / 1000),
        restType: inferRestType(gap), // 長さから推定
      });
    }
  }
  
  // 日次サマリー更新
  await updateDailySummary(session.userId, session.date);
}
```

### 4.2 データ収集（アクティブ・任意）

ユーザーが**任意で**追加できる情報。強制しない。

- **睡眠時間**: 手動入力 or HealthKit 連携（iOS）
- **エネルギーレベル**: セッション開始時にワンタップ（1-5）
- **日の終わりの振り返り**: 生産性・気分（1-5）

```typescript
// UI: シンプルな5段階タップ
// 「今日の調子は？」→ 😫😕😐🙂😄 のアイコン
```

### 4.3 パターン分析（バッチ処理）

週次でユーザーごとにパターンを分析。

```typescript
// 分析ロジック（概要）
async function analyzeUserPatterns(userId: string) {
  const sessions = await getSessionsLast30Days(userId);
  const dailySummaries = await getDailySummariesLast30Days(userId);
  
  // 1. 集中サイクル推定
  const focusCycle = estimateFocusCycle(sessions);
  
  // 2. ピーク時間帯推定
  const peakHours = findPeakProductivityHours(sessions, dailySummaries);
  
  // 3. クロノタイプ推定
  const chronotype = inferChronotype(sessions);
  
  // 4. 相関分析
  const correlations = {
    sleepVsProductivity: correlate(
      dailySummaries.map(d => d.sleepSeconds),
      dailySummaries.map(d => d.productivityRating)
    ),
    continuousWorkVsNextDayMood: correlate(
      dailySummaries.map(d => d.longestContinuousWorkSeconds),
      dailySummaries.slice(1).map(d => d.moodRating)
    ),
  };
  
  await upsertUserPatterns(userId, {
    estimatedFocusCycleMinutes: focusCycle,
    peakHours,
    chronotype,
    correlations,
    analyzedFrom: thirtyDaysAgo,
    analyzedTo: today,
    sampleDays: dailySummaries.length,
  });
}
```

### 4.4 インサイト表示

分析結果を**押し付けない形**で表示。

```typescript
// インサイトの例
const insights = [
  {
    type: 'observation',
    title: 'あなたの集中サイクル',
    body: '約68分で集中のピークが来る傾向があります',
    confidence: 0.7, // 表示するかの閾値に使用
  },
  {
    type: 'correlation',
    title: '睡眠と生産性',
    body: '7時間以上寝た翌日、生産性が高い傾向（相関: 0.72）',
    confidence: 0.8,
  },
  {
    type: 'pattern',
    title: '今週の傾向',
    body: '3時間以上の連続作業が3回ありました',
    // 良い悪いは言わない。事実だけ。
  },
];
```

---

## 5. UI/UX ガイドライン

### 5.1 トーン

- **観察者**: 判断しない、記録する
- **さりげない**: 通知は最小限、押し付けない
- **発見を促す**: 「これが正解」ではなく「こんな傾向がある」

### 5.2 画面構成（案）

```
[ダッシュボード]
├── 今日のサマリー（作業時間、休憩回数）
├── 週間グラフ（作業/休憩/睡眠の積み上げ）
└── インサイトカード（1-2枚、ローテーション）

[詳細分析]
├── 時間帯別ヒートマップ
├── 作業タイプ別の傾向
└── 相関グラフ（睡眠 vs 生産性など）

[設定]
├── 睡眠記録方法（手動 / HealthKit）
├── インサイト通知（オフ可能）
└── データエクスポート
```

### 5.3 通知ポリシー

```typescript
// 通知は極力控えめに
const notificationPolicy = {
  // 絶対にやらない
  never: [
    '今すぐ休憩してください',
    '集中時間が長すぎます',
    '睡眠不足です',
  ],
  
  // 週1回まで、オプトイン
  weeklyDigest: [
    '今週の作業パターンをまとめました',
  ],
  
  // ユーザーが明示的に設定した場合のみ
  userConfigured: [
    'セッション3時間経過（自分で設定した閾値）',
  ],
};
```

---

## 6. 実装フェーズ

### Phase 2.1: データ収集基盤

- [ ] DB スキーマ追加（rest_events, daily_summary）
- [ ] セッション終了時の休憩自動記録
- [ ] 日次サマリーの自動生成
- [ ] 睡眠時間の手動入力 UI

### Phase 2.2: 可視化

- [ ] ダッシュボード画面
- [ ] 週間グラフコンポーネント
- [ ] 時間帯ヒートマップ

### Phase 2.3: パターン分析

- [ ] 分析バッチ処理
- [ ] 相関計算ロジック
- [ ] インサイト生成

### Phase 2.4: 拡張

- [ ] HealthKit 連携（iOS）
- [ ] 作業タイプ別分析
- [ ] 同業者傾向との比較（匿名化）

---

## 7. 参考文献

1. Pilcher, J. J., & Huffcutt, A. I. (1996). Effects of sleep deprivation on performance: A meta-analysis. *Sleep*, 19(4), 318-326.

2. Fox, K. C. R., et al. (2014). Is meditation associated with altered brain structure? A systematic review and meta-analysis. *Neuroscience & Biobehavioral Reviews*, 43, 48-73.

3. Smith, P. J., et al. (2010). Aerobic exercise and neurocognitive performance: A meta-analytic review. *Psychosomatic Medicine*, 72(3), 239-252.

4. Hayashi, M., Sato, K., & Hori, T. (1994). Ultradian rhythms in task performance, self-evaluation, and EEG activity. *Perceptual and Motor Skills*, 79, 791-800.

5. Broughton, R. J. (2008). Ultradian cognitive performance rhythms during sleep deprivation. In *Bentivoglio, M., & Grassi-Zucconi, G. (Eds.), The Bentivoglio Festschrift*. Springer.

---

## 8. 設計判断の記録

| 判断 | 選択 | 理由 |
|------|------|------|
| アラートを出すか | No | 音楽家は自分のやり方に誇りがある。押し付けると使われない |
| 90分固定サイクルか | No | 個人差が大きい。本人のデータから推定すべき |
| ゲーミフィケーション | No | 創作活動との相性が悪い。外発的動機付けは避ける |
| 睡眠データ取得方法 | 手動 + HealthKit | 精度と手軽さのバランス。HealthKit はオプション |
| インサイトの表現 | 観察的 | 「〜すべき」ではなく「〜という傾向がある」 |

---

*このドキュメントは Phase 2 の実装前に再レビューすること。MVP の実機テスト結果を踏まえて調整する可能性あり。*
