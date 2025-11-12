# MIDI-LLM Modal.com Deployment

MIDI-LLM (text-to-MIDI generation model) deployed on Modal.com serverless infrastructure.

## Prerequisites

1. **Modal.com Account**
   - Sign up at https://modal.com
   - Get your API token

2. **Modal CLI**
   ```bash
   pip install modal
   ```

3. **Authentication**
   ```bash
   modal setup
   ```
   This will open a browser for authentication.

## Deployment

### 1. Test Locally (Mock)
```bash
cd modal_app
modal run midi_llm_server.py
```

This runs the model with mock data to verify the setup.

### 2. Deploy to Modal.com
```bash
modal deploy midi_llm_server.py
```

This will:
- Build the container image
- Deploy the model to Modal.com
- Create a web endpoint URL

### 3. Get Endpoint URL
After deployment, Modal will output:
```
✓ Created web function generate_midi => https://your-workspace.modal.run/generate
```

Copy this URL for your `.env.local`:
```bash
MODAL_API_URL=https://your-workspace.modal.run/generate
MIDI_LLM_ENABLED=true
```

### 4. Get API Token
```bash
modal token show
```

Add to `.env.local`:
```bash
MODAL_API_TOKEN=your_token_here
```

## Testing the Endpoint

### Using curl
```bash
curl -X POST https://your-workspace.modal.run/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate a beginner piano exercise in C major",
    "temperature": 0.8,
    "instrument": "piano",
    "difficulty": "beginner"
  }'
```

### Expected Response
```json
{
  "success": true,
  "midiData": "TVRoZAAA...",
  "metadata": {
    "noteCount": 16,
    "duration": 8.0,
    "tempo": 120,
    "key": "C"
  },
  "model": "midi-llm-1b-mock"
}
```

## Model Implementation

### Current Status: Mock Implementation
The current implementation returns mock MIDI data for testing the infrastructure.

### TODO: Integrate Real MIDI-LLM
To use the actual MIDI-LLM model:

1. **Get Model Weights**
   - Option A: Hugging Face (if available)
   - Option B: Train/fine-tune from scratch
   - Option C: Use pre-trained checkpoint from research paper

2. **Update `midi_llm_server.py`**
   ```python
   @modal.enter()
   def load_model(self):
       from transformers import AutoModelForCausalLM, AutoTokenizer
       self.model = AutoModelForCausalLM.from_pretrained("midi-llm/midi-llm-1b")
       self.tokenizer = AutoTokenizer.from_pretrained("midi-llm/midi-llm-1b")
   ```

3. **Implement Generation**
   ```python
   @modal.method()
   def generate(self, prompt, ...):
       # Tokenize prompt
       inputs = self.tokenizer(prompt, return_tensors="pt")

       # Generate MIDI tokens
       outputs = self.model.generate(**inputs, ...)

       # Convert tokens to MIDI file
       midi_data = self._tokens_to_midi(outputs)

       return midi_data
   ```

## Cost Estimation

- **GPU**: NVIDIA A10G @ ~$1.10/hour
- **Idle timeout**: 5 minutes (no cost when idle)
- **Expected cost**: $30-50/month for moderate usage

## Monitoring

View logs and metrics:
```bash
modal app logs midi-llm-server
```

## Troubleshooting

### Issue: "ModuleNotFoundError"
- Make sure all dependencies are in `image.pip_install()`
- Rebuild: `modal deploy midi_llm_server.py`

### Issue: "GPU out of memory"
- Reduce `max_length` parameter
- Use FP8 quantization
- Upgrade to larger GPU (A100)

### Issue: "Container timeout"
- Increase `timeout` in `@app.cls()`
- Current: 600 seconds (10 minutes)

## References

- Modal.com Docs: https://modal.com/docs
- MIDI-LLM Paper: https://arxiv.org/abs/2511.xxxxx (NeurIPS 2025)
- vLLM Docs: https://docs.vllm.ai/
