/**
 * Sound Utility - Hooの鳴き声再生
 *
 * TODO: 音声ファイルが決まったら実装
 * 現在はプレースホルダー
 *
 * 使用タイミング:
 * - 録音完了時
 * - セッション終了時
 * - アラーム音（タイマー終了）
 */

// expo-av を使用予定
// import { Audio } from 'expo-av';

type SoundType = 'hoo' | 'session_start' | 'session_end' | 'log_saved';

// Sound instances cache
// let hooSound: Audio.Sound | null = null;

/**
 * Hooの「Ho Hoo」音を再生
 */
export async function playHooSound(type: SoundType = 'hoo'): Promise<void> {
  if (__DEV__) {
    console.log(`[Sound] Ho Hoo! (${type}) - placeholder`);
  }

  // TODO: 音声ファイル実装時
  // if (!hooSound) {
  //   const { sound } = await Audio.Sound.createAsync(
  //     require('../../assets/sounds/hoo.mp3')
  //   );
  //   hooSound = sound;
  // }
  // await hooSound.replayAsync();
}

/**
 * 録音完了時の音
 */
export async function playLogSavedSound(): Promise<void> {
  await playHooSound('log_saved');
}

/**
 * セッション開始時の音
 */
export async function playSessionStartSound(): Promise<void> {
  await playHooSound('session_start');
}

/**
 * セッション終了時の音
 */
export async function playSessionEndSound(): Promise<void> {
  await playHooSound('session_end');
}

/**
 * サウンドリソースのクリーンアップ
 */
export async function unloadSounds(): Promise<void> {
  // TODO: 音声ファイル実装時
  // if (hooSound) {
  //   await hooSound.unloadAsync();
  //   hooSound = null;
  // }
}
