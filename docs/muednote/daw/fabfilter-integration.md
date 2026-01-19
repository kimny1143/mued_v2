# FabFilter Plugin Integration

DAW Hub における FabFilter プラグインの統合に関する技術ドキュメント。

---

## 概要

FabFilter プラグイン（特に Pro-Q シリーズ）は、Ableton Live API の `str_for_value()` を通じて正しい表示値を返さない問題がある。このため、DAW Hub では専用の変換ロジックを実装している。

---

## 問題点

### AbletonOSC の value_string 取得方法

AbletonOSC は以下のコードで表示値を取得：

```python
device.parameters[param_index].str_for_value(device.parameters[param_index].value)
```

これは VST プラグインが返す文字列表現をそのまま使用する。

### Pro-Q の問題

| 実際の値 | value (正規化) | str_for_value | 期待値 |
|---------|---------------|---------------|--------|
| 11,601 Hz | 0.8813 | "13.50" | "11.60 kHz" |
| 17,130 Hz | 0.9123 | "14.06" | "17.13 kHz" |

Pro-Q は `str_for_value()` に対して内部表現（意味不明な数値）を返す。

### 原因の可能性

1. Pro-Q のダイナミックパラメータ仕様（選択バンドで動的に変化）
2. VST3 版の既知のバグ（[Gearspace報告](https://gearspace.com/board/ableton-live/1403882-fabfilter-pro-q-vst3-bug-ableton-live-windows.html)）
3. Ableton Live との互換性問題

---

## パラメータ変換式

### Frequency（周波数）

Pro-Q の周波数範囲: **10 Hz ～ 30 kHz**（対数スケール）

```typescript
frequency = 10 * (30000 / 10) ^ value
          = 10 * 3000 ^ value
```

**検証:**
- value = 0.8813 → 10 × 3000^0.8813 ≈ **11,600 Hz** ✓

### Gain（ゲイン）

Pro-Q のゲイン範囲: **-30 dB ～ +30 dB**（線形スケール）

```typescript
gain = (value - 0.5) * 60
// value=0 → -30dB, value=0.5 → 0dB, value=1 → +30dB
```

### Q（帯域幅）

Pro-Q の Q 範囲: **0.025 ～ 40**（対数スケール）

```typescript
q = 0.025 * (40 / 0.025) ^ value
  = 0.025 * 1600 ^ value
```

### Slope（スロープ）

Pro-Q の Slope 範囲: **6 ～ 96 dB/oct**（6dB刻み、線形）

```typescript
slope = (value + 1) * 6
// value=0 → 6dB/oct, value=1 → 12dB/oct, value=2 → 18dB/oct
```

| value | Slope |
|-------|-------|
| 0.0 | 6 dB/oct |
| 1.0 | 12 dB/oct (デフォルト) |
| 2.0 | 18 dB/oct |
| 3.0 | 24 dB/oct |
| ... | ... |
| 15.0 | 96 dB/oct |

---

## 実装

### DAW Hub での変換

`scripts/daw-hub/index.ts` の `formatPluginValue()` 関数で実装：

```typescript
function formatPluginValue(
  deviceName: string | undefined,
  paramName: string | undefined,
  value: number,
  originalValueString: string
): string | null {
  if (!deviceName || !paramName) return null;

  // FabFilter Pro-Q series
  if (deviceName.includes('Pro-Q')) {
    if (paramName.includes('Frequency')) {
      return formatProQFrequency(value);
    }
    if (paramName.includes('Gain') && !paramName.includes('S/C')) {
      return formatProQGain(value);
    }
    if (paramName === 'Q' || paramName.includes(' Q')) {
      return formatProQQ(value);
    }
  }

  return null;
}
```

### 対象パラメータ

| パラメータ名パターン | 変換関数 |
|---------------------|---------|
| `*Frequency*` | `formatProQFrequency()` |
| `*Gain*` (S/C除く) | `formatProQGain()` |
| `Q` または `* Q` | `formatProQQ()` |
| `*Slope*` | `formatProQSlope()` |

---

## FabFilter 公式情報

### サポートされる制御方法

1. **MIDI Learn** - 公式サポート
2. **ホストオートメーション** - VST/AU/AAX/CLAP 経由
3. **OSC** - **非サポート**（サードパーティ経由のみ）

### Pro-Q 4 パラメータ仕様

| パラメータ | 範囲 | 備考 |
|-----------|------|------|
| Frequency | 10 Hz - 30 kHz | 対数スケール |
| Gain | -30 dB - +30 dB | Bell/Shelf/Tilt のみ |
| Q | 0.025 - 40 | 6dB/oct スロープでは無効 |
| Slope | 6 - 96 dB/oct | フィルタ形状による最小値あり |

### ダイナミックパラメータの挙動

Pro-Q はバンドを選択すると、そのバンドのパラメータのみを公開する：

```
選択なし: [Device On] のみ
Band 1 選択: [Device On, Band 1 Frequency, Band 1 Gain, ...]
Band 5 選択: [Device On, Band 5 Frequency, Band 5 Gain, ...]
```

これにより：
- パラメータ数が動的に変化
- パラメータ名が動的に変化
- キャッシュした名前が古くなる問題

---

## 他の FabFilter プラグイン

### 今後対応予定

| プラグイン | 状況 |
|-----------|------|
| Pro-Q 3/4 | ✅ 対応済み |
| Pro-C 2 | 未調査 |
| Pro-L 2 | 未調査 |
| Pro-MB | 未調査 |
| Pro-R | 未調査 |

### 追加時の手順

1. `debug-proq-params.ts` を参考にパラメータ調査スクリプト作成
2. value と実際の表示値の対応を確認
3. 変換式を特定
4. `formatPluginValue()` に追加

---

## 参考リンク

- [FabFilter Pro-Q 4 Manual (PDF)](https://www.fabfilter.com/downloads/pdf/help/ffproq4-manual.pdf)
- [FabFilter Pro-Q 4 Band Controls](https://www.fabfilter.com/help/pro-q/using/bandcontrols)
- [FabFilter MIDI Learn](https://www.fabfilter.com/help/pro-q/using/midilearn)
- [AbletonOSC GitHub](https://github.com/ideoforms/AbletonOSC)
- [VST3 LogScale Documentation](https://steinbergmedia.github.io/vst3_doc/vstexamples/classSteinberg_1_1Vst_1_1LogScale.html)
- [Pro-Q Automation Bug Discussion](https://www.fabfilter.com/forum/topic/7429/fabfilter-pro-q-3-automation-bug-in-ableton)
- [VST3 Bug Report (Gearspace)](https://gearspace.com/board/ableton-live/1403882-fabfilter-pro-q-vst3-bug-ableton-live-windows.html)

---

*最終更新: 2026-01-12*
