import { requireNativeModule, Platform } from 'expo-modules-core';

export interface ResampleOptions {
  /** 入力ファイルパス (WAV) */
  inputPath: string;
  /** 出力ファイルパス (WAV) */
  outputPath: string;
  /** 目標サンプルレート (デフォルト: 16000) */
  targetSampleRate?: number;
  /** チャンクサイズ MB (デフォルト: 10) - メモリ効率のため */
  chunkSizeMB?: number;
}

export interface ResampleResult {
  success: boolean;
  outputPath: string;
  inputSampleRate: number;
  outputSampleRate: number;
  durationMs: number;
  error?: string;
}

// ネイティブモジュールの読み込み（遅延ロード）
let AudioResamplerModule: any = null;

function getModule() {
  if (AudioResamplerModule === null && Platform.OS === 'ios') {
    try {
      AudioResamplerModule = requireNativeModule('AudioResamplerModule');
      console.log('[AudioResampler] Module loaded successfully');
    } catch (e: any) {
      console.warn('[AudioResampler] Failed to load module:', e.message);
      AudioResamplerModule = undefined;
    }
  }
  return AudioResamplerModule;
}

/**
 * 音声ファイルをリサンプリング
 * 48kHz/44.1kHz → 16kHz に変換（Whisper用）
 *
 * @example
 * ```typescript
 * const result = await resample({
 *   inputPath: '/path/to/48kHz.wav',
 *   outputPath: '/path/to/16kHz.wav',
 *   targetSampleRate: 16000,
 * });
 * ```
 */
export async function resample(options: ResampleOptions): Promise<ResampleResult> {
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      outputPath: options.outputPath,
      inputSampleRate: 0,
      outputSampleRate: options.targetSampleRate || 16000,
      durationMs: 0,
      error: 'AudioResampler is only available on iOS',
    };
  }

  const module = getModule();
  if (!module) {
    console.warn('[AudioResampler] Module not available, skipping resample');
    return {
      success: false,
      outputPath: options.outputPath,
      inputSampleRate: 0,
      outputSampleRate: options.targetSampleRate || 16000,
      durationMs: 0,
      error: 'AudioResamplerModule not loaded - using original file',
    };
  }

  try {
    console.log('[AudioResampler] Starting resample:', options.inputPath);
    const result = await module.resample(
      options.inputPath,
      options.outputPath,
      options.targetSampleRate || 16000,
      options.chunkSizeMB || 10
    );
    console.log('[AudioResampler] Resample complete:', result);
    return result;
  } catch (error: any) {
    console.error('[AudioResampler] Resample error:', error);
    return {
      success: false,
      outputPath: options.outputPath,
      inputSampleRate: 0,
      outputSampleRate: options.targetSampleRate || 16000,
      durationMs: 0,
      error: error.message || 'Unknown error',
    };
  }
}
