/**
 * DAW Hub - AbletonOSC Listener with Polling + Batch API
 *
 * Features:
 * - OSC message reception from Ableton Live (via AbletonOSC)
 * - **Polling-based change detection** (200ms interval) for device parameters
 * - Listener-based for Volume/Pan (works reliably)
 * - Parameter change debouncing (500ms default)
 * - Batch API posting (5 second buffer)
 * - Retry logic with exponential backoff
 * - **Device configuration refresh** to handle device reordering
 *
 * Usage:
 *   npx tsx scripts/daw-hub/index.ts
 *
 * Environment:
 *   DAW_HUB_API_URL  - API endpoint (default: http://localhost:3000/api/muednote/daw-log)
 *   DAW_HUB_API_KEY  - API key for authentication (required in production)
 */

import dgram from 'dgram';
import { formatPluginValue } from './plugins';

// ========================================
// Configuration
// ========================================

interface Config {
  abletonSendPort: number;
  abletonReceivePort: number;
  debounceMs: number;
  pollingIntervalMs: number;
  deviceRefreshIntervalMs: number; // Refresh device list periodically
  maxTracksToMonitor: number;
  maxParamsPerDevice: number;
  apiUrl: string;
  apiKey: string;
  batchIntervalMs: number;
  maxBatchSize: number;
  maxRetries: number;
  retryBaseDelayMs: number;
}

function loadConfig(): Config {
  const apiUrl = process.env.DAW_HUB_API_URL;
  const apiKey = process.env.DAW_HUB_API_KEY;

  if (!apiUrl) {
    console.warn('\x1b[33m[WARN] DAW_HUB_API_URL not set, using localhost default\x1b[0m');
  }
  if (!apiKey) {
    console.warn('\x1b[33m[WARN] DAW_HUB_API_KEY not set, using dev fallback\x1b[0m');
  }

  return {
    abletonSendPort: 11000,
    abletonReceivePort: 11001,
    debounceMs: 500,
    pollingIntervalMs: 200,
    deviceRefreshIntervalMs: 3000, // Refresh device info every 3s
    maxTracksToMonitor: 10,
    maxParamsPerDevice: 50,
    apiUrl: apiUrl || 'http://localhost:3000/api/muednote/daw-log',
    apiKey: apiKey || 'dev_daw_key_kimny',
    batchIntervalMs: 5000,
    maxBatchSize: 100,
    maxRetries: 3,
    retryBaseDelayMs: 1000,
  };
}

const CONFIG = loadConfig();

// ========================================
// Types
// ========================================

type DawAction = 'parameter_change' | 'track_volume' | 'track_pan' | 'device_config_change';

interface LogEntry {
  timestamp: Date;
  action?: DawAction;
  trackId: number;
  deviceId: number;
  paramId: number;
  value: number;
  valueString: string;
  trackName?: string;
  deviceName?: string;
  paramName?: string;
  prevParamCount?: number;
  newParamCount?: number;
}

interface PendingChange {
  value: number;
  valueString: string;
  timer: NodeJS.Timeout;
  trackId: number;
  deviceId: number;
  paramId: number;
}

interface ApiLogPayload {
  timestamp: string;
  daw: 'ableton';
  action: DawAction;
  track_id: number;
  device_id: number;
  param_id: number;
  value: number;
  value_string: string;
  metadata?: {
    track_name?: string;
    device_name?: string;
    param_name?: string;
    prev_param_count?: number;
    new_param_count?: number;
  };
}

interface DeviceInfo {
  trackId: number;
  deviceId: number;
  name: string;
  numParams: number;
}

// ========================================
// State
// ========================================

const pendingChanges = new Map<string, PendingChange>();
const logBuffer: LogEntry[] = [];

// Device registry - keyed by "trackId:deviceId"
const devices = new Map<string, DeviceInfo>();

// Caches - keyed by "trackId:deviceId:paramId"
const paramValueCache = new Map<string, number>();
const paramStringCache = new Map<string, string>();
const paramNameCache = new Map<string, string>();
const pendingValueChanges = new Set<string>();

// Track names
const trackNameCache = new Map<number, string>();

// Track count for refresh
let numTracks = 0;

