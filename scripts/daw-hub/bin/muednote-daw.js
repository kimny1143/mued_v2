#!/usr/bin/env node

/**
 * MUEDnote DAW Hub CLI Entry Point
 *
 * Usage:
 *   muednote-daw start          - Start listening for OSC messages
 *   muednote-daw --help         - Show help
 */

const path = require('path');

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
MUEDnote DAW Hub - Ableton Live Parameter Logger

USAGE:
  muednote-daw [command]

COMMANDS:
  start           Start the OSC listener (default)
  --help, -h      Show this help message
  --version, -v   Show version

ENVIRONMENT:
  DAW_HUB_API_URL   API endpoint URL
                    Default: http://localhost:3000/api/muednote/daw-log

  DAW_HUB_API_KEY   API authentication key
                    Required for production

SETUP:
  1. Install AbletonOSC Max for Live device in Ableton
  2. Set environment variables (or use ~/.muednote/config.json)
  3. Run: muednote-daw start
  4. Operate parameters in Ableton - logs will be captured

EXAMPLES:
  # Start with default settings (localhost)
  muednote-daw start

  # Start with custom API
  DAW_HUB_API_URL=https://mued.jp/api/muednote/daw-log \\
  DAW_HUB_API_KEY=your_key muednote-daw start
`);
  process.exit(0);
}

// Check for version flag
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = require('../package.json');
  console.log(`muednote-daw v${pkg.version}`);
  process.exit(0);
}

// Run the main script
require('../dist/index.js');
