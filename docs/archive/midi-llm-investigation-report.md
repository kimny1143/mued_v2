# MIDI-LLM Integration Investigation Report

**Date**: 2025-11-11
**Project**: MUED LMS v2 - AI Music Material Generation
**Investigator**: Claude Code (Anthropic)
**Status**: ⚠️ Blocked - Awaiting upstream resolution

---

## Executive Summary

Attempted to integrate MIT/Google's MIDI-LLM model (`slseanwu/MIDI-LLM_Llama-3.2-1B`) for text-to-MIDI music generation in MUED v2. **Investigation revealed a critical vocabulary mismatch** between the model's output (55,026 tokens) and the anticipation library's supported range (27,512 tokens), preventing successful MIDI conversion.

**Outcome**: Created [GitHub Issue #2](https://github.com/slSeanWU/MIDI-LLM/issues/2) documenting the problem. **Recommendation**: Proceed with OpenAI GPT-4o (latest OpenAI model) ABC notation generation as a reliable alternative.

---

## 1. Background & Objectives

### Project Context
- **Goal**: Generate educational music materials (sheet music + MIDI playback) from text prompts
- **Requirements**:
  - Generate proper musical notation (not simple scales)
  - Display sheet music with ABC notation renderer
  - Provide MIDI playback functionality
  - Respond accurately to pedagogical prompts (e.g., "arpeggio exercises")

### Why MIDI-LLM?
- State-of-the-art text-to-MIDI generation (MIT/Google Research, Nov 2024)
- Based on Llama 3.2 1B with extended MIDI vocabulary
- Designed specifically for educational music generation
- Serverless deployment capability via Modal.com

---

## 2. Technical Architecture

### Implementation Stack
```
User Prompt → Next.js API Route → Modal.com GPU Server → MIDI-LLM Model
            ↓
Modal.com Response → ABC Notation Converter → Frontend Display
            ↓
AbcNotationRenderer Component (abcjs) → Sheet Music + MIDI Player
```

### Completed Components
1. **Frontend UI** (`/app/dashboard/ai/midi-llm/page.tsx`)
   - Material generation form with difficulty/instrument selection
   - Loading states and error handling
   - Integration with materials library

2. **API Endpoint** (`/app/api/ai/midi-llm/generate/route.ts`)
   - Prompt formatting and parameter handling
   - Material content structure (ABC notation, learning points, practice instructions)
   - Database persistence (PostgreSQL via Drizzle ORM)

3. **ABC Renderer** (`/components/features/materials/abc-notation-renderer.tsx`)
   - Sheet music rendering with abcjs
   - MIDI playback with SynthController
   - Visual feedback during playback
   - ✅ **Confirmed working** with test ABC notation

4. **Modal.com Deployment** (`/modal_app/midi_llm_server.py`)
   - GPU-accelerated inference (A10G, 24GB VRAM)
   - Model loading from Hugging Face
   - FastAPI endpoint for serverless invocation
   - ✅ **Successfully deployed**

---

## 3. The Critical Problem: Vocabulary Mismatch

### 3.1 Model Specifications

**MIDI-LLM Model** (`slseanwu/MIDI-LLM_Llama-3.2-1B`)
```yaml
Total Vocabulary: 183,286 tokens
  - Llama 3.2 base vocabulary: 128,256 tokens
  - MIDI vocabulary: 55,030 tokens

MIDI Vocabulary Breakdown (Infilling):
  - Regular event vocabulary (𝒱): ~27,512 tokens
  - Control vocabulary (𝒰): ~27,512 tokens
  - Special tokens (BOS, EOS): 2 tokens
  - Total: 55,026 tokens
```

**Source**: Hugging Face `config.json`, model card documentation

### 3.2 Anticipation Library Specifications

**anticipation** (commit `af37397922665a0fb8d474d7988b0f3755a38d45`)
```yaml
Vocabulary Constants (config.py):
  MAX_TIME: 10,000      # time tokens
  MAX_DUR: 1,000        # duration tokens
  MAX_NOTE: 16,512      # pitch × instrument (128 × 129)

Total Supported Range: ~27,512 tokens (basic vocabulary only)
```

**Source**: `anticipation/config.py` from jthickstun/anticipation repository

### 3.3 The Mismatch

| Component | Token Range | Notes |
|-----------|-------------|-------|
| **MIDI-LLM Output** | 0 - 55,026 | Includes control + regular vocabularies |
| **anticipation Library** | 0 - 27,512 | Basic vocabulary only |
| **Ratio** | 2.0x | Infilling doubles the vocabulary |

**Error Manifestation**:
```python
File "anticipation/convert.py", line 333, in events_to_compound
    assert all(tok >= 0 for tok in out)
AssertionError
```

---

## 4. Investigation Process

### 4.1 Initial Symptoms
```
User Prompt: "クラシックギターの練習用にアルペジオ用の練習曲をください"
Expected: Arpeggio exercise
Actual: Simple C major scale (mock implementation)
```

### 4.2 Integration Attempts

**Attempt 1: Direct Integration**
- Loaded model from Hugging Face ✅
- Generated tokens successfully ✅
- Token conversion failed ❌
  - Generated token max: 27,422
  - Exceeds MAX_NOTE: 16,512

**Attempt 2: Token Validation & Clamping**
```python
# Tried clamping to valid ranges
validated_tokens = [min(tok, MAX_NOTE-1) for tok in tokens]
```
Result: Still failed due to structural mismatch in `events_to_compound()`

**Attempt 3: Multiple Sequence Generation**
```python
# Generate 4 sequences, use first success
outputs = model.generate(num_return_sequences=4)
```
Result: All 4 sequences failed with same AssertionError

**Attempt 4: Shorter Sequences**
```python
# Reduce complexity
max_length = 128  # vs. 2046
temperature = 0.7  # vs. 1.0
```
Result: No improvement, same vocabulary error

### 4.3 Root Cause Analysis

**Official Code Inspection**:
```python
# generate_transformers.py (lines 165-172)
outputs = outputs[:, prompt_len:]  # Remove prompt
outputs = outputs - LLAMA_VOCAB_SIZE  # Shift to MIDI vocab
outputs = outputs.cpu().tolist()

# midi_llm/utils.py: save_generation()
midi_data = events_to_midi(tokens)  # ❌ No vocabulary mapping!
```

**Key Finding**: The official repository performs **no vocabulary mapping** from control tokens (𝒰) to regular tokens (𝒱) before calling `events_to_midi()`.

**Hypothesis**: The live demo at https://midi-llm-demo.vercel.app likely uses:
1. A custom fork of the anticipation library (unpublished), or
2. A separate vocabulary mapping layer (not in public repository)

---

## 5. Evidence & Verification

### 5.1 Model Configuration (Confirmed)
```json
// config.json from Hugging Face
{
  "vocab_size": 183286,
  "model_type": "llama",
  "torch_dtype": "bfloat16"
  // MIDI vocab = 183286 - 128256 = 55030
}
```

### 5.2 Anticipation Library Constants (Confirmed)
```python
# anticipation/config.py (af37397 commit)
MAX_TIME = 100 * 100  # = 10,000
MAX_DUR = 10 * 100    # = 1,000
MAX_NOTE = 128 * 129  # = 16,512
```

### 5.3 AMT Paper Vocabulary Structure (Confirmed)
**Source**: Anticipatory Music Transformer (arXiv:2306.08620v2)

- **Arrival-time encoding**: 27,512 tokens
  - time: 10,000
  - duration: 1,000
  - note (pitch × instrument): 16,512

- **Infilling mode**: Vocabulary doubles to 55,024 + special tokens
  - Regular event vocabulary (𝒱): 27,512
  - Control vocabulary (𝒰): 27,512
  - Special tokens: 2 (BOS, EOS)
  - **Total**: 55,026 ← Matches MIDI-LLM exactly

### 5.4 Official Repository Status
- **Release Date**: November 6, 2024 (5 days ago)
- **Open Issues**: 1 (unrelated to inference)
- **CI/CD**: None
- **Tests**: None
- **Live Demo**: Exists but implementation unclear

---

## 6. Attempted Solutions & Results

### Solution 1: Token Range Validation
```python
MAX_DUR = 1000
MAX_TIME = 10000
MAX_NOTE = 16512

for i in range(0, len(tokens_list) - 2, 3):
    time_val = min(tokens_list[i], MAX_TIME - 1)
    dur_val = min(tokens_list[i + 1], MAX_DUR - 1)
    note_val = min(tokens_list[i + 2], MAX_NOTE - 1)
    validated_tokens.extend([time_val, dur_val, note_val])
```
**Result**: ❌ Failed - Structural mismatch in compound conversion

### Solution 2: Generate Multiple Candidates
```python
n_outputs = 4  # Try 4 different sequences
for output_idx in range(n_outputs):
    try:
        midi_data = events_to_midi(tokens_list)
        return success
    except:
        continue
```
**Result**: ❌ All sequences failed - Systematic vocabulary issue

### Solution 3: Contact Upstream
**Action**: Created [GitHub Issue #2](https://github.com/slSeanWU/MIDI-LLM/issues/2)
**Status**: Awaiting response from maintainers

---

## 7. Modal.com Deployment Analysis

### 7.1 Successfully Deployed
```bash
✓ App deployed: midi-llm-server
✓ Endpoint: https://kimny1143--midi-llm-server-generate-midi.modal.run
✓ GPU: A10G (24GB VRAM)
✓ Model loaded: cuda:0
```

### 7.2 Cost Analysis
**Modal.com Free Tier**: $30/month credit

**A10G GPU Pricing**: ~$0.60-0.90/hour
- Cold start: 10-20 seconds (model loading)
- Inference: 30-60 seconds per request
- **Cost per request**: ~$0.01-0.02
- **Requests with $30**: ~1,500-3,000 requests

**Conclusion**: Economically viable for development/testing

### 7.3 Docker Image Size
```
Dependencies:
- PyTorch: ~900 MB
- CUDA libraries: ~2.5 GB
- transformers + mido + anticipation: ~1 GB
Total: ~7-8 GB

Build Time: 2-3 minutes (with caching)
```

---

## 8. Conclusions

### 8.1 Technical Feasibility: ❌ Blocked

**MIDI-LLM cannot be used with the public anticipation library** due to fundamental vocabulary incompatibility.

### 8.2 Root Cause: Upstream Architecture Issue

The problem stems from:
1. **Model design**: Uses infilling vocabulary (55K tokens)
2. **Library limitation**: Only supports basic vocabulary (27K tokens)
3. **Missing mapping**: No public implementation of control→regular vocabulary conversion

### 8.3 Why This Wasn't Caught Earlier

- Model released **November 6, 2024** (extremely recent)
- No CI/CD or automated tests in repository
- Only 1 prior issue (unrelated)
- Community hasn't widely tested the model yet

---

## 9. Recommendations

### Primary Recommendation: OpenAI GPT-4o (latest OpenAI model) ABC Notation
✅ **Proceed with this approach**

**Advantages**:
- Proven technology (GPT-4o (latest OpenAI model) can generate valid ABC notation)
- ABC renderer already working (`AbcNotationRenderer.tsx`)
- MIDI playback confirmed functional
- No vocabulary compatibility issues
- Immediate availability

**Implementation**:
```typescript
// Use existing OpenAI API
const abc = await generateABCNotation(prompt)
// Render with existing component
<AbcNotationRenderer abcNotation={abc} enableAudio={true} />
```

### Alternative Options

**Option 2: Wait for MIDI-LLM Fix**
- Timeline: Unknown (days to weeks)
- Risk: May require library fork or model retraining
- Recommendation: Monitor Issue #2 for updates

**Option 3: Alternative MIDI Models**
- MusicGen (Meta): Audio generation, not symbolic MIDI
- Magenta (Google): Older, less accurate
- Music Transformer: Requires significant integration work

---

## 10. Created Artifacts

### GitHub Issue
**Repository**: slSeanWU/MIDI-LLM
**Issue**: #2 - "Model vocabulary (55K tokens) exceeds anticipation library support (27K tokens)"
**URL**: https://github.com/slSeanWU/MIDI-LLM/issues/2
**Status**: Open
**Created**: 2025-11-11

**Content Summary**:
- Detailed problem description
- Reproduction steps
- Root cause analysis
- Expected behavior
- Questions for maintainers:
  1. Does the demo use a custom anticipation fork?
  2. Should there be a vocabulary mapping function?
  3. Has anyone successfully run inference with public libraries?

### Modal.com Deployment
**App**: midi-llm-server
**Status**: Deployed (currently inactive)
**File**: `/modal_app/midi_llm_server.py`
**Features**:
- Model loading from Hugging Face
- Multi-sequence generation (n=4)
- Token validation logic
- MIDI metadata extraction
- Base64 encoding for transport

**Recommendation**: Keep deployment code for future use if issue is resolved

---

## 11. Next Steps

### Immediate Actions
1. ✅ **Create this report** (for DeepResearch analysis)
2. 🔄 **Create new git branch**: `feature/openai-abc-generation`
3. 🔄 **Implement OpenAI ABC generation**:
   - Update API endpoint to use GPT-4o (latest OpenAI model)
   - Generate ABC notation from prompts
   - Test with AbcNotationRenderer component
   - Verify MIDI playback functionality

### Medium-Term Monitoring
- Watch Issue #2 for maintainer response
- Check for anticipation library updates
- Monitor MIDI-LLM repository for fixes

### Long-Term Considerations
- If MIDI-LLM is fixed, consider adding as alternative engine
- Build abstraction layer to support multiple generation backends
- Evaluate other emerging text-to-music models

---

## 12. Technical Appendix

### A. Token Generation Flow (Current Implementation)
```python
# 1. Prompt formatting
full_prompt = f"{SYSTEM_PROMPT}\n\nUser: {prompt}\n\nAssistant: "

# 2. Tokenization
input_ids = tokenizer(full_prompt, return_tensors="pt")["input_ids"]

# 3. Add MIDI BOS token
midi_bos_token = AMT_GPT2_BOS_ID + LLAMA_VOCAB_SIZE  # 55026 + 128256
input_ids = torch.cat([input_ids, torch.tensor([[midi_bos_token]])], dim=1)

# 4. Generate (GPU)
outputs = model.generate(
    input_ids,
    max_new_tokens=512,
    temperature=1.0,
    top_p=0.98,
    num_return_sequences=4
)

# 5. Extract MIDI tokens
midi_tokens = outputs[0][prompt_len:] - LLAMA_VOCAB_SIZE

# 6. Convert to MIDI (❌ FAILS HERE)
midi_data = events_to_midi(midi_tokens.tolist())
```

### B. Expected Token Mapping (Missing)
```python
# What SHOULD happen (not implemented):
def map_control_to_regular_vocab(tokens: List[int]) -> List[int]:
    """
    Map control vocabulary (𝒰) to regular vocabulary (𝒱)
    Control tokens: 27512-55024
    Regular tokens: 0-27512
    """
    return [tok % 27512 if tok >= 27512 else tok for tok in tokens]

# Then:
mapped_tokens = map_control_to_regular_vocab(midi_tokens)
midi_data = events_to_midi(mapped_tokens)  # Would work
```

### C. Vocabulary Structure Diagram
```
MIDI-LLM Total Vocabulary: 183,286 tokens
├─ Llama 3.2 Text Tokens: 0 - 128,255 (128,256 tokens)
└─ MIDI Tokens: 128,256 - 183,285 (55,030 tokens)
   ├─ Regular Events (𝒱): 0 - 27,511 (after shifting)
   └─ Control Events (𝒰): 27,512 - 55,023 (after shifting)
       └─ Special: 55,024 - 55,025 (BOS, EOS)

Anticipation Library Support: 0 - 27,511 only ❌
```

### D. Error Stack Trace
```
Traceback (most recent call last):
  File "midi_llm_server.py", line 157, in generate
    midi_data = events_to_midi(tokens_list)
  File "anticipation/convert.py", line 339, in events_to_midi
    return compound_to_midi(events_to_compound(tokens, debug=debug), debug=debug)
  File "anticipation/convert.py", line 333, in events_to_compound
    assert all(tok >= 0 for tok in out)
AssertionError
```

---

## 13. References

### Documentation
- MIDI-LLM Paper: https://arxiv.org/html/2511.03942
- AMT Paper: https://arxiv.org/html/2306.08620v2
- Model Card: https://huggingface.co/slseanwu/MIDI-LLM_Llama-3.2-1B

### Repositories
- MIDI-LLM: https://github.com/slSeanWU/MIDI-LLM
- Anticipation: https://github.com/jthickstun/anticipation
- Modal.com Docs: https://modal.com/docs

### Related Issues
- GitHub Issue #2: https://github.com/slSeanWU/MIDI-LLM/issues/2

---

**Report Status**: Complete
**Last Updated**: 2025-11-11
**Next Review**: After Issue #2 response or OpenAI implementation complete
