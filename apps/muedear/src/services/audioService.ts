/**
 * AudioService - MUEDear Real-time EQ Audio Engine
 *
 * Uses react-native-audio-api with BiquadFilterNode for real-time +6dB EQ boost.
 * Replaces pre-processed audio files with dynamic audio processing.
 */

import {
  AudioContext,
  AudioBuffer,
  AudioBufferSourceNode,
  GainNode,
  BiquadFilterNode,
  AnalyserNode,
} from 'react-native-audio-api';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { FrequencyBand } from '../types/game';
import { logger } from '../utils/logger';

// EQ Configuration for ear training (more prominent than studio standard)
const EQ_CONFIG = {
  type: 'peaking' as const,
  Q: 1.0,   // Wider band (was 1.4)
  gain: 12, // +12dB boost (was 6dB)
};

// Crossfade duration in seconds
const CROSSFADE_DURATION = 0.02; // 20ms

// Track source definitions - only original files needed now
const TRACK_ASSETS = {
  track_01: require('../../assets/audio/mufreq/track_01/original.m4a'),
  track_02: require('../../assets/audio/mufreq/track_02/original.m4a'),
  track_03: require('../../assets/audio/mufreq/track_03/original.m4a'),
  track_04: require('../../assets/audio/mufreq/track_04/original.m4a'),
  track_05: require('../../assets/audio/mufreq/track_05/original.m4a'),
  track_06: require('../../assets/audio/mufreq/track_06/original.m4a'),
  track_07: require('../../assets/audio/mufreq/track_07/original.m4a'),
  track_08: require('../../assets/audio/mufreq/track_08/original.m4a'),
  track_09: require('../../assets/audio/mufreq/track_09/original.m4a'),
  track_10: require('../../assets/audio/mufreq/track_10/original.m4a'),
} as const;

// Available track IDs
export const AVAILABLE_TRACKS = [
  'track_01',
  'track_02',
  'track_03',
  'track_04',
  'track_05',
  'track_06',
  'track_07',
  'track_08',
  'track_09',
  'track_10',
] as const;

export type TrackId = (typeof AVAILABLE_TRACKS)[number];

interface AudioState {
  isInitialized: boolean;
  currentTrackId: TrackId | null;
  currentFrequency: FrequencyBand | null;
  isPlayingOriginal: boolean;
  isPlaying: boolean;
}

/**
 * Audio Graph Structure:
 *
 * AudioBufferSourceNode (loop: true)
 *           │
 *     ┌─────┴─────┐
 *     │           │
 *  GainNode A   GainNode B
 *  (original)   (EQ path)
 *     │           │
 *     │      BiquadFilter
 *     │      (peaking +6dB)
 *     │           │
 *     └─────┬─────┘
 *           │
 *      MasterGain
 *           │
 *      Destination
 */

class AudioService {
  private state: AudioState = {
    isInitialized: false,
    currentTrackId: null,
    currentFrequency: null,
    isPlayingOriginal: true,
    isPlaying: false,
  };

  // Audio context and nodes
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNodeA: GainNode | null = null; // Original path
  private gainNodeB: GainNode | null = null; // EQ path
  private eqFilter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;

  // Analyser for spectrum visualization
  private analyserNode: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;

  // Track playback position for seamless restart
  private startTime: number = 0;
  private pauseTime: number = 0;

  // Separate source nodes for A and B paths
  private sourceNodeA: AudioBufferSourceNode | null = null;
  private sourceNodeB: AudioBufferSourceNode | null = null;

