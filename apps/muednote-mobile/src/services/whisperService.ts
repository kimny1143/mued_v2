/**
 * MUEDnote Whisper Service
 * バッチ処理方式：録音 → 文字起こし（リアルタイム処理なし）
 */

import { Audio } from 'expo-av';
import { initWhisper } from 'whisper.rn';
import RNFS from 'react-native-fs';
import * as Sharing from 'expo-sharing';
import { resample } from '../../modules/audio-resampler';
import { encodeToM4A } from '../../modules/audio-encoder';

// モデルファイル名（Xcodeの「Copy Bundle Resources」に追加必須）
const WHISPER_MODEL = 'ggml-small.bin';

// 録音設定
const RECORDING_SAMPLE_RATE = 48000; // 音楽制作品質（Apple Voice Memos と同じ）
const WHISPER_SAMPLE_RATE = 16000;   // Whisper が必要とするサンプルレート

// Whisper ハルシネーション除去パターン（無音時に出やすい定型句）
// これらは削除される
const HALLUCINATION_REMOVE_PATTERNS = [
  /[\(（][音楽字幕パンッシャッ拍手笑い声]+[\)）]/g, // (音楽)、(字幕)、(パンッ) など
  /\(音声データ\)/g,
  /ご視聴ありがとうございました。?/g,
  /字幕を押して.*/g,
  /チャンネル登録.*/g,
];

// これらのみの場合は完全にハルシネーション（発話なし）
const HALLUCINATION_FULL_PATTERNS = [
  /^[\s\.。、,，]*$/, // 空白や句読点のみ
  /^お疲れ様でした。?$/,
  /^ありがとうございました。?$/,
];

// 文字起こし結果の型
export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    t0: number; // 開始時間 (ms)
    t1: number; // 終了時間 (ms)
  }>;
}

export interface WhisperCallbacks {
  onRecordingStatusChange?: (isRecording: boolean) => void;
  onError?: (error: string) => void;
}

class WhisperService {
  private whisperContext: any = null;
  private recording: Audio.Recording | null = null;
  private audioFilePath: string | null = null;
  private isInitialized = false;
  private callbacks: WhisperCallbacks = {};

