# DAW ログ解釈エンジン — 実装計画

**作成日**: 2026-02-27
**目的**: Hoo が DAW ログを音楽的に解釈して会話できるようにする

---

## 現状

### パイプライン（動作済み）

```
Hub(Mac) → OSC → DAWLog → API → DB → buildDawLogContext() → Hoo systemPrompt
```

### Hub が送るログ（品質は良い）

```json
{
  "action": "parameter_change",
  "value": 0.6234,
  "value_string": "2.40 kHz",
  "metadata": {
    "track_name": "Kick",
    "device_name": "Pro-Q 3",
    "param_name": "Band 1 Frequency"
  }
}
```

- トラック名、プラグイン名、パラメータ名、人間が読める値が揃っている
- Pro-Q は PluginFormatters.swift で Hz/dB/Q を正確に変換済み

### Hoo に渡される形式（ここが問題）

`buildDawLogContext()` (app/api/hoo/chat/route.ts L101-207) が生成:

```markdown
- 総操作数: 84件
- 操作内訳: パラメータ変更72件, トラックボリューム12件
- 使用トラック: Kick, Snare, Bass
- 使用デバイス/プラグイン: Pro-Q 3, Compressor

### 直近の操作詳細（新しい順）
- 17:05 / パラメータ変更 / Track: Kick / Device: Pro-Q 3 → 2.40 kHz
- 17:04 / トラックボリューム / Track: Bass → -3.5 dB
```

**Hoo の反応**: 「84件の操作がありました。Pro-Q 3 を中心に作業していたようですね」← 中身が薄い

---

## ゴール: Level 1 — パラメータの音楽的翻訳

### Before（今）

```
- 17:05 / パラメータ変更 / Track: Kick / Device: Pro-Q 3 → 2.40 kHz
- 17:02 / パラメータ変更 / Track: Kick / Device: Pro-Q 3 → -4.50 dB
- 17:00 / パラメータ変更 / Track: Kick / Device: Compressor → -18.0 dB
```

### After（Level 1）

```
### Kick の作業（17:00〜17:05、操作 15件）
- EQ: 2.4kHz を -4.5dB カット（中域のボクシーさを削った可能性）
- コンプレッサー: Threshold -18dB に設定
- 注目: EQ を 14:05 と 14:42 に2回調整 → コンプ後の手戻り

### Bass の作業（17:04、操作 3件）
- ボリューム: -3.5dB に下げた

### セッション全体
- 主な作業: Kick の EQ + コンプ処理（全体の 70%）
- パターン: EQ → コンプ → EQ の手戻りが発生
```

### Hoo の会話が変わる

```
Hoo「Kick の中域を削ってからコンプかけたんだね。
     コンプ後にまた EQ を触り直してるから、
     コンプで帯域バランスが変わったっぽい。
     ローが重いって言ってたけど、どう解決した？」
```

---

## 実装方針

### 変更対象

`app/api/hoo/chat/route.ts` の `buildDawLogContext()` 関数。
もしくはこの関数を `lib/services/daw-log-interpreter.service.ts` に切り出す。

### 処理の流れ

```
DB の生ログ
  ↓
Step 1: パラメータの音楽的翻訳
  ↓
Step 2: トラック × 時間帯でグループ化
  ↓
Step 3: パターン検出
  ↓
Step 4: Hoo 向けサマリー生成
```

### Step 1: パラメータの音楽的翻訳

生のログエントリを音楽的な記述に変換するルール。

#### EQ 系（Pro-Q, EQ Eight 等）

| param_name パターン | value_string | 翻訳例 |
|-------------------|-------------|--------|
| Band X Frequency | 2.40 kHz | 2.4kHz 帯域 |
| Band X Gain | -4.50 dB | -4.5dB カット |
| Band X Gain | +3.00 dB | +3dB ブースト |
| Band X Q | 1.41 | Q=1.41（やや広め） |

組み合わせ:
- Freq 2.4kHz + Gain -4.5dB → 「2.4kHz を -4.5dB カット」
- さらに Q < 0.5 → 「広帯域でカット」/ Q > 4 → 「ピンポイントでカット」

帯域の音楽的意味（ルックアップテーブル）:
```
~60Hz:    サブベース / 体に響く低域
~120Hz:   ベースの基音 / キックの重さ
~250Hz:   低域のモコモコ / ウォームさ
~500Hz:   中低域の厚み / ボックス感
~1kHz:    中域 / 声の芯
~2-4kHz:  プレゼンス / 抜け
~6-8kHz:  シビランス / ブライトネス
~10kHz+:  エア / きらめき
```

翻訳例: 「Kick の 2.4kHz を -4.5dB カット（プレゼンス帯域を削って抜けすぎを抑えた）」

#### コンプレッサー系

| param_name | 翻訳 |
|-----------|------|
| Threshold | Threshold X dB（低いほど深くかかる） |
| Ratio | Ratio X:1（4:1以上 = 強めの圧縮） |
| Attack | Attack X ms（速い=トランジェント潰す、遅い=通す） |
| Release | Release X ms |

組み合わせ: Threshold -18dB + Ratio 4:1 → 「中程度の圧縮（-18dB, 4:1）」

#### ボリューム / パン

| action | 翻訳 |
|--------|------|
| track_volume | 「X dB に調整」/ 変化量が大きければ「大幅に下げた/上げた」 |
| track_pan | 「左/中央/右に配置」（-64〜+63 → L/C/R） |