  /**
   * Initialize the audio system
   * Call this when the app starts
   */
  async initAudioSystem(): Promise<void> {
    if (this.state.isInitialized) {
      logger.log('[AudioService] Already initialized');
      return;
    }

    try {
      // Create AudioContext
      this.audioContext = new AudioContext();

      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // Create AnalyserNode for spectrum visualization (A path only)
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 512; // 256 frequency bins
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

      // Create gain nodes for A/B switching
      this.gainNodeA = this.audioContext.createGain();
      this.gainNodeA.gain.value = 1.0; // Start with original audible
      this.gainNodeA.connect(this.masterGain);

      this.gainNodeB = this.audioContext.createGain();
      this.gainNodeB.gain.value = 0.0; // Start with EQ muted

      // Create EQ filter
      this.eqFilter = this.audioContext.createBiquadFilter();
      this.eqFilter.type = EQ_CONFIG.type;
      this.eqFilter.Q.value = EQ_CONFIG.Q;
      this.eqFilter.gain.value = EQ_CONFIG.gain;

      // Connect EQ path: gainNodeB -> eqFilter -> masterGain
      this.gainNodeB.connect(this.eqFilter);
      this.eqFilter.connect(this.masterGain);

      this.state.isInitialized = true;
      logger.log('[AudioService] Initialized with real-time EQ');
    } catch (error) {
      logger.error('[AudioService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Parse WAV file manually and create AudioBuffer
   * Bypasses decodeAudioData which has issues on iOS
   */
  private parseWavToAudioBuffer(arrayBuffer: ArrayBuffer): AudioBuffer {
    const dataView = new DataView(arrayBuffer);

    // Read WAV header
    // Skip RIFF header (12 bytes)
    // Find fmt chunk
    let offset = 12;
    let fmtFound = false;
    let numChannels = 2;
    let sampleRate = 48000;
    let bitsPerSample = 16;

    while (offset < arrayBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        dataView.getUint8(offset),
        dataView.getUint8(offset + 1),
        dataView.getUint8(offset + 2),
        dataView.getUint8(offset + 3)
      );
      const chunkSize = dataView.getUint32(offset + 4, true);

      if (chunkId === 'fmt ') {
        // Read format info
        numChannels = dataView.getUint16(offset + 10, true);
        sampleRate = dataView.getUint32(offset + 12, true);
        bitsPerSample = dataView.getUint16(offset + 22, true);
        fmtFound = true;
        logger.log('[AudioService] WAV format:', { numChannels, sampleRate, bitsPerSample });
      }

      if (chunkId === 'data') {
        // Found data chunk
        const dataOffset = offset + 8;
        const dataSize = chunkSize;
        const bytesPerSample = bitsPerSample / 8;
        const numSamples = dataSize / bytesPerSample / numChannels;

        logger.log('[AudioService] WAV data:', { dataOffset, dataSize, numSamples });

        // Create AudioBuffer
        const audioBuffer = this.audioContext!.createBuffer(
          numChannels,
          numSamples,
          sampleRate
        );

        // Fill channels with audio data
        // DEBUG: Check raw sample values first
        let debugMaxRaw = 0;
        let debugSamples: number[] = [];
        for (let i = 0; i < 10; i++) {
          const raw = dataView.getInt16(dataOffset + i * 4, true); // First channel
          debugSamples.push(raw);
          if (Math.abs(raw) > debugMaxRaw) debugMaxRaw = Math.abs(raw);
        }
        logger.log('[AudioService] Raw WAV samples (first 10):', debugSamples);
        logger.log('[AudioService] Max raw sample in first 10000:', (() => {
          let max = 0;
          for (let i = 0; i < 10000; i++) {
            const raw = dataView.getInt16(dataOffset + i * 4, true);
            if (Math.abs(raw) > max) max = Math.abs(raw);
          }
          return max;
        })());

        for (let channel = 0; channel < numChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);

          for (let i = 0; i < numSamples; i++) {
            const sampleOffset = dataOffset + (i * numChannels + channel) * bytesPerSample;

            if (bitsPerSample === 16) {
              // 16-bit signed PCM
              const sample = dataView.getInt16(sampleOffset, true);
              channelData[i] = sample / 32768.0; // Normalize to -1.0 to 1.0
            } else if (bitsPerSample === 24) {
              // 24-bit signed PCM
              const b0 = dataView.getUint8(sampleOffset);
              const b1 = dataView.getUint8(sampleOffset + 1);
              const b2 = dataView.getUint8(sampleOffset + 2);
              let sample = (b2 << 16) | (b1 << 8) | b0;
              if (sample & 0x800000) sample |= ~0xFFFFFF; // Sign extend
              channelData[i] = sample / 8388608.0;
            }
          }
        }

        // DEBUG: Verify what was written to the buffer
        const verifyData = audioBuffer.getChannelData(0);
        logger.log('[AudioService] Verify buffer (first 10):', Array.from(verifyData.slice(0, 10)));
        logger.log('[AudioService] Verify buffer max in first 10000:', (() => {
          let max = 0;
          for (let i = 0; i < Math.min(10000, verifyData.length); i++) {
            if (Math.abs(verifyData[i]) > max) max = Math.abs(verifyData[i]);
          }
          return max;
        })());

        return audioBuffer;
      }

      offset += 8 + chunkSize;
      // Align to even boundary
      if (chunkSize % 2 !== 0) offset++;
    }

    throw new Error('Could not find data chunk in WAV file');
  }

  /**
   * Load audio file and decode it into AudioBuffer
   */
  private async loadAudioBuffer(trackId: TrackId): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      logger.error('[AudioService] AudioContext not initialized');
      return null;
    }

