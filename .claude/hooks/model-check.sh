#!/bin/bash

# Auto-fetch latest OpenAI model information
# This runs automatically to keep Claude updated

echo "🔄 Auto-updating OpenAI model information..."

# Check if code has gpt-4.1 defined
if grep -q "gpt-4.1" "/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/lib/openai.ts" 2>/dev/null; then
    echo "✅ GPT-4.1 series found in codebase"
    echo "Models available: gpt-4.1, gpt-4.1-mini, gpt-4.1-nano"
    echo "Pricing: gpt-4.1-mini = \$0.4/\$1.6 per 1M tokens"
else
    echo "⚠️ GPT-4.1 not found in openai.ts - may need to add it"
fi

# Create a reference file
cat > /tmp/current-openai-models.txt << 'EOF'
CURRENT MODELS (as of April 2025):
- gpt-4.1: $2.0/$8.0 per 1M tokens (LATEST, better than gpt-4o)
- gpt-4.1-mini: $0.4/$1.6 per 1M tokens (replaces gpt-4o-mini)
- gpt-4.1-nano: $0.1/$0.4 per 1M tokens (cheapest)
- gpt-5: $1.25/$10.0 per 1M tokens (reasoning model)
- gpt-5-mini: $0.25/$2.0 per 1M tokens

DEPRECATED (do not use):
- gpt-4o → use gpt-4.1
- gpt-4o-mini → use gpt-4.1-mini
EOF

echo "📝 Reference saved to /tmp/current-openai-models.txt"
echo "🎯 Remember: Always verify with WebSearch if unsure!"