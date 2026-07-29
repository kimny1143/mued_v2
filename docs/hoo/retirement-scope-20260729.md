# Hoo/chat 退役 — 依存の実測と scope 判定（2026-07-29）

kimny 承認（Chief 経由・逐語「Hoo/chat の退役も進めていいね」）を受けた実測。
**merge は 8/4 以降**（測定窓中はアプリ挙動を変えない）。

> ★**この文書は「固定リスト」ではなく判定の記録である。** scope は kimny 原理から導いた:
> **Hoo 会話は MUEDial の中と MCP でしか意味をなさない。原価の置き場は「経済圏内」か
> 「ユーザー課金」の2つだけ。どちらにも置けない面が退役対象。**
> ∴ 最初に決めるべきは「**どの面が実際に LLM 原価を負うか**」であり、面の名前ではない。

## 判定表（実測）

| route | LLM 原価 | in-repo 呼び手 | 判定 | 根拠 |
|---|---|---|---|---|
| `hoo/chat` | **YES** (Anthropic) | **0** | **退役** | 原価を負い、経済圏内にもユーザー課金にも置けない |
| `hoo/poc/chat` | **YES** | **0** | **退役** | PoC。docs にも外部呼び手の記載なし |
| `hoo/conversations/[id]` | **YES** ★ | **0** | **退役** | ★GET が欠けたタイトルを LLM 生成する＝**読み取り面が黙って課金する** |
| `hoo/conversations` | no | **0** | **退役** | 原価は無いが `hoo/chat` 消滅後は単独で意味を持たない |
| `hoo/sessions/context` | no | **0** | **退役** | 同上 |
| `hoo/memory` / `memory/toggle` | no | ★**`app/dashboard/settings/page.tsx`** | ★**存続** | **本番の live UI が叩いている**（GET/POST/PATCH） |
| `hoo/memory/extract` | **YES** (★**OpenAI**) | ★**MCP worker** | ★**存続** | `workers/hoo-mcp/src/tools.ts:933` が4通ごとに叩く＝**MCP 経済圏内** |
| `lobe/hoo` | **no** | **0** | ★**対象外** | ★**LLM に到達しない**＝原価の置き場を問う原理が当たらない |

**テーブル `hoo_conversations` / `hoo_memories` は存続。** worker が
`workers/hoo-mcp/src/tools.ts` で**直接 SQL 8箇所**読み書きしており、route を消しても
データ層は必要。（route 削除とテーブル削除は別判断。）

## 測り方（再現手順）

LLM 到達は**記号 grep ではなく import の推移閉包**で測る。route に `anthropic` の文字が
無くても、`lib/ai/providers` 経由で到達する（#786 で確認済の型）。

★**既知 YES を陽性対照に置くこと**: `app/api/dial/chat/route.ts` が LLM 到達 = true に
ならなければ、その検査は成立していない。

> ★**一度 失敗している**: 最初 shell で `for l in $libs` と書いたところ、**zsh は
> 変数を単語分割しない**ため全8面が「LLM 到達なし」＝**全滅の 0** を返した。
> 陽性対照は置いていたが、**対照は「repo に anthropic が在るか」を測っており、
> ループの解決能力を測っていなかった**。対照は検査の**壊れる部分**に当てること。

## ★本番の実トラフィック（2026-07-29 実測）

**Vercel runtime log（production）を読める**ことが分かったので、410 を出す前に直接測った。

| クエリ | 窓 | 結果 |
|---|---|---|
| `/api/hoo` | 24h | ★**0 件** |
| ★**陽性対照** `/api/dial/credits/balance` | 24h | **実ログ複数行** ＝ 全文検索は機能している |
| `api/hoo` | 7d | **timeout**（★取得できていない。**0 件ではない**） |

★ **このツールは「時間内に終わらなかったので取得していない」と明示的に言う**ので、
**「0 件」と「検査不成立」が出力自体で区別できる**。0 を意味づけてよいのは 24h の方だけ。

∴ **退役の risk は当初想定より低い。** ただし **24h は狭い窓**で、
**iOS が週次でしか叩かない可能性**は排除できていない。

## ★測れていないもの（判断が要る）

**MUEDnote iOS の repo はこのマシンに無い**（`.git` は `mued_v2` と `threads-api` のみ）。
そして docs には**実装コードが載っている**:

- `docs/muedlobe/muedlobe_spec_v4.2.md:1025` — Swift: `URL(string: "https://mued.jp/api/lobe/hoo")`
- `docs/planning/phase1-ios-handoff.md:57-63` — iOS が `/api/hoo/chat` `/conversations`
  `/memory` `/sessions/context` を叩く表

★ さらに **`muednote_mobile_sessions` に行が実在**（kimny 実機スクショ・最新 2026/04/04
＝約4ヶ月前）＝**repo 外のモバイル client が過去にこの API 面へ書いている**。
「いま live」の証拠ではないが、「存在しない」の反証にはなる。

★ **`apps/muedear` は 0 件**（陽性対照 129 ファイル）＝ MUEDear は叩いていない。

## 退役に付随して直す箇所（退役は fail-silent なので網羅する）

- `README.md:373` — `| /api/hoo/* | 7 routes | …` の件数と説明
- `tests/unit/api/hoo-chat.test.ts`（18 ケース）— 退役面を直接テストしている
- `tests/unit/middleware/rate-limit.test.ts:126` — `/api/hoo/chat` を URL に使用
- ★ `lib/middleware/rate-limit.ts:137` — **`lobe-commentary` を "ai" バケットから分離した理由が
  `/api/hoo/chat` の存在を根拠にしている**。退役すると**理由が実在しない route を指す**
  （2026-07-29 に同じ形を同一ファイルで4回 踏んでいる。コードを変えたら隣のコメントを見る）
- `middleware.ts` — `/api/hoo/*` は一般 matcher で保護されており**個別の記述は無い**＝変更不要

## `INTERNAL_API_KEY` 経路の全列挙（棚卸しの「MCP 間接 LLM 経路＝未検証」を閉じる）

**検証側（キーを検査する route）4本**
`app/api/glasswerks/inquiry/notify` / `app/api/hoo/memory/extract` /
`app/api/advisory/kpi-monthly` / `app/api/email/welcome`

**送信側（キーを送る）2本**
`workers/hoo-mcp/src/tools.ts:932` → `hoo/memory/extract` ／
`workers/hoo-mcp/src/tools-glasswerks.ts:342` → `glasswerks/inquiry/notify`

★ `advisory/kpi-monthly` と `email/welcome` は**送信側が repo 内に存在しない**＝cron か外部。
∴ **MCP 間接の LLM 経路は `memory/extract`（OpenAI）の1本のみ**が確定。

（キーの値は記載しない。存在と経路のみ。）
