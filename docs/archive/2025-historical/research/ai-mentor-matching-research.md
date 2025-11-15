# AIメンターマッチング機能 - リサーチレポート

**調査日**: 2025-10-08
**目的**: MUED LMSにおけるAIメンターマッチング機能の実装方針策定

---

## 📊 主要な調査結果

### 1. 業界標準のアプローチ

#### **マッチングアルゴリズムの基本**

**Gale-Shapley アルゴリズム**（ノーベル賞受賞）
- MentorcliQ の SMART Match で採用
- 安定マッチング理論に基づく
- メンター側とメンティー側の両方の希望を考慮

**K-means クラスタリング**
- メンティーをグループ化
- 類似するメンターとマッチング
- スケーラブルで効率的

**機械学習ベースのレコメンデーション**
- 精度70%以上を達成（研究データ）
- パーソナライズされた推薦で完了率が30%向上

---

### 2. 主要なマッチング要素

#### **必須パラメータ**

1. **スキルレベル**
   - 経験年数
   - 専門分野
   - 指導実績

2. **学習目標**
   - 短期目標（例: 曲を1曲マスター）
   - 長期目標（例: プロレベル習得）
   - 具体的な課題

3. **学習スタイル**
   - 視覚型 vs 聴覚型
   - 理論重視 vs 実践重視
   - ペース（速習 vs じっくり）

4. **性格・コミュニケーション**
   - 共感性
   - 対人スキル
   - フィードバックスタイル

5. **スケジュール**
   - 利用可能時間帯
   - 頻度の希望
   - タイムゾーン

#### **追加パラメータ（差別化要素）**

- 趣味・興味の共通点
- 価値観の一致
- 言語・方言
- 過去の学習履歴

---

### 3. 既存プラットフォームの実装例

#### **iTalki（語学レッスン）**
**検索フィルター**:
- 価格帯
- 言語
- 国籍
- 利用可能時間

**並び替え**:
- 人気順
- 価格順
- レビュー数

**マッチング**: 手動検索が主体

---

#### **Preply（語学レッスン）**
**検索フィルター**:
- iTalkiと同様
- **追加**: 関連性順（relevance）

**特徴**:
- より大規模な講師数（英語講師: 11,664人 vs iTalki: 7,286人）
- 検索結果の並び替えオプションが充実

**マッチング**: 手動検索 + アルゴリズムによる関連性スコア

---

#### **Guider AI（メンタリング専門）**
**AI機能**:
- プロフィール自動分析
- 多次元パラメータマッチング
- パーソナライズされた学習プラン

**特徴**:
- 独自のマッチングアルゴリズム
- AIと人間の選択を組み合わせ
- データ駆動型インサイト

---

### 4. 倫理的考慮事項

#### **バイアスのリスク**

**問題**:
- アルゴリズムが無意識のバイアスを含む可能性
- データセットの偏りが判断に影響

**対策**:
- 多様性を考慮したデータ収集
- アルゴリズム設計での配慮
- 継続的なモニタリング
- 透明性の確保

**MUEDでの適用**:
- 性別・年齢・地域などでの差別を排除
- 音楽ジャンルの偏りに注意
- 定期的なアルゴリズム監査

---

## 🎯 MUEDへの推奨実装

### フェーズ1: MVP（今月中）

#### **簡易版AIマッチング**

**アプローチ**: ルールベース + スコアリング

**マッチングスコアの計算**:
```typescript
matchScore =
  skillLevelMatch * 0.25 +      // スキルレベルの近さ
  goalAlignment * 0.20 +         // 学習目標の一致度
  scheduleOverlap * 0.20 +       // スケジュールの重なり
  priceCompatibility * 0.15 +    // 価格帯の適合性
  reviewScore * 0.10 +           // レビュー評価
  genreMatch * 0.10              // 音楽ジャンルの一致
```

**実装方法**:
1. ユーザープロフィールから基本情報を抽出
2. メンターの属性と照合
3. スコアリングして上位3-5名を推薦
4. ユーザーが最終選択

**データポイント**:
- 【学生側】: 目標、レベル、希望ジャンル、希望時間帯、予算
- 【メンター側】: 専門分野、指導レベル、得意ジャンル、空き時間、価格

**実装コスト**: 低（1-2週間）

---

### フェーズ2: 機械学習導入（3-6ヶ月）

#### **協調フィルタリング**

**アプローチ**:
- 過去のマッチング成功データを学習
- 類似ユーザーの選択パターンを分析
- レコメンデーション精度向上

**必要なデータ**:
- マッチング履歴
- レッスン継続率
- 満足度評価
- レビューテキスト

**期待効果**:
- マッチング精度: 70%以上
- レッスン完了率: 30%向上

---

### フェーズ3: 高度なパーソナライゼーション（1年後）

#### **ディープラーニング + NLP**