// Polling state
let pollingInterval: NodeJS.Timeout | null = null;
let deviceRefreshInterval: NodeJS.Timeout | null = null;
let isInitialSetup = true;

// Statistics
let stats = {
  logsQueued: 0,
  logsSent: 0,
  batchesSent: 0,
  errors: 0,
  retries: 0,
};

// ========================================
// API Client with Retry
// ========================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendBatchWithRetry(logs: LogEntry[]): Promise<boolean> {
  const payload: ApiLogPayload[] = logs.map((log) => {
    const hasMetadata = log.trackName || log.deviceName || log.paramName || log.prevParamCount !== undefined;
    return {
      timestamp: log.timestamp.toISOString(),
      daw: 'ableton' as const,
      action: log.action || getAction(log.deviceId, log.paramId),
      track_id: log.trackId,
      device_id: log.deviceId,
      param_id: log.paramId,
      value: log.value,
      value_string: log.valueString,
      metadata: hasMetadata ? {
        track_name: log.trackName,
        device_name: log.deviceName,
        param_name: log.paramName,
        prev_param_count: log.prevParamCount,
        new_param_count: log.newParamCount,
      } : undefined,
    };
  });

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DAW-API-Key': CONFIG.apiKey,
        },
        body: JSON.stringify({ logs: payload }),
      });

      if (response.ok) {
        const result = await response.json();
        stats.logsSent += result.inserted || logs.length;
        stats.batchesSent++;
        return true;
      }

      if (response.status >= 400 && response.status < 500) {
        const errorBody = await response.text();
        console.error(`\x1b[31m[API] Client error ${response.status}: ${errorBody}\x1b[0m`);
        stats.errors++;
        return false;
      }

      console.warn(
        `\x1b[33m[API] Server error ${response.status}, attempt ${attempt + 1}/${CONFIG.maxRetries + 1}\x1b[0m`
      );
    } catch (error) {
      console.warn(
        `\x1b[33m[API] Network error, attempt ${attempt + 1}/${CONFIG.maxRetries + 1}: ${error}\x1b[0m`
      );
    }

    if (attempt < CONFIG.maxRetries) {
      const delay = CONFIG.retryBaseDelayMs * Math.pow(2, attempt);
      stats.retries++;
      await sleep(delay);
    }
  }

  stats.errors++;
  console.error('\x1b[31m[API] All retry attempts failed\x1b[0m');
  return false;
}

function getAction(
  deviceId: number,
  paramId: number
): 'parameter_change' | 'track_volume' | 'track_pan' {
  if (deviceId === -1) {
    return paramId === 0 ? 'track_volume' : 'track_pan';
  }
  return 'parameter_change';
}

// ========================================
// Batch Processing
// ========================================

let batchTimer: NodeJS.Timeout | null = null;

function scheduleFlush() {
  if (batchTimer) return;

  batchTimer = setTimeout(async () => {
    batchTimer = null;
    await flushBuffer();
  }, CONFIG.batchIntervalMs);
}

async function flushBuffer() {
  if (logBuffer.length === 0) return;

  const logsToSend = logBuffer.splice(0, CONFIG.maxBatchSize);
  const count = logsToSend.length;

  process.stdout.write(`\x1b[36m[BATCH] Sending ${count} logs...\x1b[0m`);

  const success = await sendBatchWithRetry(logsToSend);

  if (success) {
    console.log(` \x1b[32mOK\x1b[0m (total: ${stats.logsSent})`);
  } else {
    console.log(` \x1b[31mFAILED\x1b[0m`);
  }

  if (logBuffer.length > 0) {
    scheduleFlush();
  }
}

// ========================================
// Log Handling
// ========================================

