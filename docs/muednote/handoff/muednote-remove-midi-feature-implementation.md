# MUEDnote MIDI機能削除 - 実装依頼書

**作成日**: 2026-01-29
**依頼元**: apps/muednote-hub-macos 作業スレッド
**根拠ドキュメント**: `apps/docs/muednote/daw/muednote-remove-midi-feature.md`

---

## 概要

MUEDnote Hub (macOS) から MIDI 取得機能を削除する。これに伴い、mued_v2 本体側（API、DB スキーマ、Repository）の MIDI 関連コードも削除が必要。

## 削除理由（要約）

1. **二重保存問題**: MIDI データは DAW に保存されるため、MUEDnote で複製を持つ必然性がない
2. **OSC との価値差**: OSC パラメータ変化は DAW に残らない唯一の記録で価値が高い。MIDI は重複。
3. **ログ量問題**: MIDI 全取得で 1 時間最大 12 万件。コストに見合わない。
4. **プライバシーリスク**: 演奏データ蓄積はプロユーザーの懸念材料。

---

## mued_v2 本体側 修正箇所

### 1. DB スキーマ

**ファイル**: `db/schema/muednote-daw-logs.ts`

| 削除対象 | 行番号目安 | 内容 |
|----------|------------|------|
| `dawActionEnum` の MIDI 値 | L45-49 | `midi_note_on`, `midi_note_off`, `midi_control_change`, `midi_pitch_bend` |
| `DawAction` 型の MIDI 値 | L105-108 | 同上 |
| `MIDI_DEVICE_ID` 定数 | L111 | `export const MIDI_DEVICE_ID = -2;` |
| `MIDI_ACTIONS` 定数 | L123-129 | 配列定義全体 |

**注意**: PostgreSQL の enum 値は削除できないため、スキーマ定義からは削除するが DB 上の enum 値自体は残る。

```typescript
// 削除後の dawActionEnum（MIDI 行を削除）
export const dawActionEnum = pgEnum('muednote_daw_action', [
  'parameter_change',
  'track_volume',
  'track_pan',
  'track_select',
  'clip_trigger',
  'device_config_change',
]);

// 削除後の DawAction 型
export type DawAction =
  | 'parameter_change'
  | 'track_volume'
  | 'track_pan'
  | 'track_select'
  | 'clip_trigger'
  | 'device_config_change';

// 削除: MIDI_DEVICE_ID, MIDI_ACTIONS
```

---

### 2. API エンドポイント

**ファイル**: `app/api/muednote/daw-log/route.ts`

| 削除対象 | 行番号目安 | 内容 |
|----------|------------|------|
| インポート | L21 | `MIDI_ACTIONS, OSC_ACTIONS` |
| `SourceFilter` 型 | L27 | `'midi'` を削除 |
| `source === 'midi'` 分岐 | L326-327 | 条件分岐を削除 |

```typescript
// 削除後の SourceFilter
type SourceFilter = 'osc' | 'all';

// 削除後の source 分岐（L325-329）
let actions: DawAction[] | undefined;
if (source === 'osc') {
  actions = OSC_ACTIONS;
}
// 'midi' 分岐は削除
```

**OSC_ACTIONS の扱い**:
- `OSC_ACTIONS` はスキーマから削除して、API 内でインラインで定義するか
- または `source` パラメータ自体を削除（常に全件取得）

---

### 3. Repository

**ファイル**: `lib/repositories/daw-logs.repository.ts`

| 削除対象 | 行番号目安 | 内容 |
|----------|------------|------|
| `getStats()` の `byAction` | L331-342 | MIDI アクション 4 行を削除 |

```typescript
// 削除後の byAction 初期化
const byAction: Record<DawAction, number> = {
  parameter_change: 0,
  track_volume: 0,
  track_pan: 0,
  track_select: 0,
  clip_trigger: 0,
  device_config_change: 0,
  // MIDI 行は削除
};
```

---

### 4. マイグレーション（参考）

**ファイル**: `db/migrations/0023_add_midi_log_types.sql`

このマイグレーションは既に適用済みのため、ファイルを削除しても DB には影響しない。
履歴として残すか、コメントで「DEPRECATED」と記載するかは任意。

```sql
-- DEPRECATED: MIDI feature removed (2026-01-29)
-- See: docs/muednote/handoff/muednote-remove-midi-feature-implementation.md
```

---

## 既存データの扱い

| 対応 | 内容 |
|------|------|
| **Option A: 放置** | MIDI ログデータ（あれば）はそのまま残る。API で取得されなくなるだけ。 |
| **Option B: 削除** | `DELETE FROM muednote_daw_logs WHERE action IN ('midi_note_on', 'midi_note_off', 'midi_control_change', 'midi_pitch_bend');` |

**推奨**: Option A（放置）。データ量が少なければ影響なし。

---

## 関連しない箇所（変更不要）

| ファイル | 理由 |
|----------|------|
| `app/api/ai/midi-llm/generate/route.ts` | AI 音楽生成機能。MUEDnote Hub の MIDI 取得とは無関係。 |

---

## apps 側の対応（別スレッドで実施済み/実施予定）

| 対象 | 対応 |
|------|------|
| `Services/MIDIReceiverService.swift` | ファイル削除 |
| `Services/TransportStateService.swift` | ファイル削除 |
| `MUEDnoteHubApp.swift` | MIDI 関連プロパティ・メソッド削除 |
| `Views/MenuBarView.swift` | MIDI 表示・ボタン削除 |
| `Models/DAWLog.swift` | MIDI 関連の DAWAction・extension 削除 |
| `README.md` | MIDI 機能記述削除 |

**リビルド後**: 署名 → 公証 → Staple が必要

---

## 確認事項

修正完了後、以下を確認:

1. [ ] `npm run typecheck` が通る
2. [ ] `npm run build` が通る
3. [ ] `/api/muednote/daw-log` GET/POST が正常動作
4. [ ] `source=midi` パラメータでエラーまたは無視される

---

## 備考

- PostgreSQL enum 値は削除不可のため、DB 上には `midi_*` 値が残る
- 将来 MIDI 対応を再検討する場合は、根拠ドキュメントの「制約条件」を参照
