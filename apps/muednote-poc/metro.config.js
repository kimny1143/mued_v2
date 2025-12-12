const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Note: whisper.rn is now enabled for native builds
// The Expo Go workaround was removed after prebuild

// Add .bin extension for whisper model files
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'bin'];

module.exports = config;
