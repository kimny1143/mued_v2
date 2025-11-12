"""
MIDI-LLM Server Debug Version
For gathering debug information requested in GitHub Issue #2
"""

import modal
from typing import Optional
import base64
import io

app = modal.App("midi-llm-debug")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install(
        "fastapi[standard]",
        "torch",
        "transformers",
        "mido",
        "numpy",
        "accelerate",
        "sentencepiece",
    )
    .pip_install(
        "git+https://github.com/jthickstun/anticipation.git@af37397922665a0fb8d474d7988b0f3755a38d45"
    )
)


@app.cls(
    image=image,
    gpu="A10G",
    scaledown_window=300,
    timeout=600,
)
class MidiLlmModelDebug:
    """MIDI-LLM model with debug output for Issue #2"""

    @modal.enter()
    def load_model(self):
        """Load MIDI-LLM model on container startup"""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        print("[DEBUG] Loading model from Hugging Face...")

        model_id = "slseanwu/MIDI-LLM_Llama-3.2-1B"

        self.tokenizer = AutoTokenizer.from_pretrained(
            model_id,
            pad_token="<|eot_id|>",
            trust_remote_code=True,
        )

        self.model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
        )

        self.LLAMA_VOCAB_SIZE = 128256
        self.AMT_GPT2_BOS_ID = 0

        self.SYSTEM_PROMPT = (
            "You are a helpful AI assistant for music generation. "
            "You are about to compose a piece of music based on the user's instructions. "
            "Ensure that the music is coherent, musical, and follows the user's requests."
        )

        print(f"[DEBUG] Model loaded successfully on {self.model.device}")

    @modal.method()
    def generate_debug(
        self,
        prompt: str,
        temperature: float = 1.0,
        max_length: int = 128,
        top_p: float = 0.98,
    ) -> dict:
        """
        Generate MIDI with DEBUG OUTPUT for GitHub Issue #2

        This version outputs:
        1. The exact input prompt
        2. Token values after LLAMA_VOCAB_SIZE subtraction
        3. Token statistics and ranges
        """
        import torch
        from anticipation.convert import events_to_midi

        # =====================================
        # DEBUG OUTPUT 1: Input Prompt
        # =====================================
        full_prompt = f"{self.SYSTEM_PROMPT}\n\nUser: {prompt}\n\nAssistant: "

        print("=" * 80)
        print("DEBUG OUTPUT FOR GITHUB ISSUE #2")
        print("=" * 80)
        print("\n1. INPUT PROMPT:")
        print("-" * 80)
        print(full_prompt)
        print("-" * 80)

        # Tokenize
        input_ids = self.tokenizer(full_prompt, return_tensors="pt", padding=False)["input_ids"]

        # Add MIDI BOS token
        midi_bos_token = self.AMT_GPT2_BOS_ID + self.LLAMA_VOCAB_SIZE
        input_ids = torch.cat([
            input_ids,
            torch.tensor([[midi_bos_token]], dtype=input_ids.dtype)
        ], dim=1).to(self.model.device)

        print(f"\n2. INPUT TOKENIZATION:")
        print(f"   - Input tokens count: {input_ids.shape[1]}")
        print(f"   - MIDI BOS token: {midi_bos_token}")

        # Generate
        with torch.no_grad():
            outputs = self.model.generate(
                input_ids,
                max_new_tokens=max_length,
                do_sample=True,
                temperature=temperature,
                top_p=top_p,
                num_return_sequences=1,  # Single output for debugging
                pad_token_id=self.tokenizer.eos_token_id,
            )

        # Extract generated tokens
        generated_tokens = outputs[0][input_ids.shape[1]:]

        print(f"\n3. RAW GENERATED TOKENS (before LLAMA_VOCAB_SIZE subtraction):")
        print(f"   - Count: {len(generated_tokens)}")
        print(f"   - Min: {generated_tokens.min().item()}")
        print(f"   - Max: {generated_tokens.max().item()}")
        print(f"   - First 20 tokens: {generated_tokens[:20].tolist()}")

        # =====================================
        # DEBUG OUTPUT 2: Tokens after subtraction
        # =====================================
        midi_tokens = generated_tokens.cpu().numpy() - self.LLAMA_VOCAB_SIZE
        tokens_list = midi_tokens.tolist()

        print(f"\n4. TOKENS AFTER 'outputs - LLAMA_VOCAB_SIZE' SUBTRACTION:")
        print("-" * 80)
        print(f"   - Count: {len(tokens_list)}")
        print(f"   - Min: {min(tokens_list)}")
        print(f"   - Max: {max(tokens_list)}")
        print(f"   - Mean: {sum(tokens_list) / len(tokens_list):.2f}")
        print(f"\n   - First 50 tokens:")
        print(f"     {tokens_list[:50]}")
        print(f"\n   - Full token list (first 200):")
        for i in range(0, min(200, len(tokens_list)), 10):
            chunk = tokens_list[i:i+10]
            print(f"     [{i:3d}-{i+9:3d}]: {chunk}")
        print("-" * 80)

        # Token distribution analysis
        token_ranges = {
            "0-10000 (time)": sum(1 for t in tokens_list if 0 <= t < 10000),
            "10000-11000 (duration)": sum(1 for t in tokens_list if 10000 <= t < 11000),
            "11000-27512 (note)": sum(1 for t in tokens_list if 11000 <= t < 27512),
            "27512-55024 (control vocab)": sum(1 for t in tokens_list if 27512 <= t < 55024),
            ">55024 (out of range)": sum(1 for t in tokens_list if t >= 55024),
            "negative": sum(1 for t in tokens_list if t < 0),
        }

        print(f"\n5. TOKEN DISTRIBUTION:")
        for range_name, count in token_ranges.items():
            print(f"   - {range_name}: {count} tokens")

        # Try conversion
        print(f"\n6. ATTEMPTING MIDI CONVERSION:")
        try:
            midi_data = events_to_midi(tokens_list)
            print("   ✅ SUCCESS: Conversion succeeded!")

            midi_bytes = io.BytesIO()
            midi_data.save(file=midi_bytes)
            midi_bytes.seek(0)
            midi_binary = midi_bytes.read()
            midi_base64 = base64.b64encode(midi_binary).decode('utf-8')

            return {
                "success": True,
                "midiData": midi_base64,
                "debug": {
                    "inputPrompt": full_prompt,
                    "tokenCount": len(tokens_list),
                    "tokenMin": min(tokens_list),
                    "tokenMax": max(tokens_list),
                    "tokens": tokens_list,
                    "tokenDistribution": token_ranges,
                }
            }

        except Exception as e:
            import traceback
            print(f"   ❌ FAILURE: {type(e).__name__}: {str(e)}")
            print(f"\n   Full traceback:")
            traceback.print_exc()

            return {
                "success": False,
                "error": str(e),
                "errorType": type(e).__name__,
                "debug": {
                    "inputPrompt": full_prompt,
                    "tokenCount": len(tokens_list),
                    "tokenMin": min(tokens_list),
                    "tokenMax": max(tokens_list),
                    "tokens": tokens_list,
                    "tokenDistribution": token_ranges,
                }
            }


@app.local_entrypoint()
def main():
    """Run debug test"""
    print("\n" + "=" * 80)
    print("MIDI-LLM DEBUG TEST - FOR GITHUB ISSUE #2")
    print("=" * 80)

    model = MidiLlmModelDebug()

    # Test with simple prompt
    result = model.generate_debug.remote(
        prompt="Generate a short C major scale for piano",
        temperature=0.7,
        max_length=128,
        top_p=0.95,
    )

    print("\n" + "=" * 80)
    print("FINAL RESULT:")
    print("=" * 80)
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"MIDI generated successfully!")
    else:
        print(f"Error: {result['error']}")

    print(f"\nDebug info saved in result['debug']")
    print(f"Token count: {result['debug']['tokenCount']}")
    print(f"Token range: {result['debug']['tokenMin']} - {result['debug']['tokenMax']}")
