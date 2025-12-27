/**
 * Sound Utility - Hooの鳴き声再生
 *
 * expo-audio を使用した音声再生（SDK 54+）
 * 使用タイミング:
 * - 録音完了時
 * - セッション終了時
 * - アラーム音（タイマー終了）
 */

import { Audio, AVPlaybackStatus } from 'expo-av';

// Sound sources
const hooSource = require('../../assets/sounds/hoo.m4a');
const iconSource = require('../../assets/sounds/icon.m4a');

/**
 * 音声システムの初期化
 * アプリ起動時に呼び出す
 */
export async function initSounds(): Promise<void> {
  try {
    // expo-audio doesn't require explicit audio mode setup
    // it handles iOS silent mode automatically
    console.log('[Sound] Initialized successfully');
  } catch (error) {
    console.error('[Sound] Failed to initialize:', error);
  }
}

/**
 * Hooの「Ho Hoo」音を再生
 */
export async function playHooSound(): Promise<void> {
  try {
    console.log('[Sound] Playing hoo');

    // Switch from recording mode to playback mode
    // This is critical after stopping a recording session
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,  // Important: disable recording mode
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    console.log('[Sound] Audio mode set for playback');

    const { sound } = await Audio.Sound.createAsync(hooSource, {
      shouldPlay: true,
      volume: 1.0,
    });

    console.log('[Sound] Playing hoo - started');

    // Unload after playing
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        console.log('[Sound] Hoo sound finished and unloaded');
      }
    });
  } catch (error) {
    console.error('[Sound] Failed to play hoo:', error);
  }
}

/**
 * アイコン音を再生
 */
export async function playIconSound(): Promise<void> {
  try {
    console.log('[Sound] Playing icon');

    // Ensure playback mode (not recording mode)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    console.log('[Sound] Audio mode set for playback');

    const { sound } = await Audio.Sound.createAsync(iconSource, {
      shouldPlay: true,
      volume: 1.0,
    });

    console.log('[Sound] Playing icon - started');

    // Return a promise that resolves when sound finishes
    return new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate(async (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          console.log('[Sound] Icon sound finished and unloaded');

          // Switch back to recording mode after sound finishes
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          console.log('[Sound] Audio mode restored for recording');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('[Sound] Failed to play icon:', error);
  }
}

/**
 * 録音完了時の音（Hoo鳴き声）
 */
export async function playLogSavedSound(): Promise<void> {
  await playHooSound();
}

/**
 * セッション開始時の音（アイコン音）
 */
export async function playSessionStartSound(): Promise<void> {
  await playIconSound();
}

/**
 * セッション終了時の音（Hoo鳴き声）
 */
export async function playSessionEndSound(): Promise<void> {
  await playHooSound();
}

/**
 * サウンドリソースのクリーンアップ
 */
export async function unloadSounds(): Promise<void> {
  try {
    // No-op for now since we unload after each play
    console.log('[Sound] Unloaded');
  } catch (error) {
    console.error('[Sound] Failed to unload:', error);
  }
}