function queueLog(entry: LogEntry) {
  logBuffer.push(entry);
  stats.logsQueued++;

  const time = entry.timestamp.toLocaleTimeString('ja-JP');
  const trackInfo = entry.trackName || `Track ${entry.trackId}`;
  const deviceInfo = entry.deviceId >= 0
    ? (entry.deviceName || `Device ${entry.deviceId}`)
    : 'Mixer';
  const paramInfo = entry.paramName || (entry.deviceId === -1 ? (entry.paramId === 0 ? 'Volume' : 'Pan') : `Param ${entry.paramId}`);

  if (entry.action === 'device_config_change') {
    console.log(
      `\x1b[35m[CONFIG]\x1b[0m ${time} | ${trackInfo} > ${deviceInfo} → ${entry.valueString}`
    );
  } else {
    console.log(
      `\x1b[32m[LOG]\x1b[0m ${time} | ${trackInfo} > ${deviceInfo} > ${paramInfo} → ${entry.valueString}`
    );
  }

  scheduleFlush();
}

// ========================================
// Debounce Processing
// ========================================

function handleParameterChange(
  trackId: number,
  deviceId: number,
  paramId: number,
  value: number,
  valueString: string
) {
  const key = `${trackId}:${deviceId}:${paramId}`;

  const existing = pendingChanges.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    // Get names at LOG time, not at change detection time
    // This ensures we use the most recent param name (important for Pro-Q4 etc)
    const trackName = trackNameCache.get(trackId);
    const deviceKey = `${trackId}:${deviceId}`;
    const device = devices.get(deviceKey);
    const deviceName = device?.name;
    const paramName = paramNameCache.get(key);

    // Apply plugin-specific value formatting (e.g., Pro-Q frequency)
    const formattedValue = formatPluginValue(deviceName, paramName, value, valueString);
    const finalValueString = formattedValue ?? valueString;

    queueLog({
      timestamp: new Date(),
      trackId,
      deviceId,
      paramId,
      value,
      valueString: finalValueString,
      trackName,
      deviceName,
      paramName,
    });
    pendingChanges.delete(key);
  }, CONFIG.debounceMs);

  pendingChanges.set(key, {
    value,
    valueString,
    timer,
    trackId,
    deviceId,
    paramId,
  });
}

// ========================================
// Polling
// ========================================

function startPolling(send: (address: string, args: (string | number)[]) => void) {
  if (pollingInterval) return;

  console.log(`\x1b[34m[POLL] Starting parameter polling (${CONFIG.pollingIntervalMs}ms)\x1b[0m`);

  pollingInterval = setInterval(() => {
    for (const device of devices.values()) {
      // Only poll up to maxParamsPerDevice
      const maxParams = Math.min(device.numParams, CONFIG.maxParamsPerDevice);
      for (let paramId = 0; paramId < maxParams; paramId++) {
        // Always request param name (Pro-Q4 etc change dynamically based on selected band)
        send('/live/device/get/parameter/name', [device.trackId, device.deviceId, paramId]);
        send('/live/device/get/parameter/value', [device.trackId, device.deviceId, paramId]);
        send('/live/device/get/parameter/value_string', [device.trackId, device.deviceId, paramId]);
      }
    }
  }, CONFIG.pollingIntervalMs);
}

function startDeviceRefresh(send: (address: string, args: (string | number)[]) => void) {
  if (deviceRefreshInterval) return;

  console.log(`\x1b[34m[REFRESH] Starting device refresh (${CONFIG.deviceRefreshIntervalMs}ms)\x1b[0m`);

  deviceRefreshInterval = setInterval(() => {
    // Re-query all tracks for their devices
    for (let i = 0; i < numTracks; i++) {
      send('/live/track/get/num_devices', [i]);
    }
  }, CONFIG.deviceRefreshIntervalMs);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (deviceRefreshInterval) {
    clearInterval(deviceRefreshInterval);
    deviceRefreshInterval = null;
  }
}

// ========================================
// Device Management
// ========================================

function clearDeviceCaches(trackId: number, deviceId: number) {
  const prefix = `${trackId}:${deviceId}:`;
  for (const key of paramValueCache.keys()) {
    if (key.startsWith(prefix)) paramValueCache.delete(key);
  }
  for (const key of paramStringCache.keys()) {
    if (key.startsWith(prefix)) paramStringCache.delete(key);
  }
  for (const key of paramNameCache.keys()) {
    if (key.startsWith(prefix)) paramNameCache.delete(key);
  }
  for (const key of pendingValueChanges) {
    if (key.startsWith(prefix)) pendingValueChanges.delete(key);
  }
}

// ========================================
// OSC Message Handling
// ========================================