**機能**:
- レビューテキストの感情分析
- 学習履歴からの性格推定
- リアルタイム学習スタイル適応

**OpenAI API 活用**:
```typescript
// ユーザープロフィールと目標をGPT-4に渡す
const matchingPrompt = `
  学生プロフィール:
  - レベル: 初級
  - 目標: ジャズピアノを3ヶ月で基礎習得
  - 学習スタイル: 実践重視

  メンターリスト: [...]

  最適な3名を推薦し、理由を説明してください。
`;

const recommendation = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: matchingPrompt }]
});
```

---

## 🔧 技術実装案（MVP）

### データモデル

```typescript
// ユーザープロフィール拡張
interface StudentProfile {
  userId: string;

  // 学習目標
  goals: {
    shortTerm: string;  // "3ヶ月でジャズピアノ基礎"
    longTerm: string;   // "1年でライブ演奏"
    specificChallenges: string[];
  };

  // スキルレベル
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';

  // 学習スタイル
  learningStyle: {
    pace: 'fast' | 'moderate' | 'slow';
    preference: 'theory' | 'practice' | 'balanced';
    feedbackStyle: 'direct' | 'encouraging';
  };

  // 希望条件
  preferences: {
    genres: string[];        // ["jazz", "classical"]
    budget: { min: number; max: number };
    schedule: {
      timezone: string;
      availability: DayTimeSlot[];
    };
    language: string[];
  };
}

interface MentorProfile {
  userId: string;

  // 専門性
  expertise: {
    instruments: string[];
    genres: string[];
    yearsTeaching: number;
    specialties: string[];  // ["improvisation", "music theory"]
  };

  // 指導スタイル
  teachingStyle: {
    approach: 'theory' | 'practice' | 'balanced';
    studentLevel: ('beginner' | 'intermediate' | 'advanced')[];
    classFormat: ('individual' | 'group')[];
  };

  // 評価
  ratings: {
    overall: number;
    studentCount: number;
    completionRate: number;  // レッスン完了率
  };

  // 空き時間・価格
  availability: DayTimeSlot[];
  pricing: {
    hourlyRate: number;
    discounts?: { bulk?: number; };
  };
}
```

### マッチングアルゴリズム

```typescript
// /lib/matching/mentor-matcher.ts
export class MentorMatcher {
  calculateMatchScore(
    student: StudentProfile,
    mentor: MentorProfile
  ): MatchScore {
    const scores = {
      skillLevel: this.scoreSkillLevelMatch(student, mentor),
      goals: this.scoreGoalAlignment(student, mentor),
      schedule: this.scoreScheduleOverlap(student, mentor),
      price: this.scorePriceCompatibility(student, mentor),
      reviews: this.scoreReviews(mentor),
      genre: this.scoreGenreMatch(student, mentor),
    };

    // 重み付け合計
    const totalScore =
      scores.skillLevel * 0.25 +
      scores.goals * 0.20 +
      scores.schedule * 0.20 +
      scores.price * 0.15 +
      scores.reviews * 0.10 +
      scores.genre * 0.10;

    return {
      score: totalScore,
      breakdown: scores,
      reasoning: this.generateReasoning(scores),
    };
  }

  private scoreSkillLevelMatch(
    student: StudentProfile,
    mentor: MentorProfile
  ): number {
    // メンターが学生のレベルを教えられるか
    return mentor.teachingStyle.studentLevel.includes(student.skillLevel)
      ? 1.0
      : 0.3;
  }

  private scoreGoalAlignment(
    student: StudentProfile,
    mentor: MentorProfile
  ): number {
    // 学生の目標とメンターの専門性の一致度
    // 例: ジャズ希望 × ジャズ専門メンター = 高スコア
    const goalKeywords = this.extractKeywords(student.goals);
    const mentorKeywords = mentor.expertise.specialties;

    const overlap = goalKeywords.filter(k =>
      mentorKeywords.some(m => m.toLowerCase().includes(k.toLowerCase()))
    ).length;

    return overlap / Math.max(goalKeywords.length, 1);
  }

  private scoreScheduleOverlap(
    student: StudentProfile,
    mentor: MentorProfile
  ): number {
    // 希望時間帯の重なり度合い
    const studentSlots = student.preferences.schedule.availability;
    const mentorSlots = mentor.availability;

    const overlapCount = studentSlots.filter(s =>
      mentorSlots.some(m => this.slotsOverlap(s, m))
    ).length;

    return overlapCount / Math.max(studentSlots.length, 1);
  }

  private scorePriceCompatibility(
    student: StudentProfile,
    mentor: MentorProfile
  ): number {
    const { min, max } = student.preferences.budget;
    const price = mentor.pricing.hourlyRate;

    if (price < min) return 0.5;  // 安すぎるのも懸念
    if (price > max) return 0.0;  // 予算オーバー

    // 予算範囲内で、中央に近いほど高スコア
    const midpoint = (min + max) / 2;
    const distance = Math.abs(price - midpoint);
    const maxDistance = (max - min) / 2;

    return 1.0 - (distance / maxDistance);
  }

  private scoreReviews(mentor: MentorProfile): number {
    // レビュー評価 + 完了率
    return (mentor.ratings.overall / 5.0) * 0.7 +
           mentor.ratings.completionRate * 0.3;
  }

  private scoreGenreMatch(
    student: StudentProfile,
    mentor: MentorProfile
  ): number {
    const studentGenres = student.preferences.genres;
    const mentorGenres = mentor.expertise.genres;

    const matches = studentGenres.filter(g =>
      mentorGenres.includes(g)
    ).length;

    return matches / Math.max(studentGenres.length, 1);
  }

  async findTopMatches(
    student: StudentProfile,
    allMentors: MentorProfile[],
    limit: number = 5
  ): Promise<MatchResult[]> {
    const results = allMentors.map(mentor => ({
      mentor,
      ...this.calculateMatchScore(student, mentor),
    }));

    // スコア降順でソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }
}
```

