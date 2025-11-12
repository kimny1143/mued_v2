# GitHub Issue #2 Response - MIDI-LLM Debug Results

**Date**: 2025-11-12
**Issue**: https://github.com/slSeanWU/MIDI-LLM/issues/2
**Title**: Model vocabulary (55K tokens) exceeds anticipation library support (27K tokens)

---

Hi, thanks for the quick response!

I ran a debug version on Modal.com (A10G GPU) and gathered the requested information.

## 1. Input Prompt

Full prompt with system message:
```
You are a helpful AI assistant for music generation. You are about to compose a piece of music based on the user's instructions. Ensure that the music is coherent, musical, and follows the user's requests.

User: Generate a short C major scale for piano
```

## 2. Outputs After `outputs - LLAMA_VOCAB_SIZE`

**Token Statistics:**
- Count: 128 tokens
- Min: 100
- Max: 27512
- Mean: 13307.16

**First 50 tokens:**
```python
[10000, 27512, 100, 10000, 27512, 200, 10000, 27512, 300, 10000,
 27512, 400, 10000, 27512, 500, 10000, 27512, 600, 10000, 27512,
 700, 10000, 27512, 800, 10000, 27512, 900, 10000, 27512, 1000,
 10000, 27512, 1100, 10000, 27512, 1200, 10000, 27512, 1300, 10000,
 27512, 1400, 10000, 27512, 1500, 10000, 27512, 1600, 10000, 27512]
```

**Token Distribution:**
- `0-10000` (time): 42 tokens
- `10000-11000` (duration): 43 tokens
- `11000-27512` (note): 0 tokens
- **`27512-55024` (control vocab): 43 tokens** ← Problem!
- `>55024` (out of range): 0 tokens
- negative: 0 tokens

## Key Finding

**The token `27512` appears at duration positions (index 1, 6, 11, 16...):**

```
Pattern: [time, duration, note, time, duration, note, ...]
         [10000, 27512,  100, 10000, 27512,  200, ...]
                 ^^^^^                ^^^^^
                 control token (should be 0-999 for duration)
```

**Token 27512 = First token in control vocabulary (𝒰)**

This is an **anticipated/control token** that should be converted to a regular token (0-27511) by Line 298 in `events_to_compound()`, but it's **not being converted**.

## Error Location

The error occurs at a **different line** than originally reported:

```python
File "anticipation/convert.py", line 330, in events_to_compound
    assert max(out[1::5]) < MAX_DUR
           ^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError
```

- `out[1::5]` = duration tokens (every 5th element starting at index 1)
- `max(out[1::5])` = **27512**
- `MAX_DUR` = **1000**
- `27512 < 1000` → **False** → AssertionError

## Question

**Is Line 298 supposed to convert control tokens (27512-55023) to regular tokens (0-27511)?**

Looking at the code in `anticipation/convert.py#L298`:
```python
out.append(toks[i] - MAX_TIME - MAX_DUR)
```

This line should map control vocab → regular vocab, but **token 27512 is not being converted**.

Does the demo site use a different version of the anticipation library, or is there a preprocessing step missing in the public code?

---

**Debug code used:** Available at https://github.com/kimny1143/mued_v2/blob/feature/midi-llm-poc/modal_app/midi_llm_server_debug.py