function createOscMessage(address: string, args: (string | number)[] = []): Buffer {
  const buffers: Buffer[] = [];

  const addressBuf = Buffer.from(address + '\0');
  const addressPadded = Buffer.alloc(Math.ceil(addressBuf.length / 4) * 4);
  addressBuf.copy(addressPadded);
  buffers.push(addressPadded);

  let typeTag = ',';
  for (const arg of args) {
    if (typeof arg === 'number') {
      typeTag += Number.isInteger(arg) ? 'i' : 'f';
    } else {
      typeTag += 's';
    }
  }
  const typeBuf = Buffer.from(typeTag + '\0');
  const typePadded = Buffer.alloc(Math.ceil(typeBuf.length / 4) * 4);
  typeBuf.copy(typePadded);
  buffers.push(typePadded);

  for (const arg of args) {
    if (typeof arg === 'number') {
      const buf = Buffer.alloc(4);
      if (Number.isInteger(arg)) {
        buf.writeInt32BE(arg, 0);
      } else {
        buf.writeFloatBE(arg, 0);
      }
      buffers.push(buf);
    } else {
      const strBuf = Buffer.from(arg + '\0');
      const strPadded = Buffer.alloc(Math.ceil(strBuf.length / 4) * 4);
      strBuf.copy(strPadded);
      buffers.push(strPadded);
    }
  }

  return Buffer.concat(buffers);
}

function parseOscMessage(buffer: Buffer): { address: string; args: (number | string)[] } {
  let offset = 0;

  const addressEnd = buffer.indexOf(0, offset);
  const address = buffer.toString('utf8', offset, addressEnd);
  offset = Math.ceil((addressEnd + 1) / 4) * 4;

  const typeTagEnd = buffer.indexOf(0, offset);
  const typeTag = buffer.toString('utf8', offset + 1, typeTagEnd);
  offset = Math.ceil((typeTagEnd + 1) / 4) * 4;

  const args: (number | string)[] = [];
  for (const type of typeTag) {
    if (type === 'i') {
      args.push(buffer.readInt32BE(offset));
      offset += 4;
    } else if (type === 'f') {
      args.push(buffer.readFloatBE(offset));
      offset += 4;
    } else if (type === 's') {
      const strEnd = buffer.indexOf(0, offset);
      args.push(buffer.toString('utf8', offset, strEnd));
      offset = Math.ceil((strEnd + 1) / 4) * 4;
    }
  }

  return { address, args };
}

// ========================================
// Pending device info collection
// ========================================

// Track pending device info requests
const pendingDeviceInfo = new Map<string, { name?: string; numParams?: number }>();

function checkAndRegisterDevice(trackId: number, deviceId: number, send: (address: string, args: (string | number)[]) => void) {
  const key = `${trackId}:${deviceId}`;
  const pending = pendingDeviceInfo.get(key);

  if (pending?.name !== undefined && pending?.numParams !== undefined) {
    const existingDevice = devices.get(key);

    // Check if device changed (name or param count)
    if (existingDevice) {
      if (existingDevice.name !== pending.name) {
        // Device at this position changed!
        console.log(`\x1b[33m[DEVICE]\x1b[0m Track ${trackId} Device ${deviceId}: "${existingDevice.name}" → "${pending.name}"`);
        clearDeviceCaches(trackId, deviceId);
      }

      if (existingDevice.numParams !== pending.numParams && !isInitialSetup) {
        const trackName = trackNameCache.get(trackId);
        const diff = pending.numParams - existingDevice.numParams;
        const changeType = diff > 0 ? 'added' : 'removed';

        console.log(
          `\x1b[35m[CONFIG]\x1b[0m ${trackName || `Track ${trackId}`} > ${pending.name}: ${Math.abs(diff)} param(s) ${changeType} (${existingDevice.numParams} → ${pending.numParams})`
        );

        // Only log config change if same device (same name)
        if (existingDevice.name === pending.name) {
          queueLog({
            timestamp: new Date(),
            action: 'device_config_change',
            trackId,
            deviceId,
            paramId: -1,
            value: pending.numParams,
            valueString: `${Math.abs(diff)} param(s) ${changeType}`,
            trackName,
            deviceName: pending.name,
            prevParamCount: existingDevice.numParams,
            newParamCount: pending.numParams,
          });
        }

        clearDeviceCaches(trackId, deviceId);
      }
    }

    // Register/update device (store actual count, poll only up to max)
    devices.set(key, {
      trackId,
      deviceId,
      name: pending.name,
      numParams: pending.numParams, // Store actual count for comparison
    });

    pendingDeviceInfo.delete(key);

    // Start polling if needed
    if (!pollingInterval && devices.size > 0) {
      setTimeout(() => {
        isInitialSetup = false;
        startPolling(send);
        startDeviceRefresh(send);
      }, 500);
    }
  }
}

