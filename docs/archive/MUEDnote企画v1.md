---

# MUEDnote — 技術設計書（Architectural Draft v1）

この文書は、MUEDnote のコアコンセプト・アーキテクチャ・データスキーマ・アルゴリズムを
ClaudeCode や Cursor がそのまま解釈できるよう
**技術設計に特化した形でまとめたもの**。

MVP段階から最終形までの両方を視野に入れた「段階的実装」を前提とする。

---

# 1. コンセプト

MUEDnote の目的は、
**“作曲家の非言語的な制作プロセスをAIが引き出し、構造化する”**デジタルノート。

ポイントは以下：

* ログは「自己申告」ではなく、AIインタビュアーが“問い”を投げて自然文を引き出す
* DAW／MIDI／WAV の変化を使い、ユーザーの“無意識的判断”を逆算する
* 質疑応答（Interview）がストックされ、後の自動教材生成の材料になる
* ログ＝記録ではなく、「次の思考状態に押し出す操作」

---

# 2. 全体アーキテクチャ

```
User
  ↓
Short Note（1行）
  ↓
Session Raw Input
  ↓
[ Analyzer ]  ← MIDI / WAV / DAW Meta（MVPではテキスト推定）
  ↓
Session Analysis（focus / intentHypothesis）
  ↓
[ RAG ] ← 過去ログ / 質問テンプレ / 理論知識
  ↓
Interviewer LLM（質問生成）
  ↓
2〜5問の“問い”をユーザーにチャットで提示
  ↓
ユーザー回答 → 保存 → RAGへ蓄積
```

MVPでは Analyzer を簡易版（テキスト推定）で実装し、
後に WAV/MIDI 差分解析へ差し替え可能にする。

---

# 3. データスキーマ

## 3.1 Session（MVP〜Final共通の基礎）

```ts
interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;

  type: "composition" | "practice" | "mix" | "ear_training" | "listening" | "theory" | "other";

  title: string;              // 1行タイトル
  projectId?: string;
  projectName?: string;

  userShortNote: string;      // ユーザーが最初に書く短文（1〜2行）

  dawMeta?: {
    dawName?: string;
    tempo?: number;
    timeSignature?: string;
    keyEstimate?: string;
    barsTouched?: { from: number; to: number };
  };

  // 後から拡張される領域
  aiAnnotations?: {
    focusArea?: string;
    intentHypothesis?: string;
  };
}
```

---

## 3.2 InterviewQuestion

```ts
interface InterviewQuestion {
  id: string;
  sessionId: string;
  text: string;               // 質問文
  focus: "harmony" | "melody" | "rhythm" | "mix" | "emotion" | "image" | "structure";
  depth: "shallow" | "medium" | "deep";
  createdAt: string;
}
```

---

## 3.3 InterviewAnswer

```ts
interface InterviewAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  text: string;               // ユーザーの回答
  createdAt: string;
}
```

---

## 3.4 SessionAnalysis（Analyzerの出力）

MVP → テキスト推定中心
Final → WAV/MIDI解析版 に置換

```ts
interface SessionAnalysis {
  focusArea: string;        // harmony / melody / mix / etc
  intentHypothesis: string; // 「落ち着かせようとしている」など
  barsChanged?: number[];
  tracksChanged?: string[];
}
```

---

# 4. アルゴリズム仕様

## 4.1 MVP版 Analyzer（テキスト推定）

### 入力

* userShortNote
* session.type
* 簡易自己選択の操作情報（optional）

  * “何を触った？”（メロ・コード・ビート・音色・バランス）
  * “方向性は？”（明るい / 暗い / シンプル / 派手 / 落ち着く）

### 出力

例：

```json
{
  "focusArea": "harmony",
  "intentHypothesis": "サビの印象を落ち着かせる方向で探っている感じ",
  "barsChanged": [],
  "tracksChanged": []
}
```

### ロジック概要（MVP）

* LLM に `Session` と短文を渡し、
  「この作業が音楽的に何をしている可能性が高いか？」を推定
* 簡易ルール：

  * “サビ” → harmony または melody に寄せる
  * “ベース” → rhythm / mix に寄せる
  * “音作り” → sound_design / mix

---

## 4.2 Final版 Analyzer（差分解析）

### MIDI解析

* 小節ごとに特徴量を抽出

  * pitch class histogram
  * simultaneity（和音の厚み）
  * onset density（密度）
  * quantize deviation（ズレ量）
* 差分 Δ を計算
* 変化量が閾値超え → changedBars に入れる
* 推定 focusArea

  * 和音 → harmony
  * ベース/ドラム → rhythm
  * メロディ → melody

### WAV解析

* LUFS（ラウドネス）
* 低中高帯域の平均エネルギー
* ダイナミクスレンジ

### intentHypothesis 生成

* LLM に以下を渡す：

  * 変化特徴量
  * touchedBars
  * before/after の大まかな傾向
* 出力：
  “明るくしたい意図があったように見える”

---

# 5. Interview（AIインタビュアー）仕様

## 5.1 システムロール（Interviewer LLM）

```txt
あなたは作曲家専門のインタビュアーAIです。
目的は、ユーザーが制作中に行った判断や感覚を、
自然な問いかけを通じて引き出すことです。

・コードネームや理論用語を要求しない。
・「感触」「比喩」「方向性」で答えられる質問にする。
・一度に2〜3問だけ返す。
・抽象ではなく、今回のセッションに紐づく“具体的な変化”を基準にする。
```

---

## 5.2 入力（Interviewerへのコンテキスト）

