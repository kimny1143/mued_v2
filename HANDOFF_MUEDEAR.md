# MUEDear 引継文書

> **重要**: このファイルは `mued_v2-muedear/` ワークツリーのルートにあります。
> MUEDear の作業は必ずこのディレクトリで行ってください。

---

## 概要

| 項目 | 内容 |
|------|------|
| アプリ名 | MUEDear（ミュードイヤー） |
| コンセプト | SoundGym風の耳トレアプリ（無料モバイル版） |
| ブランチ | `feature/muedear` |
| ワークツリー | `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2-muedear/` |
| アプリディレクトリ | `apps/muedear/` |

---

## クイックスタート

```bash
# 1. ワークツリーに移動（必須！）
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2-muedear

# 2. ブランチ確認
git branch
# → * feature/muedear

# 3. アプリ起動
cd apps/muedear && npm start

# 4. 型チェック
npx tsc --noEmit
```

---

## 完了済みフェーズ

### Phase 0: UIモック ✅
- Expoプロジェクト作成
- テーマ・デザインシステム
- 基本画面（Home, GameSelect, Result）

### Phase 1: オーディオ基盤 ✅

| ファイル | 内容 |
|----------|------|
| `src/services/audioService.ts` | expo-av音声再生エンジン |
| `assets/audio/mufreq/` | 10トラック × 10バリエーション |
| `src/screens/games/MuFreQScreen.tsx` | 音声接続済み |
| `src/stores/gameStore.ts` | 音声state追加 |

### Phase 2: データ永続化 ✅

| ファイル | 内容 |
|----------|------|
| `src/services/storageService.ts` | AsyncStorage ラッパー |
| `src/stores/gameStore.ts` | Zustand persist middleware |
| 日次リセット | プレイ回数を毎日リセット |

### Phase 3: 追加ゲーム ✅

| ファイル | ゲーム |
|----------|--------|
| `src/screens/games/MuFreQScreen.tsx` | 周波数当て（音声あり） |
| `src/screens/games/MuCompScreen.tsx` | コンプレッサー検出 |
| `src/screens/games/MuRushScreen.tsx` | 60秒タイムアタック |
| `src/screens/games/MuVerbScreen.tsx` | リバーブ識別 |
| `src/screens/games/MuWidthScreen.tsx` | ステレオ幅識別 |
| `src/hooks/useGameLogic.ts` | 共通ゲームロジック |
| `App.tsx` | 全5ゲームルーティング |

---

## 音声ファイルの状態

### 現在の問題 ⚠️

元音源のヘッドルームが約3dBしかなく、+6dB EQブーストがクリッピングしている。

**解決策**: iZotope RXで元音源を-6dB下げてからEQをかけ直す

### ファイル構成

```
assets/audio/mufreq/
├── track_01/ ... track_10/
│   ├── original.m4a    # 元音源
│   ├── 60hz.m4a       # +6dB @ 60Hz
│   ├── 125hz.m4a      # +6dB @ 125Hz
│   ├── 250hz.m4a      # +6dB @ 250Hz
│   ├── 500hz.m4a      # +6dB @ 500Hz
│   ├── 1khz.m4a       # +6dB @ 1kHz
│   ├── 2khz.m4a       # +6dB @ 2kHz
│   ├── 4khz.m4a       # +6dB @ 4kHz
│   ├── 8khz.m4a       # +6dB @ 8kHz
│   └── 12khz.m4a      # +6dB @ 12kHz
```

### 変換スクリプト

```bash
/Users/kimny/Dropbox/_DevProjects/mued/MUEDear_Tracks/convert_to_m4a.sh
```

音源を修正後、このスクリプトでWAV → M4A変換。

---

## ゲーム実装状態

| ID | 名前 | 画面 | 音声 | 状態 |
|----|------|------|------|------|
| mufreq | MuFreQ | ✅ | ⚠️ 要修正 | プレイ可能（音量調整必要） |
| mucomp | MuComp | ✅ | ❌ 未実装 | UI完成、音声なし |
| murush | MuRush | ✅ | ⚠️ 要修正 | プレイ可能（EQ音源使用） |
| muverb | MuVerb | ✅ | ❌ 未実装 | UI完成、音声なし |
| muwidth | MuWidth | ✅ | ❌ 未実装 | UI完成、音声なし |

---

## 次のステップ

### 優先度: 高
1. **音源修正**: 元音源-6dB → EQ+6dB で再処理（iZotope RX）
2. 変換スクリプト再実行
3. 動作確認（EQの違いが聞き取れるか）

### 優先度: 中
4. MuComp用音声作成（コンプレッサー処理）
5. MuVerb用音声作成（リバーブ処理）
6. MuWidth用音声作成（M/S処理）

### 優先度: 低
7. AdMob統合
8. UI調整（Figmaデザイン反映）

---

## 重要ファイル一覧

| ファイル | 内容 |
|----------|------|
| `docs/muedear/MUEDEAR_PLAN.md` | 全体計画書 |
| `docs/muedear/FIGMA_DESIGN_SPEC.md` | Figma AI向けデザイン仕様 |
| `apps/muedear/App.tsx` | メインアプリ（画面遷移） |
| `apps/muedear/src/services/audioService.ts` | 音声再生エンジン |
| `apps/muedear/src/services/storageService.ts` | 永続化サービス |
| `apps/muedear/src/stores/gameStore.ts` | Zustandストア |
| `apps/muedear/src/hooks/useGameLogic.ts` | 共通ゲームロジック |

---

## 注意事項

- **必ず `mued_v2-muedear/` でセッションを開始すること**
- `mued_v2/` で作業するとmainブランチを編集してしまう
- 音声ファイルは272MB（.gitignoreで除外推奨）
- Figma MCPはFigmaデスクトップアプリが起動している必要あり

---

## ワークツリー構成

```
mued_v2/          → main（ベース、安定版）
mued_v2-hoo/      → feature/hoo-v1（Hoo会話機能）
mued_v2-muedear/  → feature/muedear（MUEDear）← ここで作業
```

---

*最終更新: 2026-01-20*
