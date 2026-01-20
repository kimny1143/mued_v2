# Hoo AI PoC Evaluation Result

**Date**: 2026-01-20
**Purpose**: Model selection for Hoo AI conversation feature (MUEDnote Basic plan)

---

## Executive Summary

**Recommended Model: Claude Haiku 4.5**

After evaluating 6 models across 3 providers (Anthropic, Google, OpenAI), Claude Haiku 4.5 provides the best balance of quality, cost, and latency for the Hoo AI conversation feature.

---

## Results Summary

| Model | Avg Latency | Session Cost | Tokens | Score | Status |
|-------|-------------|--------------|--------|-------|--------|
| **Claude Haiku 4.5** | 2,961ms | 1.32 JPY | 5,617 | **92/100** | **RECOMMENDED** |
| Claude Sonnet 4 | 4,761ms | 3.31 JPY | 5,055 | 88/100 | Too expensive |
| GPT-4.1 Mini | 3,763ms | 0.41 JPY | 4,794 | 75/100 | Acceptable fallback |
| Gemini 2.5 Flash | 2,352ms | 0.11 JPY | 3,433 | 68/100 | Cost fallback |
| Gemini 2.0 Flash | 1,257ms | 0.06 JPY | 3,137 | 45/100 | Encoding bug |
| GPT-5 Mini | 11,592ms | 0.59 JPY | 3,700 | N/A | **FAILED** (hang) |

---

## Test Methodology

### Test Scenario (4-message flow)

1. "こんにちわ"
2. "曲が完成しないんだよね。途中まではいいんだけど、いつも最後まで作れない。"
3. "最近考えてることがバラバラで整理できてない。新しいアルバムのコンセプトと、ライブの準備と、SNSの発信と..."
4. "ここまでの話をまとめて"

### Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Hoo Character | 40% | "ほほう", questioning style, deep-diving |
| Response Quality | 25% | Natural language, structured insights |
| Cost | 20% | Target: <2 JPY/session |
| Latency | 10% | Target: <5 seconds |
| Context Retention | 5% | Conversation coherence |

---

## Detailed Model Analysis

### 1. Claude Haiku 4.5 - RECOMMENDED

| Aspect | Rating | Notes |
|--------|--------|-------|
| Hoo Character | 4.5/5 | "ほほう。途中までいいなら素材はあるわけだ。" |
| Response Quality | 4.5/5 | Identified root cause (priority, not creativity) |
| Deep-diving | 4.5/5 | Time-axis analysis (今すぐ/中期的/日々) |
| Cost | 4/5 | 1.32 JPY acceptable for Basic |
| Latency | 4.5/5 | ~3s average |

**Key Insight Generated:**
> 曲が完成しないのは、実は曲の問題じゃなくて、その背景にある **やることの優先順位が定まってない** ってことか。

---

### 2. Claude Sonnet 4 - High Quality, High Cost

| Aspect | Rating | Notes |
|--------|--------|-------|
| Quality | 4.5/5 | Highest quality responses |
| Cost | 2.5/5 | 3.31 JPY (2.5x Haiku) |

**Verdict:** Too expensive for Basic plan. Consider for Premium features.

---

### 3. GPT-4.1 Mini - Acceptable Alternative

| Aspect | Rating | Notes |
|--------|--------|-------|
| Hoo Character | 3.5/5 | Uses "ほほう" but less distinctive |
| Response Quality | 4/5 | Structured, good analysis |
| Deep-diving | 3.5/5 | More shallow than Claude |
| Cost | 4.5/5 | 0.41 JPY (very low) |
| Latency | 4/5 | ~3.7s average |

**Sample:**
> ほほう、曲の制作の途中で止まってしまうわけですね。

**Verdict:** Good fallback if Anthropic unavailable.

---

### 4. Gemini 2.5 Flash - Budget Fallback

| Aspect | Rating | Notes |
|--------|--------|-------|
| Hoo Character | 3/5 | "承知しました" feels formal |
| Response Quality | 3.5/5 | Menu-style responses |
| Cost | 5/5 | 0.11 JPY (cheapest stable) |
| Latency | 5/5 | 2.3s average |

**Verdict:** Good for cost-sensitive scenarios or API outages.

---

### 5. Gemini 2.0 Flash - NOT RECOMMENDED

**Critical Bug:** Character encoding issue

```
ほほう。曲が完成しないとのこと、具体的にどのあたりで আটকেしまうのでしょうか？
```

Bengali script "আটকে" appearing in Japanese output.

**Verdict:** Unusable in production.

---

### 6. GPT-5 Mini - FAILED

**Critical Issues:**
- **Hung on 2nd message** (timeout after 2 min)
- Latency: 11.6s average (too slow)
- Response style: Menu-driven, not conversational

**Sample (before hang):**
```
選べる入り口（一つ選んでください）
- アイデア出し／発散
- 意思決定（選択肢の比較）
...
```

**Verdict:** Unusable. Reasoning model overhead too high for chat.

---

## Cost Analysis (Monthly Projection)

Based on Basic plan limit: 150 conversations/month

| Model | Cost/Session | Monthly | Annual |
|-------|--------------|---------|--------|
| Claude Haiku 4.5 | 1.32 JPY | 198 JPY | 2,376 JPY |
| Claude Sonnet 4 | 3.31 JPY | 497 JPY | 5,959 JPY |
| GPT-4.1 Mini | 0.41 JPY | 62 JPY | 740 JPY |
| Gemini 2.5 Flash | 0.11 JPY | 17 JPY | 198 JPY |

**Basic plan at 980 JPY/month provides healthy margin with Haiku.**

---

## Final Decision

### Production Configuration

| Tier | Primary Model | Fallback | Notes |
|------|---------------|----------|-------|
| **Basic** | Claude Haiku 4.5 | Gemini 2.5 Flash | Best quality/cost |
| **Premium (BYOK)** | User's choice | - | All providers supported |

### Rejected Models

| Model | Reason |
|-------|--------|
| Claude Sonnet 4 | Too expensive (2.5x Haiku, similar quality) |
| Gemini 2.0 Flash | Character encoding bug |
| GPT-5 Mini | Timeout/hang issues, not conversational |

---

## Next Steps (Phase 1)

1. Implement production Hoo chat API with Haiku 4.5
2. Add conversation count tracking (150/month for Basic)
3. Implement Free tier fallback (template responses only)
4. Add conversation history storage
5. Build web chat UI

---

## Appendix

- Raw test data: [modelTalkPoc.md](./modelTalkPoc.md)
- Evaluation guide: [poc-evaluation-guide.md](./poc-evaluation-guide.md)
- Test scenarios: [scenario-inputs.md](./scenario-inputs.md)

---

*Evaluation completed: 2026-01-20*