* Session（userShortNote含む）
* SessionAnalysis（focusArea / intentHypothesis）
* RAG ：

  * 過去の Q&A
  * 質問テンプレ集（harmony・melody・mix などカテゴリごと）
  * 音楽理論のサマリ

---

## 5.3 出力フォーマット

```json
{
  "questions": [
    {
      "id": "q1",
      "text": "今回サビのコードを少し落ち着かせたと思うんだけど、耳で聴いた時に“あ、この方向かな”と最初に感じたポイントってどの瞬間？",
      "focus": "harmony",
      "depth": "medium"
    },
    {
      "id": "q2",
      "text": "今のサビ、前より“前に出てる/後ろに引いてる”でいえばどっちっぽい？ざっくりの印象だけで大丈夫だよ。",
      "focus": "emotion",
      "depth": "shallow"
    }
  ]
}
```

---

# 6. 画面フロー（MVP）

1. ユーザーが新規セッション作成

   * タイプ（composition など）
   * タイトル（1行）
   * userShortNote（最低1行）
2. セッション保存
3. AI インタビュー開始（バックエンドで）

   * Analyzer（MVP版）
   * RAG
   * Interviewer LLM
4. 質問 2〜3件がチャット風に表示
5. ユーザーが回答 → 保存 → 次回のRAGへ回す

---

# 7. 段階的実装計画

### v0（MVP）

* Session CRUD
* userShortNote 取得
* 簡易 Analyzer（テキスト推定）
* AIインタビュー（質問2〜3問）
* 質問テンプレのRAG（小規模）
* 回答の保存

### v1

* DAWメタデータの半自動取得（tempo / key）
* タグ抽出の自動化（LLM）

### v2

* MIDI / WAV 差分解析の本実装（Analyzer強化）
* intentHypothesis の精度強化

### v3

* 自動教材生成（Interviewログ → 教材テンプレ）

---

# 8. 備考（ClaudeCode / Cursor 用）

* 各モジュールは独立したクラスとして実装しやすい構造になっている

  * `Analyzer`
  * `InterviewGenerator`
  * `RagRetriever`
  * `SessionRepository`
* LLM呼び出し部は

  * OpenAI / Claude / Gemini いずれでも入れ替え可能
* データスキーマは Supabase / Prisma / Firestore どれでも対応可

---

# 以上



LP向け文書：
＝普通の音楽好き・DTMer・学生でも直感的に理解できるレベル**

---

# MUEDnote（ミュードノート）

**“曲づくりの流れが見えるノート”**

## MUEDnoteって何？

音楽をつくった日、
「今日どこをいじったっけ？」
「なぜこうしたんだっけ？」
って後から思い出せない時、あるよね。

MUEDnoteは、
曲づくりの途中で **AIが軽く質問してくれて、答えるだけでその日の制作の流れが残るノート**。

むずかしい操作はない。
ただ答えるだけで、あとから自分でもビックリするくらい「頭の中」が整理される。

---

## どう役に立つの？

### 1. 自分の“癖”が見えてくる

「Aメロで必ず詰まりがち」とか
「サビ前で毎回迷う」とか、
**同じ場所で止まってる**ことがよくわかる。

これは上達への近道になる。

---

### 2. 上達のスピードが変わる

文字で考えると頭が整理される。
だけど作曲中ってそんな余裕ない。

MUEDnoteは、
**代わりに AIが質問してくれるから、答えるだけで整う。**

---

### 3. 教える側・学ぶ側、どっちにも便利

音楽スクールやオンライン講師だと、

「何がわからないの？
どこで詰まったの？」

が、なかなか言語化されない。

MUEDnoteは
**“詰まったポイント”や“悩んだ瞬間”が自然に残るから、授業やアドバイスがめちゃくちゃやりやすくなる。**

---

## だれのためのアプリ？

### ① 初心者

* 何から手をつけていいかわからない
* 毎回全体がごちゃごちゃする

→ 答えるだけで、**自分の作業が整理される**。

---

### ② 独学でやってきた中級者

* 実は理論より、制作の“流れ”が大事
* 「今日、ココを変えたから良くなった」がわかる

→ **成長が見えるツール**になる。

---

### ③ プロ・講師・YouTuber

* 生徒に説明するとき
* 動画のネタを作るとき
* 制作の裏側を話すとき

→ MUEDnoteがあれば、**説明・教材作りが楽になる**。

---

### ④ 音大・スクール・制作会社

* 生徒の成長を“結果”だけじゃなく“プロセス”で評価
* 新人の制作のクセがすぐわかる
* チームの制作フローを共有できる

→ 現場だと、**こういうツールがいちばん欲しがられる**。

---

# 難しい言葉でいうと？

実は MUEDnote の正体は
**「作曲のプロセスを見える化するツール」**。

でも、そんな難しく考える必要はなくて、

**「質問に答えるだけで作曲ノートができる」**
くらいでちょうどいい。

---

# 結局、MUEDnoteは“売れるのか？”

普通の作曲アプリとして出すより、

**「制作の流れを見える化する道具」として使われる方が売れる。**

* 個人向け：気軽に使える日記アプリ
* プロ／講師：説明が楽になる
* スクール：生徒の成長を把握できる
* 制作会社：チーム管理がラクになる

だから、
**名前のわりに “教える側・育てる側” がいちばん喜ぶアプリ**になる。

---

# 下層50%向けまとめ

むずかしいAIじゃない。
ただ、

**“今日どこを触った？”
“どんな感じにしたかった？”**

ってAIが聞いてくれる。
答えたら、それがノートになる。
それだけ。

だけど使い続けると、
だんだん自分の音楽が “どんなふうにできてるか” がわかる。

その “わかっていく感じ” が、MUEDnoteのいちばんの価値だよ。

--