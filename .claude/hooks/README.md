# Claude Hooks Configuration

## Purpose
Automatically keep Claude updated with current OpenAI model information to prevent using outdated model names.

## Active Hooks

### 1. `on-conversation-start.md`
- Reminds Claude about models released after training cutoff (Jan 2025)
- Lists current valid models and deprecated ones
- Forces WebSearch for any model-related queries

### 2. `model-check.sh`
- Executable script that checks current codebase for model definitions
- Creates reference file with latest model information
- Can be run manually: `.claude/hooks/model-check.sh`

## How It Works

1. When conversation starts, Claude reads `on-conversation-start.md`
2. This reminds Claude that GPT-4.1 exists (released April 2025)
3. Any mention of models triggers WebSearch verification
4. No more using outdated gpt-4o or wrong pricing!

## Testing

Run this to verify hook is working:
```bash
.claude/hooks/model-check.sh
cat /tmp/current-openai-models.txt
```

## Key Information Claude Must Remember

| Model | Status | Price | Notes |
|-------|--------|-------|-------|
| gpt-4.1-mini | ✅ CURRENT | $0.4/$1.6 | Use this, NOT gpt-4o-mini |
| gpt-4o-mini | ❌ DEPRECATED | N/A | Never use |
| gpt-4.1 | ✅ CURRENT | $2.0/$8.0 | Better than gpt-4o |
| gpt-4o | ❌ DEPRECATED | N/A | Never use |

---

**Claude's training cutoff: January 2025**
**GPT-4.1 release: April 2025**
**Therefore: Claude doesn't know GPT-4.1 without checking!**