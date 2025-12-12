const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Note: whisper.rn is now enabled for native builds
// The Expo Go workaround was removed after prebuild

// Add .bin extension for whisper model files
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'bin'];

// Pre-compute whisper.rn path
const whisperRnPath = path.join(__dirname, 'node_modules', 'whisper.rn');

// Custom resolver for whisper.rn submodules
// This allows importing from 'whisper.rn/src/realtime-transcription' etc.
// Note: We redirect to lib/module (built JS) instead of src (TypeScript) to avoid module loading issues
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle whisper.rn/src/* imports - redirect to lib/module
  if (moduleName.startsWith('whisper.rn/src/')) {
    const subPath = moduleName.replace('whisper.rn/src/', '');
    const resolvedPath = path.join(whisperRnPath, 'lib', 'module', subPath);

    // Try with .js extension first, then index.js
    let filePath = resolvedPath + '.js';
    try {
      require('fs').accessSync(filePath);
    } catch {
      filePath = path.join(resolvedPath, 'index.js');
    }

    return {
      filePath,
      type: 'sourceFile',
    };
  }

  // Fall back to default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