  /**
   * Whisperモデルの初期化
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // マイク権限リクエスト
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'マイクの許可が必要です' };
      }

      // オーディオモード設定
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Whisper初期化
      console.log('[Whisper] Initializing model...');
      this.whisperContext = await initWhisper({
        filePath: WHISPER_MODEL,
        isBundleAsset: true,
      });
      console.log('[Whisper] Model loaded');

      this.isInitialized = true;
      return { success: true };
    } catch (error: any) {
      console.error('[Whisper] Initialize error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初期化状態を確認
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * コールバック設定
   */
  setCallbacks(callbacks: WhisperCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 録音開始
   */
  async startRecording(): Promise<void> {
    try {
      // タイムスタンプ付きファイル名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `muednote_${timestamp}.wav`;
      this.audioFilePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      this.recording = new Audio.Recording();

      // WAV形式で録音（48kHz - 音楽制作品質、Apple Voice Memos と同じ）
      // Whisper 処理前に 16kHz にリサンプリングする
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: RECORDING_SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 768000, // 48kHz に合わせて増加
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: RECORDING_SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 768000, // 48kHz に合わせて増加
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      await this.recording.startAsync();
      this.callbacks.onRecordingStatusChange?.(true);
      console.log('[Whisper] Recording started:', this.audioFilePath);
    } catch (error: any) {
      console.error('[Whisper] Failed to start recording:', error);
      this.callbacks.onError?.(error.message);
      throw error;
    }
  }

  /**
   * 録音停止
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.callbacks.onRecordingStatusChange?.(false);

      // URIが取得できた場合はそれを使用、なければ生成したパスを使用
      const finalPath = uri || this.audioFilePath;
      console.log('[Whisper] Recording stopped:', finalPath);

      // ファイルパスを更新
      if (uri) {
        this.audioFilePath = uri;
      }

      return this.audioFilePath;
    } catch (error: any) {
      console.error('[Whisper] Failed to stop recording:', error);
      this.recording = null;
      this.callbacks.onError?.(error.message);
      return null;
    }
  }

  /**
   * 録音中かどうか
   */
  get isRecording(): boolean {
    return this.recording !== null;
  }

  /**
   * 録音ファイルパスを取得
   */
  getAudioFilePath(): string | null {
    return this.audioFilePath;
  }

  /**
   * 音声ファイルを文字起こし（バッチ処理）
   * 48kHz → 16kHz リサンプリング → Whisper 処理
   */
  async transcribe(filePath?: string): Promise<TranscriptionResult | null> {
    const targetPath = filePath || this.audioFilePath;

    if (!targetPath) {
      console.error('[Whisper] No audio file to transcribe');
      return null;
    }

    if (!this.whisperContext) {
      console.error('[Whisper] Whisper not initialized');
      return null;
    }

    try {
      console.log('[Whisper] Starting transcription:', targetPath);
      const startTime = Date.now();

      // リサンプリング (48kHz → 16kHz)
      const resampledPath = targetPath.replace('.wav', '_16k.wav');
      console.log('[Whisper] Resampling to 16kHz...');

      const resampleResult = await resample({
        inputPath: targetPath,
        outputPath: resampledPath,
        targetSampleRate: WHISPER_SAMPLE_RATE,
        chunkSizeMB: 10,
      });

      if (!resampleResult.success) {
        console.error('[Whisper] Resampling failed:', resampleResult.error);
        // リサンプリング失敗時は元のファイルで試行（16kHzの可能性あり）
        console.log('[Whisper] Falling back to original file');
      } else {
        console.log(
          `[Whisper] Resampled: ${resampleResult.inputSampleRate}Hz → ${resampleResult.outputSampleRate}Hz in ${resampleResult.durationMs}ms`
        );
      }

      const whisperInputPath = resampleResult.success ? resampledPath : targetPath;

      const { promise } = this.whisperContext.transcribe(whisperInputPath, {
        language: 'ja',
      });
      const result = await promise;

      // リサンプル済みファイルを削除（元の48kHzファイルは保持）
      if (resampleResult.success) {
        try {
          await RNFS.unlink(resampledPath);
          console.log('[Whisper] Deleted resampled file');
        } catch {
          // 削除失敗は無視
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Whisper] Transcription completed in ${elapsed}ms`);

      if (result?.result) {
        const rawText = result.result.trim();

        // ハルシネーション除去 & クリーニング
        const cleanedText = this.cleanTranscription(rawText);

        // セグメントもクリーニング
        const cleanedSegments = (result.segments || [])
          .map((seg: { text: string; t0: number; t1: number }) => ({
            ...seg,
            text: this.cleanTranscription(seg.text),
          }))
          .filter((seg: { text: string }) => seg.text.length > 0);

        return {
          text: cleanedText,
          segments: cleanedSegments,
        };
      }

      return null;
    } catch (error: any) {
      console.error('[Whisper] Transcription error:', error);
      this.callbacks.onError?.(error.message);
      return null;
    }
  }

  /**
   * ハルシネーション除去 & クリーニング
   * 実際の発話は残し、ノイズのみ除去
   */
  private cleanTranscription(text: string): string {
    let cleaned = text;

    // ハルシネーションパターンを除去
    for (const pattern of HALLUCINATION_REMOVE_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }

    // 連続する空白を1つに
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 完全ハルシネーション判定（クリーニング後に何も残らない場合）
    if (HALLUCINATION_FULL_PATTERNS.some(pattern => pattern.test(cleaned))) {
      console.log(`[Whisper] Filtered as hallucination: "${text}" -> "${cleaned}"`);
      return '';
    }

    if (cleaned !== text) {
      console.log(`[Whisper] Cleaned: "${text}" -> "${cleaned}"`);
    }

    return cleaned;
  }

  /**
   * 音声ファイルをM4Aに変換してボイスメモに共有
   * WAV (48kHz, ~10MB/分) → M4A (~1MB/分) で容量削減
   */
  async shareAudioFile(): Promise<boolean> {
    if (!this.audioFilePath) {
      console.log('[Whisper] No audio file to share');
      return false;
    }

    try {
      const fileExists = await RNFS.exists(this.audioFilePath);
      if (!fileExists) {
        console.log('[Whisper] Audio file not found:', this.audioFilePath);
        return false;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.log('[Whisper] Sharing not available');
        return false;
      }

      // WAV → M4A 変換
      const m4aPath = this.audioFilePath.replace('.wav', '.m4a');
      console.log('[Whisper] Encoding to M4A...');

      const encodeResult = await encodeToM4A({
        inputPath: this.audioFilePath,
        outputPath: m4aPath,
        bitRate: 128000, // 128kbps（高品質）
      });

      let shareFilePath = this.audioFilePath;
      let shareMimeType = 'audio/wav';

      if (encodeResult.success) {
        console.log(
          `[Whisper] Encoded: ${(encodeResult.inputSizeBytes / 1024 / 1024).toFixed(1)}MB → ${(encodeResult.outputSizeBytes / 1024 / 1024).toFixed(1)}MB (${encodeResult.compressionRatio.toFixed(1)}x compression) in ${encodeResult.durationMs}ms`
        );
        shareFilePath = m4aPath;
        shareMimeType = 'audio/m4a';
      } else {
        console.warn('[Whisper] M4A encoding failed:', encodeResult.error);
        console.log('[Whisper] Falling back to WAV');
      }

      await Sharing.shareAsync(shareFilePath, {
        mimeType: shareMimeType,
        dialogTitle: 'MUEDnote 録音を保存',
      });
      console.log('[Whisper] Audio shared successfully');

      // M4Aファイルを削除（共有後）
      if (encodeResult.success) {
        try {
          await RNFS.unlink(m4aPath);
          console.log('[Whisper] M4A temp file deleted');
        } catch {
          // 削除失敗は無視
        }
      }

      return true;
    } catch (error) {
      console.error('[Whisper] Failed to share audio:', error);
      return false;
    }
  }

  /**
   * 音声ファイルを削除
   */
  async deleteAudioFile(): Promise<void> {
    if (this.audioFilePath) {
      try {
        const exists = await RNFS.exists(this.audioFilePath);
        if (exists) {
          await RNFS.unlink(this.audioFilePath);
          console.log('[Whisper] Audio file deleted:', this.audioFilePath);
        }
      } catch (error) {
        console.error('[Whisper] Failed to delete audio file:', error);
      }
      this.audioFilePath = null;
    }
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {}
      this.recording = null;
    }
    this.callbacks = {};
    console.log('[Whisper] Cleanup completed');
  }
}

// シングルトンエクスポート
export const whisperService = new WhisperService();