// ========================================
// Main
// ========================================

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║       DAW Hub - MUEDnote Logger        ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`API URL: ${CONFIG.apiUrl}`);
  console.log(`Batch interval: ${CONFIG.batchIntervalMs}ms`);
  console.log(`Debounce: ${CONFIG.debounceMs}ms`);
  console.log(`Polling: ${CONFIG.pollingIntervalMs}ms\n`);

  const receiver = dgram.createSocket('udp4');
  const sender = dgram.createSocket('udp4');

  function send(address: string, args: (string | number)[] = []) {
    const msg = createOscMessage(address, args);
    sender.send(msg, CONFIG.abletonSendPort, '127.0.0.1');
  }

  // Message handler
  receiver.on('message', (msg) => {
    try {
      const { address, args } = parseOscMessage(msg);

      // ========================================
      // Parameter name response
      // ========================================
      if (address === '/live/device/get/parameter/name') {
        const [trackId, deviceId, paramId, name] = args as [number, number, number, string];
        const key = `${trackId}:${deviceId}:${paramId}`;
        paramNameCache.set(key, name);
      }

      // ========================================
      // Polling responses: Parameter value (numeric)
      // ========================================
      if (address === '/live/device/get/parameter/value') {
        const [trackId, deviceId, paramId, value] = args as [number, number, number, number];
        const key = `${trackId}:${deviceId}:${paramId}`;

        const oldValue = paramValueCache.get(key);
        const hasChanged = oldValue !== undefined && Math.abs(oldValue - value) > 0.001;

        paramValueCache.set(key, value);

        if (hasChanged) {
          // Mark that we're waiting for the new value_string
          // Don't use cached string - it's from the OLD value!
          pendingValueChanges.add(key);
        }
      }

      // ========================================
      // Polling responses: Parameter value string
      // ========================================
      if (address === '/live/device/get/parameter/value_string') {
        const [trackId, deviceId, paramId, valueString] = args as [number, number, number, string];
        const key = `${trackId}:${deviceId}:${paramId}`;

        const oldString = paramStringCache.get(key);
        paramStringCache.set(key, valueString);

        // If value changed and we have the string, or string itself changed
        if (pendingValueChanges.has(key)) {
          pendingValueChanges.delete(key);
          const value = paramValueCache.get(key) ?? 0;
          handleParameterChange(trackId, deviceId, paramId, value, valueString);
        } else if (oldString !== undefined && oldString !== valueString) {
          // String changed even if numeric value didn't trigger (e.g., different display format)
          const value = paramValueCache.get(key) ?? 0;
          handleParameterChange(trackId, deviceId, paramId, value, valueString);
        }
      }

      // ========================================
      // Track count → start setup
      // ========================================
      if (address === '/live/song/get/num_tracks') {
        numTracks = args[0] as number;
        console.log(`Detected ${numTracks} tracks`);

        for (let i = 0; i < Math.min(numTracks, CONFIG.maxTracksToMonitor); i++) {
          send('/live/track/get/name', [i]);
          send('/live/track/get/num_devices', [i]);
          send('/live/track/start_listen/volume', [i]);
          send('/live/track/start_listen/panning', [i]);
        }
      }

      // ========================================
      // Track name response
      // ========================================
      if (address === '/live/track/get/name') {
        const [trackId, name] = args as [number, string];
        trackNameCache.set(trackId, name);
        console.log(`  Track ${trackId}: "${name}"`);
      }

      // ========================================
      // Device count → query device info
      // ========================================
      if (address === '/live/track/get/num_devices') {
        const [trackId, numDevices] = args as [number, number];

        // Remove devices that no longer exist
        for (const [key, device] of devices.entries()) {
          if (device.trackId === trackId && device.deviceId >= numDevices) {
            console.log(`\x1b[33m[DEVICE]\x1b[0m Removed: Track ${trackId} Device ${device.deviceId} "${device.name}"`);
            devices.delete(key);
            clearDeviceCaches(trackId, device.deviceId);
          }
        }

        // Query all devices on this track
        for (let d = 0; d < numDevices; d++) {
          const key = `${trackId}:${d}`;
          pendingDeviceInfo.set(key, {});
          send('/live/device/get/name', [trackId, d]);
          send('/live/device/get/num_parameters', [trackId, d]);
        }
      }

      // ========================================
      // Device name response
      // ========================================
      if (address === '/live/device/get/name') {
        const [trackId, deviceId, name] = args as [number, number, string];
        const key = `${trackId}:${deviceId}`;

        const pending = pendingDeviceInfo.get(key) || {};
        pending.name = name;
        pendingDeviceInfo.set(key, pending);

        // Only log during initial setup
        if (isInitialSetup) {
          console.log(`    Device ${deviceId}: "${name}"`);
        }

        checkAndRegisterDevice(trackId, deviceId, send);
      }

      // ========================================
      // Parameter count response
      // ========================================
      if (address === '/live/device/get/num_parameters') {
        const [trackId, deviceId, numParams] = args as [number, number, number];
        const key = `${trackId}:${deviceId}`;

        const pending = pendingDeviceInfo.get(key) || {};
        pending.numParams = numParams;
        pendingDeviceInfo.set(key, pending);

        checkAndRegisterDevice(trackId, deviceId, send);
      }

      // ========================================
      // Track volume change (listener-based)
      // ========================================
      if (address === '/live/track/get/volume') {
        const [trackId, value] = args as [number, number];
        const db = 20 * Math.log10(value);
        handleParameterChange(trackId, -1, 0, value, `${db.toFixed(1)} dB`);
      }

      // ========================================
      // Track pan change (listener-based)
      // ========================================
      if (address === '/live/track/get/panning') {
        const [trackId, value] = args as [number, number];
        const pan =
          value === 0 ? 'C' : value > 0 ? `${Math.round(value * 50)}R` : `${Math.round(-value * 50)}L`;
        handleParameterChange(trackId, -1, 1, value, pan);
      }
    } catch {
      // Ignore parse errors
    }
  });

  receiver.on('error', (err) => {
    console.error(`Error: ${err.message}`);
    if (err.message.includes('EADDRINUSE')) {
      console.log('\nPort 11001 is in use. Please close Protokol or other OSC listeners.');
    }
    process.exit(1);
  });

  // Start receiving
  receiver.bind(CONFIG.abletonReceivePort, () => {
    console.log(`OSC listening on port ${CONFIG.abletonReceivePort}`);
    console.log('Connecting...\n');

    send('/live/song/get/num_tracks');

    setTimeout(() => {
      console.log('\n────────────────────────────────────────');
      console.log('Ready! Adjust parameters in Ableton Live');
      console.log('Ctrl+C to exit');
      console.log('────────────────────────────────────────\n');
    }, 1500);
  });

  // Graceful shutdown
  async function shutdown() {
    console.log('\n\nShutting down...');

    stopPolling();

    for (const [, pending] of pendingChanges) {
      clearTimeout(pending.timer);
    }

    if (logBuffer.length > 0) {
      console.log(`Flushing ${logBuffer.length} remaining logs...`);
      await flushBuffer();
    }

    console.log('\n────────────────────────────────────────');
    console.log('Session Statistics:');
    console.log(`  Logs queued:  ${stats.logsQueued}`);
    console.log(`  Logs sent:    ${stats.logsSent}`);
    console.log(`  Batches sent: ${stats.batchesSent}`);
    console.log(`  Errors:       ${stats.errors}`);
    console.log(`  Retries:      ${stats.retries}`);
    console.log('────────────────────────────────────────');

    receiver.close();
    sender.close();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);