    try {
      const assetModule = TRACK_ASSETS[trackId];
      if (!assetModule) {
        logger.error('[AudioService] Track not found:', trackId);
        return null;
      }

      // Load asset and get local URI
      const [asset] = await Asset.loadAsync(assetModule);
      const uri = asset.localUri || asset.uri;

      logger.log('[AudioService] Loading audio from:', uri);

      // Read file as base64 using expo-file-system
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      logger.log('[AudioService] File read, size:', arrayBuffer.byteLength);

      // Try manual WAV parsing first (bypass decodeAudioData bug)
      let audioBuffer: AudioBuffer;
      if (uri.endsWith('.wav')) {
        logger.log('[AudioService] Parsing WAV manually...');
        audioBuffer = this.parseWavToAudioBuffer(arrayBuffer);
      } else {
        // Fallback to decodeAudioData for other formats
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      }

      logger.log('[AudioService] Audio decoded:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
      });

      // Check if buffer has actual audio data
      const channelData = audioBuffer.getChannelData(0);
      let maxSample = 0;
      let nonZeroCount = 0;
      for (let i = 0; i < Math.min(channelData.length, 10000); i++) {
        if (channelData[i] !== 0) nonZeroCount++;
        if (Math.abs(channelData[i]) > maxSample) maxSample = Math.abs(channelData[i]);
      }
      logger.log('[AudioService] Buffer data check:', {
        firstSamples: Array.from(channelData.slice(0, 10)),
        maxSample,
        nonZeroCount,
        totalChecked: Math.min(channelData.length, 10000),
      });

