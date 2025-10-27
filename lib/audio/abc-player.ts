/**
 * ABC Audio Player
 *
 * abcjs.synthを使用した音声再生の統一インターフェース
 * Safari/Chrome対応、タブ復帰時の自動resume、エラーハンドリング
 */

import abcjs from 'abcjs';

export interface AbcPlayerOptions {
  tempo?: number;
  instrument?: number; // MIDI program number
  volume?: number; // 0-1
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
}

export class AbcAudioPlayer {
  private synth: any = null;
  private audioContext: AudioContext | null = null;
  private visualObj: any = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private resumeOnVisibilityChange: boolean = true;
  private currentAbc: string = '';

  constructor() {
    this.setupVisibilityChangeHandler();
  }

  /**
   * タブ復帰時の自動resume設定（モバイルSafari対策）
   */
  private setupVisibilityChangeHandler(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.audioContext?.state === 'suspended') {
        try {
          await this.audioContext.resume();
          console.log('[AbcPlayer] Audio context resumed on tab focus');
        } catch (error) {
          console.error('[AbcPlayer] Failed to resume audio context:', error);
        }
      }
    });

    this.resumeOnVisibilityChange = false; // 一度だけ設定
  }

  /**
   * ABC記法から音声を初期化
   */
  async init(abc: string, options: AbcPlayerOptions = {}): Promise<{ success: boolean; error?: string }> {
    try {
      this.currentAbc = abc;

      // AudioContextの初期化（Safari対策）
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // 初回解錠
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // ABC記法をパース（非表示の一時要素でレンダリング）
      const tempContainer = document.createElement('div');
      tempContainer.style.display = 'none';
      document.body.appendChild(tempContainer);

      const renderResult = abcjs.renderAbc(tempContainer, abc, {
        responsive: 'resize',
      });

      document.body.removeChild(tempContainer);

      if (!renderResult || !Array.isArray(renderResult) || renderResult.length < 1) {
        throw new Error('Failed to parse ABC notation');
      }

      this.visualObj = renderResult[0];

      // Synthの初期化
      this.synth = new abcjs.synth.CreateSynth();
      await this.synth.init({
        audioContext: this.audioContext,
        visualObj: this.visualObj,
        options: {
          program: options.instrument || 0,
          qpm: options.tempo || 120,
          gain: options.volume || 0.5,
        },
      });

      console.log('[AbcPlayer] Initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('[AbcPlayer] Init failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 再生開始
   */
  async play(): Promise<void> {
    if (!this.synth) {
      throw new Error('Player not initialized. Call init() first.');
    }

    try {
      // 一時停止中の場合は再開
      if (this.isPaused) {
        this.synth.resume();
        this.isPlaying = true;
        this.isPaused = false;
        console.log('[AbcPlayer] Resumed');
        return;
      }

      // 新規再生
      await this.synth.prime();
      this.isPlaying = true;
      this.isPaused = false;

      this.synth.start();
      console.log('[AbcPlayer] Started playback');
    } catch (error) {
      console.error('[AbcPlayer] Playback failed:', error);
      this.isPlaying = false;
      this.isPaused = false;
      throw error;
    }
  }

  /**
   * 一時停止
   */
  pause(): void {
    if (this.synth && this.isPlaying) {
      this.synth.pause();
      this.isPlaying = false;
      this.isPaused = true;
      console.log('[AbcPlayer] Paused');
    }
  }

  /**
   * 停止
   */
  stop(): void {
    if (this.synth) {
      this.synth.stop();
      this.isPlaying = false;
      this.isPaused = false;
      console.log('[AbcPlayer] Stopped');
    }
  }

  /**
   * シーク（特定の位置から再生）
   */
  async seek(time: number): Promise<void> {
    if (!this.synth) {
      throw new Error('Player not initialized');
    }

    this.stop();
    // abcjs.synthはシーク機能が限定的なため、再初期化が必要
    await this.init(this.currentAbc);
    // TODO: 特定位置からの再生実装（abcjsの制約により現状困難）
  }

  /**
   * テンポ変更
   */
  setTempo(tempo: number): void {
    if (this.synth && this.visualObj) {
      this.synth.setTempo(tempo);
      console.log(`[AbcPlayer] Tempo set to ${tempo} BPM`);
    }
  }

  /**
   * ボリューム変更
   */
  setVolume(volume: number): void {
    if (this.synth) {
      this.synth.setGain(Math.max(0, Math.min(1, volume)));
      console.log(`[AbcPlayer] Volume set to ${volume}`);
    }
  }

  /**
   * ループ設定
   */
  setLoop(startBeat: number, endBeat: number, enabled: boolean = true): void {
    if (this.synth) {
      if (enabled) {
        this.synth.setLoop(startBeat, endBeat);
        console.log(`[AbcPlayer] Loop enabled: ${startBeat} - ${endBeat} beats`);
      } else {
        this.synth.setLoop(null);
        console.log('[AbcPlayer] Loop disabled');
      }
    }
  }

  /**
   * 現在の再生状態を取得
   */
  getState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTime: this.synth?.getCurrentTime() || 0,
      duration: this.visualObj?.getTotalTime() || 0,
    };
  }

  /**
   * リソースの解放
   */
  dispose(): void {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.synth = null;
    this.audioContext = null;
    this.visualObj = null;
    console.log('[AbcPlayer] Disposed');
  }
}

// シングルトンインスタンス（アプリ全体で共有）
export const audioPlayer = new AbcAudioPlayer();
