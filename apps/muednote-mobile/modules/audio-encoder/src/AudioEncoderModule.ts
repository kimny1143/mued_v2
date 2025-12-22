import { requireNativeModule, Platform } from 'expo-modules-core';

export interface EncodeOptions {
  /** 入力ファイルパス (WAV) */
  inputPath: string;
  /** 出力ファイルパス (M4A) */
  outputPath: string;
  /** ビットレート (デフォルト: 128000 = 128kbps) */
  bitRate?: number;
}

export interface EncodeResult {
  success: boolean;
  outputPath: string;
  inputSizeBytes: number;
  outputSizeBytes: number;
  compressionRatio: number;
  durationMs: number;
  error?: string;
}

// ネイティブモジュールの読み込み（遅延ロード）
let AudioEncoderModule: any = null;

function getModule() {
  if (AudioEncoderModule === null && Platform.OS === 'ios') {
    try {
      AudioEncoderModule = requireNativeModule('AudioEncoderModule');
      console.log('[AudioEncoder] Module loaded successfully');
    } catch (e: any) {
      console.warn('[AudioEncoder] Failed to load module:', e.message);
      AudioEncoderModule = undefined;
    }
  }
  return AudioEncoderModule;
}

/**
 * WAVファイルをM4A (AAC) に変換
 * 容量を5-10倍削減（共有・保存用）
 *
 * @example
 * ```typescript
 * const result = await encodeToM4A({
 *   inputPath: '/path/to/audio.wav',
 *   outputPath: '/path/to/audio.m4a',
 *   bitRate: 128000, // 128kbps
 * });
 * ```
 */
export async function encodeToM4A(options: EncodeOptions): Promise<EncodeResult> {
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      outputPath: options.outputPath,
      inputSizeBytes: 0,
      outputSizeBytes: 0,
      compressionRatio: 1,
      durationMs: 0,
      error: 'AudioEncoder is only available on iOS',
    };
  }

  const module = getModule();
  if (!module) {
    console.warn('[AudioEncoder] Module not available, skipping encode');
    return {
      success: false,
      outputPath: options.outputPath,
      inputSizeBytes: 0,
      outputSizeBytes: 0,
      compressionRatio: 1,
      durationMs: 0,
      error: 'AudioEncoderModule not loaded',
    };
  }

  try {
    console.log('[AudioEncoder] Starting encode:', options.inputPath);
    const result = await module.encodeToM4A(
      options.inputPath,
      options.outputPath,
      options.bitRate || 128000
    );
    console.log('[AudioEncoder] Encode complete:', result);
    return result;
  } catch (error: any) {
    console.error('[AudioEncoder] Encode error:', error);
    return {
      success: false,
      outputPath: options.outputPath,
      inputSizeBytes: 0,
      outputSizeBytes: 0,
      compressionRatio: 1,
      durationMs: 0,
      error: error.message || 'Unknown error',
    };
  }
}
