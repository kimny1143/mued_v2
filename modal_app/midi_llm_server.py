"""
MIDI-LLM Server on Modal.com

Deploys MIDI-LLM (text-to-MIDI generation model) as a serverless API
using Modal.com infrastructure with GPU support.
"""

import modal
from typing import Optional
import base64
import io

# Define Modal app
app = modal.App("midi-llm-server")

# Define image with dependencies for MIDI-LLM
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")  # Required for installing from GitHub
    .pip_install(
        "fastapi[standard]",
        "torch",
        "transformers",
        "mido",
        "numpy",
        "accelerate",
        "sentencepiece",
    )
    # Install anticipation library for MIDI token conversion
    .pip_install(
        "git+https://github.com/jthickstun/anticipation.git@af37397922665a0fb8d474d7988b0f3755a38d45"
    )
)


@app.cls(
    image=image,
    gpu="A10G",  # 24GB VRAM, sufficient for MIDI-LLM (1.4B params)
    scaledown_window=300,  # 5 minutes
    timeout=600,  # 10 minutes max per request
)
class MidiLlmModel:
    """MIDI-LLM model class for text-to-MIDI generation"""

    @modal.enter()
    def load_model(self):
        """Load MIDI-LLM model on container startup"""
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        print("[MIDI-LLM] Loading model from Hugging Face...")

        model_id = "slseanwu/MIDI-LLM_Llama-3.2-1B"

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_id,
            pad_token="<|eot_id|>",
            trust_remote_code=True,
        )

        # Load model with BFloat16 for efficiency
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
        )

        # MIDI-LLM specific constants
        self.LLAMA_VOCAB_SIZE = 128256
        self.AMT_GPT2_BOS_ID = 0  # MIDI sequence start token

        # System prompt from official repo
        self.SYSTEM_PROMPT = (
            "You are a helpful AI assistant for music generation. "
            "You are about to compose a piece of music based on the user's instructions. "
            "Ensure that the music is coherent, musical, and follows the user's requests."
        )

        print(f"[MIDI-LLM] Model loaded successfully on {self.model.device}")

    @modal.method()
    def generate(
        self,
        prompt: str,
        temperature: float = 1.0,
        max_length: int = 2046,
        top_p: float = 0.98,
        instrument: Optional[str] = None,
        genre: Optional[str] = None,
        difficulty: Optional[str] = None,
    ) -> dict:
        """
        Generate MIDI from text prompt using MIDI-LLM

        Args:
            prompt: Text description of desired music
            temperature: Sampling temperature (default: 1.0, recommended by paper)
            max_length: Maximum MIDI tokens (default: 2046)
            top_p: Nucleus sampling parameter (default: 0.98)
            instrument: Target instrument (optional)
            genre: Music genre (optional)
            difficulty: Difficulty level (optional)

        Returns:
            Dictionary with MIDI data (base64) and metadata
        """
        import torch
        from anticipation.convert import events_to_midi

        print(f"[MIDI-LLM] Generating MIDI for prompt: {prompt[:80]}...")

        # Build full prompt with system message
        full_prompt = f"{self.SYSTEM_PROMPT}\n\nUser: {prompt}\n\nAssistant: "

        # Tokenize
        input_ids = self.tokenizer(full_prompt, return_tensors="pt", padding=False)["input_ids"]

        # Add MIDI beginning-of-sequence token
        midi_bos_token = self.AMT_GPT2_BOS_ID + self.LLAMA_VOCAB_SIZE
        input_ids = torch.cat([
            input_ids,
            torch.tensor([[midi_bos_token]], dtype=input_ids.dtype)
        ], dim=1).to(self.model.device)

        print(f"[MIDI-LLM] Input tokens: {input_ids.shape[1]}, generating up to {max_length} MIDI tokens...")

        # Generate multiple outputs (like official code) to increase success rate
        n_outputs = 4
        with torch.no_grad():
            outputs = self.model.generate(
                input_ids,
                max_new_tokens=max_length,
                do_sample=True,
                temperature=temperature,
                top_p=top_p,
                num_return_sequences=n_outputs,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        print(f"[MIDI-LLM] Generated {n_outputs} sequences, trying to convert each one...")

        # Try each generated sequence until one succeeds
        for output_idx in range(n_outputs):
            try:
                # Extract generated tokens (remove input prompt)
                generated_tokens = outputs[output_idx][input_ids.shape[1]:]

                # Shift tokens back to MIDI vocabulary range
                midi_tokens = generated_tokens.cpu().numpy() - self.LLAMA_VOCAB_SIZE
                tokens_list = midi_tokens.tolist()

                print(f"[MIDI-LLM] Sequence {output_idx+1}/{n_outputs}: {len(tokens_list)} tokens")

                # Try to convert directly (like official code does)
                midi_data = events_to_midi(tokens_list)
                midi_bytes = io.BytesIO()
                midi_data.save(file=midi_bytes)
                midi_bytes.seek(0)
                midi_binary = midi_bytes.read()

                # Analyze MIDI for metadata
                metadata = self._analyze_midi(midi_binary)

                # Convert to base64
                midi_base64 = base64.b64encode(midi_binary).decode('utf-8')

                print(f"[MIDI-LLM] Successfully generated MIDI: {metadata['noteCount']} notes, {metadata['duration']:.1f}s")

                return {
                    "success": True,
                    "midiData": midi_base64,
                    "metadata": metadata,
                    "model": "slseanwu/MIDI-LLM_Llama-3.2-1B",
                }

            except Exception as e:
                print(f"[MIDI-LLM] Sequence {output_idx+1} failed: {type(e).__name__}: {str(e)}")
                continue

        # All sequences failed
        import traceback
        error_details = "All generated sequences failed to convert to valid MIDI"
        print(f"[MIDI-LLM] {error_details}")
        return {
            "success": False,
            "error": error_details,
            "model": "slseanwu/MIDI-LLM_Llama-3.2-1B",
        }

    def _analyze_midi(self, midi_bytes: bytes) -> dict:
        """Analyze MIDI file to extract metadata"""
        import mido

        try:
            midi_file = mido.MidiFile(file=io.BytesIO(midi_bytes))

            # Count notes
            note_count = sum(
                1 for track in midi_file.tracks
                for msg in track
                if msg.type == 'note_on' and msg.velocity > 0
            )

            # Calculate duration (in seconds)
            duration = midi_file.length

            # Get tempo (default to 120 BPM if not specified)
            tempo_bpm = 120
            for track in midi_file.tracks:
                for msg in track:
                    if msg.type == 'set_tempo':
                        tempo_bpm = int(mido.tempo2bpm(msg.tempo))
                        break

            return {
                "noteCount": note_count,
                "duration": round(duration, 1),
                "tempo": tempo_bpm,
                "key": "Unknown",  # MIDI doesn't always contain key info
            }

        except Exception as e:
            print(f"[MIDI-LLM] Error analyzing MIDI: {e}")
            return {
                "noteCount": 0,
                "duration": 0.0,
                "tempo": 120,
                "key": "Unknown",
            }


@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def generate_midi(data: dict) -> dict:
    """
    Web endpoint for MIDI generation

    POST /generate
    Body: {
        "prompt": "...",
        "temperature": 0.8,
        "max_length": 512,
        ...
    }
    """
    model = MidiLlmModel()
    return model.generate.remote(
        prompt=data.get("prompt", ""),
        temperature=data.get("temperature", 0.8),
        max_length=data.get("max_length", 512),
        top_p=data.get("top_p", 0.95),
        instrument=data.get("instrument"),
        genre=data.get("genre"),
        difficulty=data.get("difficulty"),
    )


@app.local_entrypoint()
def main():
    """Test the MIDI-LLM model locally"""
    print("Testing MIDI-LLM model...")

    model = MidiLlmModel()
    result = model.generate.remote(
        prompt="Generate a short C major scale for piano",
        temperature=0.7,
        max_length=128,  # Much shorter to test
        top_p=0.95,
        instrument="piano",
        difficulty="beginner",
    )

    print("Generation result:")
    print(f"  Success: {result['success']}")
    print(f"  Model: {result['model']}")
    print(f"  Note count: {result['metadata']['noteCount']}")
    print(f"  Duration: {result['metadata']['duration']}s")
    print(f"  MIDI data length: {len(result['midiData'])} chars (base64)")
