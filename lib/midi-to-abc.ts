/**
 * MIDI to ABC Notation Converter
 *
 * Converts MIDI data to ABC notation for rendering with abcjs
 * Uses Tone.js and basic MIDI parsing for PoC
 */

export interface MidiToAbcOptions {
  title?: string;
  composer?: string;
  key?: string;
  meter?: string;
  unitNoteLength?: string;
  tempo?: number;
}

export interface MidiToAbcResult {
  abc: string;
  metadata: {
    title: string;
    key: string;
    meter: string;
    tempo: number;
    noteCount: number;
    duration: number; // in seconds
  };
}

/**
 * Convert MIDI file data to ABC notation
 *
 * @param midiData - Base64 encoded MIDI file data
 * @param options - Conversion options
 * @returns ABC notation string and metadata
 */
export async function midiToAbc(
  midiData: string,
  options: MidiToAbcOptions = {}
): Promise<MidiToAbcResult> {
  // TODO: Implement actual MIDI parsing using Tone.js or similar library
  // For now, return a mock ABC notation

  const title = options.title || 'Generated Material';
  const key = options.key || 'C';
  const meter = options.meter || '4/4';
  const tempo = options.tempo || 120;
  const unitNoteLength = options.unitNoteLength || '1/4';

  // Mock ABC notation (replace with actual conversion)
  const abc = `X:1
T:${title}
C:${options.composer || 'AI Generated'}
M:${meter}
L:${unitNoteLength}
Q:1/4=${tempo}
K:${key}
% Generated from MIDI-LLM
C D E F | G A B c | c B A G | F E D C ||`;

  return {
    abc,
    metadata: {
      title,
      key,
      meter,
      tempo,
      noteCount: 16, // Mock value
      duration: 8,   // Mock value (8 seconds)
    },
  };
}

/**
 * Validate MIDI data format
 *
 * @param midiData - Base64 encoded MIDI data
 * @returns true if valid MIDI format
 */
export function validateMidiData(midiData: string): boolean {
  try {
    // Basic validation: check if it's valid base64
    const decoded = Buffer.from(midiData, 'base64');

    // MIDI files start with "MThd" (0x4D546864)
    if (decoded.length < 4) return false;

    const header = decoded.toString('ascii', 0, 4);
    return header === 'MThd';
  } catch {
    return false;
  }
}

/**
 * Extract basic MIDI metadata without full conversion
 *
 * @param midiData - Base64 encoded MIDI data
 * @returns Basic MIDI metadata
 */
export function extractMidiMetadata(midiData: string): {
  format: number;
  tracks: number;
  ticksPerQuarterNote: number;
} | null {
  try {
    const decoded = Buffer.from(midiData, 'base64');

    if (decoded.length < 14) return null;

    // Check MIDI header
    const header = decoded.toString('ascii', 0, 4);
    if (header !== 'MThd') return null;

    // Parse header chunk
    // const headerLength = decoded.readUInt32BE(4); // Reserved for future use
    const format = decoded.readUInt16BE(8);
    const tracks = decoded.readUInt16BE(10);
    const ticksPerQuarterNote = decoded.readUInt16BE(12);

    return {
      format,
      tracks,
      ticksPerQuarterNote,
    };
  } catch (error) {
    console.error('Error extracting MIDI metadata:', error);
    return null;
  }
}