      return audioBuffer;
    } catch (error) {
      logger.error('[AudioService] Failed to load audio buffer:', error);
      return null;
    }
  }

  /**
   * Create and configure source node
   * Note: Using async/await due to iOS platform differences (Issue #574)
   */
  private async createSourceNode(): Promise<AudioBufferSourceNode | null> {
    if (!this.audioContext || !this.audioBuffer) {
      logger.error('[AudioService] Cannot create source node');
      return null;
    }

    // Use await for iOS compatibility (see react-native-audio-api issue #574)
    const source = await (this.audioContext.createBufferSource() as any);
    source.buffer = this.audioBuffer;
    source.loop = true;

    logger.log('[AudioService] Source buffer set:', {
      duration: source.buffer?.duration,
      channels: source.buffer?.numberOfChannels,
    });

    // Connect to both gain nodes (A: original, B: EQ)
    source.connect(this.gainNodeA!);
    source.connect(this.gainNodeB!);

    logger.log('[AudioService] Source node created and connected');

    return source;
  }

  /**
   * Load a track with a specific frequency for EQ
   */
  async loadTrack(trackId: TrackId, frequency: FrequencyBand): Promise<boolean> {
    logger.log('[AudioService] Loading track:', trackId, 'with EQ frequency:', frequency);

    try {
      // Cleanup any existing playback
      await this.cleanup();

      // Re-initialize if needed
      if (!this.state.isInitialized) {
        await this.initAudioSystem();
      }

      // Load audio buffer
      this.audioBuffer = await this.loadAudioBuffer(trackId);
      if (!this.audioBuffer) {
        return false;
      }

      // Set EQ frequency
      if (this.eqFilter) {
        this.eqFilter.frequency.value = frequency;
        logger.log('[AudioService] EQ set to:', frequency, 'Hz at +6dB');
      }

      this.state.currentTrackId = trackId;
      this.state.currentFrequency = frequency;
      this.state.isPlayingOriginal = true;

      logger.log('[AudioService] Track loaded successfully');
      return true;
    } catch (error) {
      logger.error('[AudioService] Failed to load track:', error);
      return false;
    }
  }

  /**
   * Start synced playback (original audible, EQ muted)
   */
  async startSyncedPlayback(): Promise<void> {
    logger.log('[AudioService] Starting synced playback');

    if (!this.audioContext || !this.audioBuffer) {
      logger.error('[AudioService] Audio not loaded');
      return;
    }

    try {
      // Ensure AudioContext is running (required after user interaction)
      if (this.audioContext.state === 'suspended') {
        logger.log('[AudioService] Resuming suspended AudioContext');
        await this.audioContext.resume();
      }
      logger.log('[AudioService] AudioContext state:', this.audioContext.state);

      // Create TWO separate source nodes (workaround for single-output limitation)
      // Source A: for original path (via AnalyserNode for spectrum visualization)
      const sourceA = await (this.audioContext.createBufferSource() as any);
      sourceA.buffer = this.audioBuffer;
      sourceA.loop = true;
      // Connect through analyser: sourceA -> analyserNode -> gainNodeA
      sourceA.connect(this.analyserNode!);
      this.analyserNode!.connect(this.gainNodeA!);

      // Source B: for EQ path
      const sourceB = await (this.audioContext.createBufferSource() as any);
      sourceB.buffer = this.audioBuffer;
      sourceB.loop = true;
      sourceB.connect(this.gainNodeB!);

      // Set initial gains: A audible, B muted
      this.gainNodeA!.gain.value = 1.0;
      this.gainNodeB!.gain.value = 0.0;

      logger.log('[AudioService] Dual source approach');
      logger.log('[AudioService] GainA:', this.gainNodeA!.gain.value, 'GainB:', this.gainNodeB!.gain.value);

      // Start both at the same time for sync
      const startTime = this.audioContext.currentTime;
      sourceA.start(startTime);
      sourceB.start(startTime);

      // Store references
      this.sourceNodeA = sourceA;
      this.sourceNodeB = sourceB;
      this.sourceNode = sourceA; // Keep for compatibility

      this.state.isPlayingOriginal = true;
      this.state.isPlaying = true;

      logger.log('[AudioService] TEST playback started');
    } catch (error) {
      logger.error('[AudioService] Failed to start playback:', error);
    }
  }

  /**
   * Switch to original (A) - simple direct assignment
   */
  async playOriginal(): Promise<void> {
    logger.log('[AudioService] Switching to A (original)');

    if (!this.gainNodeA || !this.gainNodeB) {
      logger.warn('[AudioService] Gain nodes not ready');
      return;
    }

    // Simple direct value assignment (no ramp)
    this.gainNodeA.gain.value = 1.0;
    this.gainNodeB.gain.value = 0.0;

    this.state.isPlayingOriginal = true;
    logger.log('[AudioService] Now playing A. GainA:', this.gainNodeA.gain.value, 'GainB:', this.gainNodeB.gain.value);
  }

  /**
   * Switch to processed/EQ (B) - simple direct assignment
   */
  async playProcessed(): Promise<void> {
    logger.log('[AudioService] Switching to B (EQ boosted)');

    if (!this.gainNodeA || !this.gainNodeB) {
      logger.warn('[AudioService] Gain nodes not ready');
      return;
    }

    // Simple direct value assignment (no ramp)
    this.gainNodeA.gain.value = 0.0;
    this.gainNodeB.gain.value = 1.0;

    this.state.isPlayingOriginal = false;
    logger.log('[AudioService] Now playing B. GainA:', this.gainNodeA.gain.value, 'GainB:', this.gainNodeB.gain.value);
  }

  /**
   * Toggle between original and EQ audio (A/B comparison)
   */
  async togglePlayback(): Promise<boolean> {
    if (this.state.isPlayingOriginal) {
      await this.playProcessed();
      return false; // Now playing EQ (B)
    } else {
      await this.playOriginal();
      return true; // Now playing original (A)
    }
  }

  /**
   * Stop playback
   */
  async stopPlayback(): Promise<void> {
    logger.log('[AudioService] Stopping playback');

    try {
      // Stop both source nodes
      if (this.sourceNodeA) {
        try { this.sourceNodeA.stop(); } catch (e) {}
        this.sourceNodeA.disconnect();
        this.sourceNodeA = null;
      }
      if (this.sourceNodeB) {
        try { this.sourceNodeB.stop(); } catch (e) {}
        this.sourceNodeB.disconnect();
        this.sourceNodeB = null;
      }
      this.sourceNode = null;

      this.state.isPlaying = false;
    } catch (error) {
      logger.error('[AudioService] Failed to stop playback:', error);
    }
  }

  /**
   * Cleanup and release resources
   */
  async cleanup(): Promise<void> {
    logger.log('[AudioService] Cleaning up');

    try {
      // Stop and disconnect both source nodes
      if (this.sourceNodeA) {
        try { this.sourceNodeA.stop(); } catch (e) {}
        this.sourceNodeA.disconnect();
        this.sourceNodeA = null;
      }
      if (this.sourceNodeB) {
        try { this.sourceNodeB.stop(); } catch (e) {}
        this.sourceNodeB.disconnect();
        this.sourceNodeB = null;
      }
      this.sourceNode = null;

      // Disconnect analyser from gainNodeA (will be reconnected on next playback)
      if (this.analyserNode) {
        try { this.analyserNode.disconnect(); } catch (e) {}
      }

      // Clear buffer
      this.audioBuffer = null;

      // Reset state
      this.state.currentTrackId = null;
      this.state.currentFrequency = null;
      this.state.isPlaying = false;
      this.state.isPlayingOriginal = true;

      // Reset gain nodes to default
      if (this.gainNodeA) {
        this.gainNodeA.gain.value = 1.0;
      }
      if (this.gainNodeB) {
        this.gainNodeB.gain.value = 0.0;
      }

      logger.log('[AudioService] Cleanup complete');
    } catch (error) {
      logger.error('[AudioService] Cleanup error:', error);
    }
  }

  /**
   * Full shutdown - close audio context
   */
  async shutdown(): Promise<void> {
    logger.log('[AudioService] Shutting down');

    await this.cleanup();

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (e) {
        // Context may already be closed
      }
      this.audioContext = null;
    }

    this.gainNodeA = null;
    this.gainNodeB = null;
    this.eqFilter = null;
    this.masterGain = null;
    this.analyserNode = null;
    this.frequencyData = null;
    this.state.isInitialized = false;
  }

  /**
   * Get current playback state
   */
  getState(): Readonly<AudioState> {
    return { ...this.state };
  }

  /**
   * Get current frequency data for spectrum visualization
   * Returns null if not playing or analyser not ready
   */
  getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode || !this.frequencyData || !this.state.isPlaying) {
      return null;
    }
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /**
   * Check if audio files are available
   */
  hasAudioFiles(): boolean {
    return true;
  }

  /**
   * Get a random track ID
   */
  getRandomTrackId(): TrackId {
    const index = Math.floor(Math.random() * AVAILABLE_TRACKS.length);
    return AVAILABLE_TRACKS[index];
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Export types
export type { AudioState };
