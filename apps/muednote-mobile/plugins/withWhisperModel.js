/**
 * Expo Config Plugin: Whisper Model Auto-Copy
 *
 * prebuild 時に assets/models/ggml-small.bin を
 * iOS プロジェクトにコピーする（Xcode で手動追加は初回のみ必要）
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODEL_FILE = 'ggml-small.bin';

const withWhisperModel = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;

      // ソースとターゲットのパス
      const sourceModelPath = path.join(projectRoot, 'assets', 'models', MODEL_FILE);
      const targetDir = path.join(platformProjectRoot, 'MUEDnote', 'models');
      const targetModelPath = path.join(targetDir, MODEL_FILE);

      // モデルファイルが存在するか確認
      if (!fs.existsSync(sourceModelPath)) {
        console.warn(`[withWhisperModel] Model file not found: ${sourceModelPath}`);
        console.warn('[withWhisperModel] Please place ggml-small.bin in assets/models/');
        return config;
      }

      // ターゲットディレクトリを作成
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // モデルファイルをコピー
      fs.copyFileSync(sourceModelPath, targetModelPath);
      console.log(`[withWhisperModel] ✓ Copied model to: ${targetModelPath}`);

      return config;
    },
  ]);
};

module.exports = withWhisperModel;
