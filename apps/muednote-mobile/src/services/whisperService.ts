/**
 * MUEDnote Whisper Service
 * whisper.rn を使用した音声認識サービス
 */

import { Audio } from 'expo-av';
import { initWhisper, initWhisperVad, AudioSessionIos } from 'whisper.rn';
import { RealtimeTranscriber } from 'whisper.rn/realtime-transcription';
import { AudioPcmStreamAdapter } from 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter';
import RNFS from 'react-native-fs';

// モデルファイル名（Xcodeの "Copy Bundle Resources" に追加必須）
const WHISPER_MODEL = 'ggml-small.bin';
const VAD_MODEL = 'ggml-silero-vad.bin';

// VADステータスの型
export type VadStatusType = 'silence' | 'speech_start' | 'speech_continue' | 'speech_end';

// 文字起こし結果のコールバック型
export interface TranscriptionResult {
  text: string;
  startTime: number;
  confidence?: number;
  sliceIndex: number;
}

export interface WhisperCallbacks {
  onStatusChange?: (isActive: boolean) => void;
  onVadChange?: (status: VadStatusType, confidence?: number) => void;
  onTranscribe?: (result: TranscriptionResult) => void;
  onError?: (error: string) => void;
}

class WhisperService {
  private whisperContext: any = null;
  private vadContext: any = null;
  private realtimeTranscriber: RealtimeTranscriber | null = null;
  private recording: Audio.Recording | null = null;
  private isInitialized = false;
  private processedSlices = new Set<number>();
  private callbacks: WhisperCallbacks = {};

  /**
   * Whisperモデルの初期化
   */
  async initialize(): Promise<{ success: boolean; hasVad: boolean; error?: string }> {
    try {
      // マイク権限リクエスト
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, hasVad: false, error: 'マイクの許可が必要です' };
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

      // VAD初期化（オプション）
      let hasVad = false;
      try {
        this.vadContext = await initWhisperVad({
          filePath: VAD_MODEL,
          isBundleAsset: true,
        });
        hasVad = true;
        console.log('[Whisper] VAD loaded');
      } catch (vadError: any) {
        console.log('[Whisper] VAD not available:', vadError.message);
      }

      this.isInitialized = true;
      return { success: true, hasVad };
    } catch (error: any) {
      console.error('[Whisper] Initialize error:', error);
      return { success: false, hasVad: false, error: error.message };
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
   * リアルタイム文字起こし開始
   */
  async startRealtimeTranscription(useVad = true): Promise<void> {
    if (!this.whisperContext) {
      throw new Error('Whisper not initialized');
    }

    // 重複防止リセット
    this.processedSlices.clear();

    // オーディオストリームアダプター作成
    // 注意: 初期化は RealtimeTranscriber.start() 内で行われる
    const audioStream = new AudioPcmStreamAdapter();

    // RealtimeTranscriber作成
    this.realtimeTranscriber = new RealtimeTranscriber(
      {
        whisperContext: this.whisperContext,
        vadContext: useVad ? this.vadContext : undefined,
        audioStream,
        fs: RNFS,
      },
      {
        // audioStream の初期化設定
        audioStreamConfig: {
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6, // VOICE_RECOGNITION
          bufferSize: 16 * 1024,
        },
        audioSliceSec: 15, // 15秒ごとに処理
        audioMinSec: 2, // 最低2秒
        autoSliceOnSpeechEnd: true,
        vadPreset: 'continuous',
        vadOptions: {
          threshold: 0.3,
          minSpeechDurationMs: 150,
          minSilenceDurationMs: 800,
          maxSpeechDurationS: 30,
          speechPadMs: 200,
        },
        vadThrottleMs: 2000,
        transcribeOptions: {
          language: 'ja',
        },
        logger: (msg: string) => {
          if (msg.includes('Transcribed') || msg.includes('error')) {
            console.log(`[Transcriber] ${msg}`);
          }
        },
      },
      {
        onStatusChange: (isActive: boolean) => {
          this.callbacks.onStatusChange?.(isActive);
        },
        onVad: (event: any) => {
          if (event.type === 'speech_start') {
            this.callbacks.onVadChange?.('speech_start');
          } else if (event.type === 'speech_end') {
            this.callbacks.onVadChange?.('speech_end', event.confidence);
          } else if (event.type === 'speech_continue') {
            this.callbacks.onVadChange?.('speech_continue');
          } else {
            this.callbacks.onVadChange?.('silence');
          }
        },
        onTranscribe: (event: any) => {
          if (event.type === 'transcribe' && event.data?.result) {
            // 重複チェック
            if (this.processedSlices.has(event.sliceIndex)) {
              return;
            }
            this.processedSlices.add(event.sliceIndex);

            const trimmedText = event.data.result.trim();
            if (trimmedText && trimmedText !== '.') {
              this.callbacks.onTranscribe?.({
                text: trimmedText,
                startTime: event.startTime || 0,
                confidence: event.confidence,
                sliceIndex: event.sliceIndex,
              });
            }
          }
        },
        onError: (error: string) => {
          this.callbacks.onError?.(error);
        },
      }
    );

    await this.realtimeTranscriber.start();
    console.log('[Whisper] Realtime transcription started');
  }

  /**
   * リアルタイム文字起こし停止
   */
  async stopRealtimeTranscription(): Promise<void> {
    if (this.realtimeTranscriber) {
      await this.realtimeTranscriber.stop();
      this.realtimeTranscriber = null;
      console.log('[Whisper] Realtime transcription stopped');
    }
  }

  /**
   * バッチ処理用録音開始
   */
  async startBatchRecording(): Promise<void> {
    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync({
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {},
    });

    await this.recording.startAsync();
    console.log('[Whisper] Batch recording started');
  }

  /**
   * バッチ処理用録音停止 & 文字起こし
   */
  async stopBatchRecordingAndTranscribe(): Promise<TranscriptionResult | null> {
    if (!this.recording) return null;

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    if (!uri || !this.whisperContext) return null;

    console.log('[Whisper] Batch recording stopped, transcribing...');
    const startTime = Date.now();

    try {
      const { promise } = this.whisperContext.transcribe(uri, {
        language: 'ja',
      });
      const result = await promise;
      const processingTime = Date.now() - startTime;

      if (result?.result) {
        return {
          text: result.result.trim(),
          startTime: 0,
          sliceIndex: 0,
        };
      }
    } catch (error: any) {
      console.error('[Whisper] Batch transcribe error:', error);
      this.callbacks.onError?.(error.message);
    }

    return null;
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    await this.stopRealtimeTranscription();
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {}
      this.recording = null;
    }
    this.callbacks = {};
  }
}

// シングルトンエクスポート
export const whisperService = new WhisperService();
