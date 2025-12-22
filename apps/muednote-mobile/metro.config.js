const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package exports resolution for whisper.rn submodules
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
