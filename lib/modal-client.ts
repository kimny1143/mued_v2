/**
 * Modal.com API Client for MIDI-LLM
 *
 * Handles communication with MIDI-LLM model deployed on Modal.com
 */

import { z } from 'zod';

const envSchema = z.object({
  MODAL_API_TOKEN: z.string().optional(),
  MODAL_API_URL: z.string().optional(),
  MIDI_LLM_ENABLED: z.string().optional().default('false'),
});

const env = envSchema.parse({
  MODAL_API_TOKEN: process.env.MODAL_API_TOKEN,
  MODAL_API_URL: process.env.MODAL_API_URL,
  MIDI_LLM_ENABLED: process.env.MIDI_LLM_ENABLED,
});

export interface MidiLlmGenerateRequest {
  prompt: string;
  temperature?: number;
  max_length?: number;
  top_p?: number;
  instrument?: string;
  genre?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface MidiLlmGenerateResponse {
  success: boolean;
  midiData: string; // Base64 encoded MIDI file
  metadata: {
    noteCount: number;
    duration: number;
    tempo: number;
    key: string;
  };
  generationTime: number; // milliseconds
  model: string;
}

/**
 * Generate MIDI using MIDI-LLM on Modal.com
 *
 * @param request - Generation request parameters
 * @returns MIDI data and metadata
 */
export async function generateMidiWithLlm(
  request: MidiLlmGenerateRequest
): Promise<MidiLlmGenerateResponse> {
  // Check if MIDI-LLM is enabled
  if (env.MIDI_LLM_ENABLED !== 'true') {
    console.warn('[Modal] MIDI-LLM is disabled, using mock data');
    return generateMockMidiResponse(request);
  }

  // Check if API credentials are configured
  if (!env.MODAL_API_TOKEN || !env.MODAL_API_URL) {
    console.warn('[Modal] Missing API credentials, using mock data');
    return generateMockMidiResponse(request);
  }

  try {
    const startTime = Date.now();

    // TODO: Implement actual Modal.com API call
    // For PoC, use mock response
    console.log('[Modal] Calling MIDI-LLM API (mock):', {
      url: env.MODAL_API_URL,
      prompt: request.prompt,
      instrument: request.instrument,
      difficulty: request.difficulty,
    });

    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = await generateMockMidiResponse(request);
    const generationTime = Date.now() - startTime;

    console.log('[Modal] MIDI-LLM generation completed:', {
      generationTime,
      noteCount: response.metadata.noteCount,
      duration: response.metadata.duration,
    });

    return {
      ...response,
      generationTime,
    };
  } catch (error) {
    console.error('[Modal] MIDI-LLM API error:', error);
    throw new Error(`MIDI-LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate mock MIDI response for PoC
 * TODO: Remove when actual Modal.com integration is ready
 */
async function generateMockMidiResponse(
  request: MidiLlmGenerateRequest
): Promise<MidiLlmGenerateResponse> {
  // Mock MIDI file (C major scale)
  const mockMidiHex =
    '4d546864000000060001000100e04d54726b0000001e00ff5103071a2000ff51030d293a00904048009040000090434800904300ff2f00';
  const buffer = Buffer.from(mockMidiHex, 'hex');
  const midiData = buffer.toString('base64');

  return {
    success: true,
    midiData,
    metadata: {
      noteCount: 8,
      duration: 4.0,
      tempo: 120,
      key: 'C',
    },
    generationTime: 1500,
    model: 'midi-llm-1b-mock',
  };
}

/**
 * Check Modal.com service health
 */
export async function checkModalHealth(): Promise<{
  available: boolean;
  message: string;
}> {
  if (env.MIDI_LLM_ENABLED !== 'true') {
    return {
      available: false,
      message: 'MIDI-LLM is disabled in environment',
    };
  }

  if (!env.MODAL_API_TOKEN || !env.MODAL_API_URL) {
    return {
      available: false,
      message: 'Missing Modal.com API credentials',
    };
  }

  // TODO: Implement actual health check
  return {
    available: true,
    message: 'Modal.com MIDI-LLM service is available (mock)',
  };
}
