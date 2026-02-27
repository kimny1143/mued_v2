/**
 * DAW Log Musical Interpreter Service
 *
 * Translates raw DAW parameter logs into musically meaningful descriptions.
 * Used by Hoo AI to understand what the user is doing in their DAW session.
 *
 * Pipeline: raw logs -> interpretLog -> groupByTrack -> detectPatterns -> buildMusicalDawContext
 */

import type { DawLog, DawAction } from '@/db/schema/muednote-daw-logs';

// ========================================
// Types
// ========================================

export interface LogMetadata {
  trackName: string | null;
  deviceName: string | null;
  paramName: string | null;
}

export interface InterpretedLog {
  log: DawLog;
  trackName: string;
  description: string;
  category: 'eq' | 'compressor' | 'volume' | 'pan' | 'other';
}

export interface TrackActivity {
  trackName: string;
  timeRange: { start: Date; end: Date };
  operations: InterpretedLog[];
  totalOps: number;
  devices: string[];
}

export interface DetectedPattern {
  type: 'eq_retry' | 'post_comp_eq' | 'concentrated' | 'volume_hunting';
  description: string;
}

// ========================================
// Constants (moved from route.ts)
// ========================================

export const ACTION_LABELS: Record<DawAction, string> = {
  parameter_change: 'Parameter Change',
  track_volume: 'Track Volume',
  track_pan: 'Track Pan',
  track_select: 'Track Select',
  clip_trigger: 'Clip Trigger',
  device_config_change: 'Device Config Change',
};

export const DAW_LABELS: Record<string, string> = {
  ableton: 'Ableton Live',
  protools: 'Pro Tools',
  logic: 'Logic Pro',
  other: 'DAW',
};

// ========================================
// 1. Metadata Extraction
// ========================================

/**
 * Extract track name, device name, and parameter name from log metadata.
 * Supports both camelCase (trackName) and snake_case (track_name) keys
 * since Hub sends snake_case while some test data may use camelCase.
 */
export function extractMetadata(log: DawLog): LogMetadata {
  const meta = log.metadata as Record<string, unknown> | null;
  if (!meta) return { trackName: null, deviceName: null, paramName: null };

  const getString = (camel: string, snake: string): string | null => {
    const val = meta[camel] ?? meta[snake];
    return (typeof val === 'string' && val) ? val : null;
  };

  return {
    trackName: getString('trackName', 'track_name'),
    deviceName: getString('deviceName', 'device_name'),
    paramName: getString('paramName', 'param_name'),
  };
}

// ========================================
// 2. Frequency Description
// ========================================

const FREQUENCY_BANDS: { max: number; label: string }[] = [
  { max: 60, label: 'Sub Bass' },
  { max: 150, label: 'Bass' },
  { max: 300, label: 'Low Mids' },
  { max: 600, label: 'Mids' },
  { max: 1200, label: 'Upper Mids' },
  { max: 2500, label: 'Presence' },
  { max: 5000, label: 'High Presence' },
  { max: 10000, label: 'Brilliance' },
  { max: Infinity, label: 'Air' },
];

/**
 * Convert a frequency in Hz to a musical description.
 */
export function describeFrequency(hz: number): string {
  for (const band of FREQUENCY_BANDS) {
    if (hz <= band.max) return band.label;
  }
  return 'Air';
}

/**
 * Format Hz value for display.
 */
function formatHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)}kHz`;
  return `${Math.round(hz)}Hz`;
}

// ========================================
// 3. Log Interpretation (Core)
// ========================================

const EQ_DEVICE_PATTERN = /eq|pro-q|q3|equaliz/i;
const EQ_PARAM_PATTERN = /band|freq|gain|q\b/i;
const COMP_DEVICE_PATTERN = /compress|comp|pro-c|limiter|dynamics/i;
const COMP_PARAM_PATTERN = /thresh|ratio|attack|release|knee|makeup/i;

/**
 * Detect if a log is an EQ operation based on device/param names.
 */
function isEqOperation(deviceName: string | null, paramName: string | null): boolean {
  if (deviceName && EQ_DEVICE_PATTERN.test(deviceName)) return true;
  if (paramName && EQ_PARAM_PATTERN.test(paramName)) return true;
  return false;
}

/**
 * Detect if a log is a compressor operation.
 */
function isCompressorOperation(deviceName: string | null, paramName: string | null): boolean {
  if (deviceName && COMP_DEVICE_PATTERN.test(deviceName)) return true;
  if (paramName && COMP_PARAM_PATTERN.test(paramName)) return true;
  return false;
}

/**
 * Parse a numeric value from valueString (e.g., "2.40 kHz" -> 2400, "-4.5 dB" -> -4.5).
 */
function parseNumericValue(valueString: string): number | null {
  // Try kHz first
  const khzMatch = valueString.match(/([-+]?\d+\.?\d*)\s*kHz/i);
  if (khzMatch) return parseFloat(khzMatch[1]) * 1000;

  // Try Hz
  const hzMatch = valueString.match(/([-+]?\d+\.?\d*)\s*Hz/i);
  if (hzMatch) return parseFloat(hzMatch[1]);

  // Try dB
  const dbMatch = valueString.match(/([-+]?\d+\.?\d*)\s*dB/i);
  if (dbMatch) return parseFloat(dbMatch[1]);

  // Try ms
  const msMatch = valueString.match(/([-+]?\d+\.?\d*)\s*ms/i);
  if (msMatch) return parseFloat(msMatch[1]);

  // Try plain number
  const numMatch = valueString.match(/([-+]?\d+\.?\d*)/);
  if (numMatch) return parseFloat(numMatch[1]);

  return null;
}

/**
 * Interpret an EQ log into a musical description.
 */
function interpretEq(meta: LogMetadata, valueString: string): string {
  const paramLower = (meta.paramName || '').toLowerCase();

  // Frequency parameter
  if (paramLower.includes('freq')) {
    const hz = parseNumericValue(valueString);
    if (hz !== null && hz > 0) {
      return `${formatHz(hz)} (${describeFrequency(hz)})`;
    }
    return valueString;
  }

  // Gain parameter
  if (paramLower.includes('gain')) {
    const db = parseNumericValue(valueString);
    if (db !== null) {
      const direction = db > 0 ? 'boost' : db < 0 ? 'cut' : 'flat';
      return `${db > 0 ? '+' : ''}${db.toFixed(1)}dB ${direction}`;
    }
    return valueString;
  }

  // Q parameter
  if (/^q\b/i.test(paramLower) || paramLower.includes(' q')) {
    const q = parseNumericValue(valueString);
    if (q !== null) {
      const width = q < 0.5 ? 'wide' : q < 2 ? 'moderate' : q < 4 ? 'narrow' : 'surgical';
      return `Q=${q.toFixed(2)} (${width})`;
    }
    return valueString;
  }

  return valueString;
}

/**
 * Interpret a compressor log.
 */
function interpretCompressor(meta: LogMetadata, valueString: string): string {
  const paramLower = (meta.paramName || '').toLowerCase();

  if (paramLower.includes('thresh')) {
    const db = parseNumericValue(valueString);
    if (db !== null) {
      const intensity = db > -10 ? 'light' : db > -20 ? 'moderate' : 'heavy';
      return `Threshold ${db.toFixed(1)}dB (${intensity} compression)`;
    }
  }

  if (paramLower.includes('ratio')) {
    const ratio = parseNumericValue(valueString);
    if (ratio !== null) {
      const type = ratio < 3 ? 'gentle' : ratio < 8 ? 'moderate' : ratio < 20 ? 'aggressive' : 'limiting';
      return `Ratio ${ratio.toFixed(1)}:1 (${type})`;
    }
  }

  if (paramLower.includes('attack')) {
    const ms = parseNumericValue(valueString);
    if (ms !== null) {
      const speed = ms < 1 ? 'fast' : ms < 10 ? 'medium' : 'slow';
      return `Attack ${ms.toFixed(1)}ms (${speed})`;
    }
  }

  if (paramLower.includes('release')) {
    const ms = parseNumericValue(valueString);
    if (ms !== null) {
      const speed = ms < 50 ? 'fast' : ms < 200 ? 'medium' : 'slow';
      return `Release ${ms.toFixed(0)}ms (${speed})`;
    }
  }

  return valueString;
}

/**
 * Interpret a single DAW log into a musically meaningful description.
 */
export function interpretLog(log: DawLog): InterpretedLog {
  const meta = extractMetadata(log);
  const trackName = meta.trackName || `Track ${log.trackId}`;
  const deviceName = meta.deviceName;
  const paramName = meta.paramName;

  // Volume
  if (log.action === 'track_volume') {
    const db = parseNumericValue(log.valueString);
    const desc = db !== null ? `Volume -> ${db.toFixed(1)}dB` : `Volume -> ${log.valueString}`;
    return { log, trackName, description: desc, category: 'volume' };
  }

  // Pan
  if (log.action === 'track_pan') {
    const val = log.value;
    const panDesc = val === 0 ? 'Center' : val < 0 ? `L${Math.abs(Math.round(val * 100))}` : `R${Math.round(val * 100)}`;
    return { log, trackName, description: `Pan -> ${panDesc}`, category: 'pan' };
  }

  // EQ
  if (isEqOperation(deviceName, paramName)) {
    const desc = interpretEq(meta, log.valueString);
    const device = deviceName ? `[${deviceName}] ` : '';
    return { log, trackName, description: `${device}${desc}`, category: 'eq' };
  }

  // Compressor
  if (isCompressorOperation(deviceName, paramName)) {
    const desc = interpretCompressor(meta, log.valueString);
    const device = deviceName ? `[${deviceName}] ` : '';
    return { log, trackName, description: `${device}${desc}`, category: 'compressor' };
  }

  // Other
  const device = deviceName ? `[${deviceName}] ` : '';
  const param = paramName ? `${paramName}: ` : '';
  return {
    log,
    trackName,
    description: `${device}${param}${log.valueString}`,
    category: 'other',
  };
}

// ========================================
// 4. Track x Time Grouping
// ========================================

const GROUP_GAP_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Group interpreted logs by track name, splitting groups when there's a gap > 3 minutes.
 * Results are sorted by operation count (descending).
 */
export function groupByTrack(logs: InterpretedLog[]): TrackActivity[] {
  if (logs.length === 0) return [];

  // Sort by timestamp ascending
  const sorted = [...logs].sort((a, b) => a.log.ts.getTime() - b.log.ts.getTime());

  // Group by track, then split by time gaps
  const trackMap = new Map<string, InterpretedLog[][]>();

  for (const log of sorted) {
    if (!trackMap.has(log.trackName)) {
      trackMap.set(log.trackName, [[log]]);
      continue;
    }

    const groups = trackMap.get(log.trackName)!;
    const lastGroup = groups[groups.length - 1];
    const lastLog = lastGroup[lastGroup.length - 1];

    if (log.log.ts.getTime() - lastLog.log.ts.getTime() > GROUP_GAP_MS) {
      groups.push([log]);
    } else {
      lastGroup.push(log);
    }
  }

  // Convert to TrackActivity
  const activities: TrackActivity[] = [];
  for (const [trackName, groups] of trackMap) {
    for (const group of groups) {
      const deviceSet = new Set<string>();
      for (const op of group) {
        const meta = extractMetadata(op.log);
        if (meta.deviceName) deviceSet.add(meta.deviceName);
      }

      activities.push({
        trackName,
        timeRange: {
          start: group[0].log.ts,
          end: group[group.length - 1].log.ts,
        },
        operations: group,
        totalOps: group.length,
        devices: [...deviceSet],
      });
    }
  }

  // Sort by operation count descending
  activities.sort((a, b) => b.totalOps - a.totalOps);

  return activities;
}

// ========================================
// 5. Pattern Detection
// ========================================

/**
 * Detect behavioral patterns from track activities.
 */
export function detectPatterns(activities: TrackActivity[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const allOps = activities.flatMap(a => a.operations);
  const totalOps = allOps.length;

  if (totalOps === 0) return patterns;

  // --- eq_retry: same band EQ adjusted again after 10+ minutes ---
  const eqOps = allOps.filter(o => o.category === 'eq');
  const eqByTrackAndParam = new Map<string, InterpretedLog[]>();
  for (const op of eqOps) {
    const meta = extractMetadata(op.log);
    const key = `${op.trackName}::${meta.paramName || 'unknown'}`;
    if (!eqByTrackAndParam.has(key)) eqByTrackAndParam.set(key, []);
    eqByTrackAndParam.get(key)!.push(op);
  }
  for (const [key, ops] of eqByTrackAndParam) {
    if (ops.length < 2) continue;
    const sorted = [...ops].sort((a, b) => a.log.ts.getTime() - b.log.ts.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gapMs = sorted[i].log.ts.getTime() - sorted[i - 1].log.ts.getTime();
      if (gapMs >= 10 * 60 * 1000) {
        const [trackName] = key.split('::');
        patterns.push({
          type: 'eq_retry',
          description: `Revisited EQ on "${trackName}" after ${Math.round(gapMs / 60000)} min`,
        });
        break; // One detection per track+param is enough
      }
    }
  }

  // --- post_comp_eq: EQ changes on same track after compressor changes ---
  for (const activity of activities) {
    const compOps = activity.operations.filter(o => o.category === 'compressor');
    const eqOpsInTrack = activity.operations.filter(o => o.category === 'eq');
    if (compOps.length === 0 || eqOpsInTrack.length === 0) continue;

    const lastCompTs = Math.max(...compOps.map(o => o.log.ts.getTime()));
    const eqAfterComp = eqOpsInTrack.filter(o => o.log.ts.getTime() > lastCompTs);
    if (eqAfterComp.length > 0) {
      patterns.push({
        type: 'post_comp_eq',
        description: `Adjusted EQ on "${activity.trackName}" after compressor changes`,
      });
    }
  }

  // --- concentrated: one track has 60%+ of all operations ---
  for (const activity of activities) {
    if (activity.totalOps / totalOps >= 0.6) {
      patterns.push({
        type: 'concentrated',
        description: `Focused ${Math.round(activity.totalOps / totalOps * 100)}% of work on "${activity.trackName}"`,
      });
    }
  }

  // --- volume_hunting: same track volume changed 5+ times ---
  const volumeByTrack = new Map<string, number>();
  for (const op of allOps) {
    if (op.category === 'volume') {
      volumeByTrack.set(op.trackName, (volumeByTrack.get(op.trackName) || 0) + 1);
    }
  }
  for (const [track, count] of volumeByTrack) {
    if (count >= 5) {
      patterns.push({
        type: 'volume_hunting',
        description: `Adjusted volume on "${track}" ${count} times (searching for the right level)`,
      });
    }
  }

  return patterns;
}

// ========================================
// 6. Summary Generation (Entry Point)
// ========================================

/**
 * Build a musically meaningful DAW context string from raw logs.
 * Returns null if no logs provided.
 */
export function buildMusicalDawContext(logs: DawLog[]): string | null {
  if (logs.length === 0) return null;

  // Sort ascending by timestamp
  const sorted = [...logs].sort((a, b) => a.ts.getTime() - b.ts.getTime());

  // Determine primary DAW
  const dawCounts: Record<string, number> = {};
  for (const log of sorted) {
    const daw = log.daw || 'other';
    dawCounts[daw] = (dawCounts[daw] || 0) + 1;
  }
  const primaryDaw = Object.entries(dawCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Interpret all logs
  const interpreted = sorted.map(interpretLog);

  // Group by track
  const activities = groupByTrack(interpreted);

  // Detect patterns
  const patterns = detectPatterns(activities);

  // Category counts
  const categoryCounts = { eq: 0, compressor: 0, volume: 0, pan: 0, other: 0 };
  for (const i of interpreted) {
    categoryCounts[i.category]++;
  }

  // Build summary
  const formatTime = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  let summary = `## DAW Activity (Musical Analysis)\n\n`;
  summary += `- **DAW**: ${DAW_LABELS[primaryDaw] || primaryDaw}\n`;
  summary += `- **Total operations**: ${sorted.length}\n`;
  summary += `- **Period**: ${sorted[0].ts.toISOString().slice(0, 10)} to ${sorted[sorted.length - 1].ts.toISOString().slice(0, 10)}\n`;

  // Category breakdown
  const categoryParts: string[] = [];
  if (categoryCounts.eq > 0) categoryParts.push(`EQ: ${categoryCounts.eq}`);
  if (categoryCounts.compressor > 0) categoryParts.push(`Compressor: ${categoryCounts.compressor}`);
  if (categoryCounts.volume > 0) categoryParts.push(`Volume: ${categoryCounts.volume}`);
  if (categoryCounts.pan > 0) categoryParts.push(`Pan: ${categoryCounts.pan}`);
  if (categoryCounts.other > 0) categoryParts.push(`Other: ${categoryCounts.other}`);
  summary += `- **Breakdown**: ${categoryParts.join(', ')}\n`;

  // Patterns
  if (patterns.length > 0) {
    summary += `\n### Detected Patterns\n`;
    for (const p of patterns) {
      summary += `- ${p.description}\n`;
    }
  }

  // Track activities (top 5)
  summary += `\n### Track Activity\n`;
  const topActivities = activities.slice(0, 5);
  for (const activity of topActivities) {
    const timeStr = `${formatTime(activity.timeRange.start)}-${formatTime(activity.timeRange.end)}`;
    const devicesStr = activity.devices.length > 0 ? ` [${activity.devices.join(', ')}]` : '';
    summary += `- **${activity.trackName}** (${activity.totalOps} ops, ${timeStr})${devicesStr}\n`;

    // Show up to 5 recent operations per track
    const recentOps = activity.operations.slice(-5);
    for (const op of recentOps) {
      summary += `  - ${formatTime(op.log.ts)} ${op.description}\n`;
    }
  }

  // Recent operations (last 10, not already shown)
  const recentLogs = interpreted.slice(-10).reverse();
  if (recentLogs.length > 0) {
    summary += `\n### Recent Operations\n`;
    for (const op of recentLogs) {
      const dateTime = `${op.log.ts.toISOString().slice(0, 10)} ${formatTime(op.log.ts)}`;
      summary += `- ${dateTime} | ${op.trackName} | ${op.description}\n`;
    }
  }

  return summary;
}