### Step 2: トラック × 時間帯でグループ化

同じトラックの操作を時間的にまとめる。

```typescript
interface TrackActivity {
  trackName: string;
  timeRange: { start: Date; end: Date };
  operations: InterpretedLog[];
  totalOps: number;
  percentOfSession: number; // このトラックに費やした時間の割合
  devices: string[];        // 使用プラグイン
}
```

グループ化ルール:
- 同一トラックの操作で 3分以上空いたら別グループ
- グループ内の操作を時系列でまとめる
- 最も操作数が多いトラックから順に記述

### Step 3: パターン検出

定型的な作業パターンを見つける。

| パターン | 検出条件 | Hoo への情報 |
|---------|---------|-------------|
| EQ 手戻り | 同一バンドの Freq/Gain を 10分以上空けて再調整 | 「EQ を2回触っている → 間の操作が影響した可能性」 |
| コンプ → EQ | コンプ設定後に同トラックの EQ を変更 | 「コンプ後に EQ を調整 → ダイナミクス変化への対応」 |
| 集中作業 | 1トラックに 60% 以上の操作 | 「ほとんど X トラックに集中していた」 |
| マスターバス仕上げ | セッション後半にマスター系の操作が増加 | 「後半はマスターバスを触っている → 仕上げ段階？」 |
| ボリューム微調整 | 同トラックのボリュームを 5回以上変更 | 「バランスで迷っている可能性」 |

### Step 4: Hoo 向けサマリー生成

最終出力フォーマット:

```markdown
## DAW 操作ログ（音楽的解釈付き）

ユーザーのDAW操作を音楽的に解釈したサマリーです。
制作の文脈を理解した上で会話に活用してください。

### セッション概要
- DAW: Ableton Live
- 記録: 2026-02-27 14:00〜15:30（84操作）
- 主な作業: Kick の EQ + コンプ処理（全体の 70%）

### トラック別の作業内容

**Kick**（14:00〜15:20、58操作）
- Pro-Q 3: 2.4kHz を -4.5dB カット（プレゼンス帯域のボクシーさ除去）
- Pro-Q 3: 120Hz を +2dB ブースト（キックの重さを追加）
- Compressor: Threshold -18dB, Ratio 4:1（中程度の圧縮）
- 注目: 14:05 に EQ 調整 → 14:12 にコンプ → 14:42 に EQ 再調整（コンプ後の手戻り）

**Bass**（15:10〜15:25、12操作）
- ボリューム: -3.5dB に下げた
- Pro-Q 3: 250Hz を -2dB カット（低域のモコつき除去）

**Master**（15:25〜15:30、4操作）
- Limiter: Ceiling -0.3dB に設定

### 検出パターン
- Kick の EQ を2回調整（コンプ後の手戻り）
- セッション後半にマスターバスの操作 → 仕上げに入った可能性

### 音声メモとの対応（タイムスタンプ同期）
- 14:08「ローがまだ重いな」→ この前後で Kick の 120Hz をブースト中
- 14:45「いい感じになってきた」→ EQ 再調整の直後
```

---

## 実装ステップ

### Phase A: 基盤（音楽的翻訳）

1. `lib/services/daw-log-interpreter.service.ts` を新規作成
2. EQ パラメータ翻訳（Freq + Gain + Q の組み合わせ解釈）
3. コンプレッサー翻訳（Threshold + Ratio + Attack/Release）
4. ボリューム/パン翻訳
5. 帯域の音楽的意味ルックアップテーブル

### Phase B: グループ化とパターン

6. トラック × 時間帯のグループ化
7. パターン検出（EQ 手戻り、コンプ → EQ、集中作業）
8. セッション概要の自動生成

### Phase C: Hoo 統合

9. `buildDawLogContext()` を新サービスに差し替え
10. 音声メモとのタイムスタンプ対応（既存の同期データを活用）
11. Hoo プロンプトに「操作ログの解釈を踏まえて会話せよ」を追記

### Phase D: 検証

12. 自分のミックスセッションで実際にテスト
13. Hoo の会話品質を確認、解釈ルールを調整
14. モニター募集の判断

---

## スコープ外（今はやらない）

- Level 2（長期トレンド分析）→ データが十分貯まってから
- Level 3（Premium 個人化）→ Phase 3
- Logic Pro / Pro Tools 対応 → Hub の拡張が先
- 見える化 UI → 解釈エンジン完成後に着手
- 対応プラグインの拡張（Pro-C, Saturator 等）→ まず Pro-Q + 汎用 Comp で検証

---

## 工数見積もり

| Phase | 内容 | 規模 |
|-------|------|------|
| A | 音楽的翻訳ルール | 新規ファイル1つ、翻訳関数群 |
| B | グループ化 + パターン検出 | 同ファイル内に追加 |
| C | Hoo 統合 | route.ts の buildDawLogContext 差し替え |
| D | 実地テスト + 調整 | 反復的に |

変更ファイル:
- `lib/services/daw-log-interpreter.service.ts`（新規）
- `app/api/hoo/chat/route.ts`（buildDawLogContext 差し替え）
- `lib/ai/prompts/hoo.ts`（DAW ログ解釈に関する Hoo 指示を追記する可能性）

---

*2026-02-27*
