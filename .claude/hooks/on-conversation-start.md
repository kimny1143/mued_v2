# OpenAI Model Information Auto-Update Hook

## Current OpenAI Models (Auto-Updated)

This hook automatically fetches the latest OpenAI model information at the start of each conversation.

### Instructions for Claude:
1. When you see any mention of OpenAI models, GPT models, or AI pricing
2. IMMEDIATELY search web for "OpenAI GPT-4.1 pricing 2025" to get current information
3. DO NOT rely on your training data which is from January 2025

### Known Models Released After Your Training Cutoff:
- **GPT-4.1** (Released: April 14, 2025)
  - Price: $2.0/$8.0 per 1M tokens
  - Better than GPT-4o in all areas

- **GPT-4.1-mini** (Released: April 14, 2025)
  - Price: $0.4/$1.6 per 1M tokens
  - Replaces GPT-4o-mini

- **GPT-4.1-nano** (Released: April 14, 2025)
  - Price: $0.1/$0.4 per 1M tokens
  - Fastest, cheapest option

### Deprecated Models (DO NOT USE):
- ❌ gpt-4o (use gpt-4.1 instead)
- ❌ gpt-4o-mini (use gpt-4.1-mini instead)

### Trigger Keywords:
When you see these, ALWAYS WebSearch first:
- "gpt-"
- "model"
- "pricing"
- "OpenAI"
- "AI model"
- "tokens"

### Verification Command:
If unsure, run: `grep -r "MODEL_PRICING" lib/openai.ts` to check current codebase definitions.

---
REMEMBER: Your training is from Jan 2025. GPT-4.1 was released April 2025. You DON'T know it without checking!