---

## 🎨 UI/UX 設計

### 1. マッチング開始フロー

**画面構成**:
```
┌─────────────────────────────────────┐
│  あなたにぴったりのメンターを見つけます │
├─────────────────────────────────────┤
│ ステップ1: 学習目標を教えてください    │
│ [ ] 3ヶ月で基礎習得                  │
│ [ ] 1年でプロレベル                  │
│ [x] カスタム: _______________        │
│                                     │
│ ステップ2: あなたのレベルは？         │
│ ○ 初級  ○ 中級  ○ 上級  ○ プロ      │
│                                     │
│ ステップ3: 学習スタイル               │
│ ○ 理論重視  ○ 実践重視  ○ バランス   │
│                                     │
│        [マッチングを開始]            │
└─────────────────────────────────────┘
```

### 2. マッチング結果表示

**画面構成**:
```
┌─────────────────────────────────────┐
│  🎯 あなたにおすすめのメンター (3名)   │
├─────────────────────────────────────┤
│ 1. [🥇 95%マッチ] 山田太郎 先生       │
│    ⭐⭐⭐⭐⭐ 4.9 (120件)           │
│    専門: ジャズピアノ・即興演奏        │
│    💡 おすすめ理由:                  │
│    ✓ あなたの目標に最適な専門性      │
│    ✓ スケジュールが80%一致           │
│    ✓ 予算範囲内（¥5,500/時間）      │
│    [詳細を見る]  [予約する]         │
│                                     │
│ 2. [🥈 88%マッチ] 佐藤花子 先生       │
│    ...                              │
└─────────────────────────────────────┘
```

### 3. Premiumユーザー向け特典

**優先マッチング**:
- マッチング結果の上位表示
- 人気メンターの優先予約権
- AIによる詳細な推薦理由表示

---

## 📈 成功指標（KPI）

### 短期（1-3ヶ月）
- マッチング利用率: 30%以上
- 初回レッスン予約率: 50%以上
- マッチング満足度: 4.0/5.0以上

### 中期（6ヶ月）
- レッスン継続率: 60%以上
- Premiumプラン転換率: 15%以上
- NPS（推奨度）: 40以上

### 長期（1年）
- マッチング精度: 70%以上
- リピート予約率: 80%以上
- メンター評価: 4.5/5.0以上

---

## 🚀 実装スケジュール

### Week 1-2: データモデル設計
- [ ] StudentProfile拡張
- [ ] MentorProfile拡張
- [ ] マッチングスコア型定義

### Week 3-4: アルゴリズム実装
- [ ] MentorMatcher クラス
- [ ] スコアリング関数
- [ ] ユニットテスト

### Week 5-6: UI実装
- [ ] マッチング開始フロー
- [ ] 結果表示画面
- [ ] プレミアム機能との統合

### Week 7-8: テスト & 最適化
- [ ] E2Eテスト
- [ ] パフォーマンス最適化
- [ ] バイアステスト

---

## 💡 差別化ポイント

### MUEDならではの強み

1. **音楽特化の専門性**
   - 楽器・ジャンル・テクニックの細かいマッチング
   - 音楽理論 vs 実践のバランス考慮

2. **AI×人間のハイブリッド**
   - AIが推薦、ユーザーが最終選択
   - 透明性の高い推薦理由表示

3. **段階的学習パス**
   - 初心者 → 中級 → 上級の成長に合わせたメンター変更提案

4. **コミュニティデータ活用**
   - 同じ目標を持つ学習者の成功パターンを学習
   - レビューテキストからの洞察抽出

---

**作成者**: Claude Code
**最終更新**: 2025-10-08 06:30 JST
