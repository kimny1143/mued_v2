/**
 * whisper.rn 型定義の拡張
 * サブパスのモジュール解決のための型定義
 */

// メインモジュール
declare module 'whisper.rn' {
  export interface TranscribeOptions {
    language?: string;
    translate?: boolean;
    maxLen?: number;
    tokenTimestamps?: boolean;
  }

  export interface TranscribeResult {
    result: string;
    segments: Array<{
      text: string;
      t0: number;
      t1: number;
    }>;
  }

  export interface ContextOptions {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
  }

  export interface VadContextOptions {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
  }

  export class WhisperContext {
    transcribe(
      filePathOrBase64: string | number,
      options?: TranscribeOptions
    ): {
      stop: () => Promise<void>;
      promise: Promise<TranscribeResult>;
    };
    release(): Promise<void>;
  }

  export class WhisperVadContext {
    release(): Promise<void>;
  }

  export function initWhisper(options: ContextOptions): Promise<WhisperContext>;
  export function initWhisperVad(options: VadContextOptions): Promise<WhisperVadContext>;
  export function releaseAllWhisper(): Promise<void>;

  export const AudioSessionIos: {
    setCategory: (category: string, options?: string[]) => Promise<void>;
    setActive: (active: boolean) => Promise<void>;
  };
}

declare module 'whisper.rn/realtime-transcription' {
  export { RealtimeTranscriber } from 'whisper.rn/lib/typescript/realtime-transcription/RealtimeTranscriber';
  export { SliceManager } from 'whisper.rn/lib/typescript/realtime-transcription/SliceManager';
  export type {
    AudioStreamData,
    AudioStreamConfig,
    AudioStreamInterface,
    RealtimeVadEvent,
    RealtimeTranscribeEvent,
    RealtimeStatsEvent,
    RealtimeTranscriberDependencies,
    RealtimeOptions,
    RealtimeTranscriberCallbacks,
    AudioSlice,
    AudioSliceNoData,
    MemoryUsage,
  } from 'whisper.rn/lib/typescript/realtime-transcription/types';
  export { VAD_PRESETS } from 'whisper.rn/lib/typescript/realtime-transcription/types';
}

declare module 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter' {
  export { AudioPcmStreamAdapter } from 'whisper.rn/lib/typescript/realtime-transcription/adapters/AudioPcmStreamAdapter';
}

declare module 'whisper.rn/lib/typescript/realtime-transcription/RealtimeTranscriber' {
  import type {
    RealtimeTranscriberDependencies,
    RealtimeOptions,
    RealtimeTranscriberCallbacks,
  } from 'whisper.rn/lib/typescript/realtime-transcription/types';

  export class RealtimeTranscriber {
    constructor(
      dependencies: RealtimeTranscriberDependencies,
      options: RealtimeOptions,
      callbacks: RealtimeTranscriberCallbacks
    );
    start(): Promise<void>;
    stop(): Promise<void>;
  }
}

declare module 'whisper.rn/lib/typescript/realtime-transcription/SliceManager' {
  export class SliceManager {
    constructor(options: any);
  }
}

declare module 'whisper.rn/lib/typescript/realtime-transcription/types' {
  export interface AudioStreamData {
    data: Float32Array;
    sampleRate: number;
  }

  export interface AudioStreamConfig {
    sampleRate?: number;
    channels?: number;
    bitsPerSample?: number;
    bufferSize?: number;
    audioSource?: number;
  }

  export interface AudioStreamInterface {
    initialize(config: AudioStreamConfig): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRecording(): boolean;
    onData(callback: (data: AudioStreamData) => void): void;
    onError(callback: (error: string) => void): void;
    onStatusChange(callback: (isRecording: boolean) => void): void;
    release(): Promise<void>;
  }

  export interface RealtimeVadEvent {
    type: 'speech_start' | 'speech_end' | 'speech_continue' | 'silence';
    confidence?: number;
  }

  export interface RealtimeTranscribeEvent {
    type: 'transcribe';
    sliceIndex: number;
    startTime?: number;
    confidence?: number;
    data?: {
      result?: string;
    };
  }

  export interface RealtimeStatsEvent {
    type: 'stats';
    memoryUsage: MemoryUsage;
  }

  export interface RealtimeTranscriberDependencies {
    whisperContext: any;
    vadContext?: any;
    audioStream: AudioStreamInterface;
    fs: any;
  }

  export interface RealtimeOptions {
    audioStreamConfig?: {
      sampleRate?: number;
      channels?: number;
      bitsPerSample?: number;
      audioSource?: number;
      bufferSize?: number;
    };
    audioSliceSec?: number;
    audioMinSec?: number;
    autoSliceOnSpeechEnd?: boolean;
    vadPreset?: string;
    vadOptions?: {
      threshold?: number;
      minSpeechDurationMs?: number;
      minSilenceDurationMs?: number;
      maxSpeechDurationS?: number;
      speechPadMs?: number;
    };
    vadThrottleMs?: number;
    transcribeOptions?: {
      language?: string;
    };
    logger?: (msg: string) => void;
    audioOutputPath?: string;
  }

  export interface RealtimeTranscriberCallbacks {
    onStatusChange?: (isActive: boolean) => void;
    onVad?: (event: RealtimeVadEvent) => void;
    onTranscribe?: (event: RealtimeTranscribeEvent) => void;
    onError?: (error: string) => void;
  }

  export interface AudioSlice {
    index: number;
    data: Float32Array;
    startTime: number;
  }

  export interface AudioSliceNoData {
    index: number;
    startTime: number;
  }

  export interface MemoryUsage {
    used: number;
    total: number;
  }

  export const VAD_PRESETS: {
    continuous: any;
    [key: string]: any;
  };
}

declare module 'whisper.rn/lib/typescript/realtime-transcription/adapters/AudioPcmStreamAdapter' {
  import type { AudioStreamInterface, AudioStreamConfig, AudioStreamData } from 'whisper.rn/lib/typescript/realtime-transcription/types';

  export class AudioPcmStreamAdapter implements AudioStreamInterface {
    constructor();
    initialize(config: AudioStreamConfig): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRecording(): boolean;
    onData(callback: (data: AudioStreamData) => void): void;
    onError(callback: (error: string) => void): void;
    onStatusChange(callback: (isRecording: boolean) => void): void;
    release(): Promise<void>;
  }
}

declare module 'react-native-fs' {
  const RNFS: {
    DocumentDirectoryPath: string;
    CachesDirectoryPath: string;
    writeFile: (path: string, data: string, encoding?: string) => Promise<void>;
    readFile: (path: string, encoding?: string) => Promise<string>;
    unlink: (path: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    mkdir: (path: string) => Promise<void>;
  };
  export default RNFS;
}
