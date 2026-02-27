/**
 * DAW Log Musical Interpreter Service - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { DawLog } from '@/db/schema/muednote-daw-logs';
import {
  extractMetadata,
  describeFrequency,
  interpretLog,
  groupByTrack,
  detectPatterns,
  buildMusicalDawContext,
} from '@/lib/services/daw-log-interpreter.service';

// ========================================
// Test Helpers
// ========================================

function makeDawLog(overrides: Partial<DawLog> = {}): DawLog {
  return {
    id: 'test-id',
    userId: 'user-1',
    sessionId: null,
    ts: new Date('2026-02-27T14:00:00Z'),
    daw: 'ableton',
    action: 'parameter_change',
    trackId: 1,
    deviceId: 1,
    paramId: 1,
    value: 0,
    valueString: '',
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ========================================
// extractMetadata
// ========================================

describe('extractMetadata', () => {
  it('extracts track, device, and param names from metadata', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
    });
    const meta = extractMetadata(log);
    expect(meta.trackName).toBe('Vocals');
    expect(meta.deviceName).toBe('Pro-Q 3');
    expect(meta.paramName).toBe('Band 1 Frequency');
  });

  it('returns null for missing metadata', () => {
    const log = makeDawLog({ metadata: null });
    const meta = extractMetadata(log);
    expect(meta.trackName).toBeNull();
    expect(meta.deviceName).toBeNull();
    expect(meta.paramName).toBeNull();
  });

  it('returns null for non-string metadata values', () => {
    const log = makeDawLog({ metadata: { trackName: 123, deviceName: true } });
    const meta = extractMetadata(log);
    expect(meta.trackName).toBeNull();
    expect(meta.deviceName).toBeNull();
  });

  it('returns null for empty string values', () => {
    const log = makeDawLog({ metadata: { trackName: '', deviceName: '' } });
    const meta = extractMetadata(log);
    expect(meta.trackName).toBeNull();
    expect(meta.deviceName).toBeNull();
  });

  it('reads snake_case keys from Hub metadata', () => {
    const log = makeDawLog({
      metadata: { track_name: 'Vocals', device_name: 'Pro-Q 3', param_name: 'Band 1 Frequency' },
    });
    const meta = extractMetadata(log);
    expect(meta.trackName).toBe('Vocals');
    expect(meta.deviceName).toBe('Pro-Q 3');
    expect(meta.paramName).toBe('Band 1 Frequency');
  });

  it('prefers camelCase over snake_case when both present', () => {
    const log = makeDawLog({
      metadata: { trackName: 'CamelVocals', track_name: 'SnakeVocals' },
    });
    const meta = extractMetadata(log);
    expect(meta.trackName).toBe('CamelVocals');
  });
});

// ========================================
// describeFrequency
// ========================================

describe('describeFrequency', () => {
  it('identifies sub bass (<=60Hz)', () => {
    expect(describeFrequency(30)).toBe('Sub Bass');
    expect(describeFrequency(60)).toBe('Sub Bass');
  });

  it('identifies bass (61-150Hz)', () => {
    expect(describeFrequency(100)).toBe('Bass');
    expect(describeFrequency(150)).toBe('Bass');
  });

  it('identifies low mids (151-300Hz)', () => {
    expect(describeFrequency(250)).toBe('Low Mids');
  });

  it('identifies mids (301-600Hz)', () => {
    expect(describeFrequency(500)).toBe('Mids');
  });

  it('identifies upper mids (601-1200Hz)', () => {
    expect(describeFrequency(1000)).toBe('Upper Mids');
  });

  it('identifies presence (1201-2500Hz)', () => {
    expect(describeFrequency(2400)).toBe('Presence');
  });

  it('identifies high presence (2501-5000Hz)', () => {
    expect(describeFrequency(3500)).toBe('High Presence');
  });

  it('identifies brilliance (5001-10000Hz)', () => {
    expect(describeFrequency(8000)).toBe('Brilliance');
  });

  it('identifies air (>10000Hz)', () => {
    expect(describeFrequency(12000)).toBe('Air');
    expect(describeFrequency(20000)).toBe('Air');
  });
});

// ========================================
// interpretLog - EQ
// ========================================

describe('interpretLog - EQ', () => {
  it('interprets EQ frequency with musical band', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
      valueString: '2.40 kHz',
      value: 2400,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('eq');
    expect(result.trackName).toBe('Vocals');
    expect(result.description).toContain('2.4kHz');
    expect(result.description).toContain('Presence');
  });

  it('interprets EQ gain as boost/cut', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Kick', deviceName: 'EQ Eight', paramName: 'Band 2 Gain' },
      valueString: '-4.5 dB',
      value: -4.5,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('eq');
    expect(result.description).toContain('-4.5dB');
    expect(result.description).toContain('cut');
  });

  it('interprets EQ gain boost', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Bass', deviceName: 'Pro-Q 3', paramName: 'Band 1 Gain' },
      valueString: '3.0 dB',
      value: 3.0,
    });
    const result = interpretLog(log);
    expect(result.description).toContain('+3.0dB');
    expect(result.description).toContain('boost');
  });

  it('interprets Q value with bandwidth description', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Q' },
      valueString: '0.30',
      value: 0.3,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('eq');
    expect(result.description).toContain('wide');
  });

  it('identifies EQ by param name even without device name', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Guitar', paramName: 'Band 3 Frequency' },
      valueString: '800 Hz',
      value: 800,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('eq');
  });

  it('identifies surgical Q', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Snare', deviceName: 'Pro-Q 3', paramName: 'Band 2 Q' },
      valueString: '8.00',
      value: 8.0,
    });
    const result = interpretLog(log);
    expect(result.description).toContain('surgical');
  });
});

// ========================================
// interpretLog - Compressor
// ========================================

describe('interpretLog - Compressor', () => {
  it('interprets compressor threshold', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Vocals', deviceName: 'Pro-C 2', paramName: 'Threshold' },
      valueString: '-18.0 dB',
      value: -18.0,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('compressor');
    expect(result.description).toContain('Threshold');
    expect(result.description).toContain('-18.0dB');
    expect(result.description).toContain('moderate');
  });

  it('interprets heavy compression', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Drums', deviceName: 'Compressor', paramName: 'Threshold' },
      valueString: '-25.0 dB',
      value: -25.0,
    });
    const result = interpretLog(log);
    expect(result.description).toContain('heavy');
  });

  it('interprets ratio', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Bass', deviceName: 'Compressor', paramName: 'Ratio' },
      valueString: '4.0',
      value: 4.0,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('compressor');
    expect(result.description).toContain('4.0:1');
    expect(result.description).toContain('moderate');
  });

  it('interprets attack time', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Snare', deviceName: 'Pro-C 2', paramName: 'Attack' },
      valueString: '0.5 ms',
      value: 0.5,
    });
    const result = interpretLog(log);
    expect(result.description).toContain('Attack');
    expect(result.description).toContain('fast');
  });

  it('interprets release time', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Vocals', deviceName: 'Compressor', paramName: 'Release' },
      valueString: '300 ms',
      value: 300,
    });
    const result = interpretLog(log);
    expect(result.description).toContain('Release');
    expect(result.description).toContain('slow');
  });

  it('identifies compressor by device name with Limiter', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Master', deviceName: 'Limiter', paramName: 'Ceiling' },
      valueString: '-0.3 dB',
      value: -0.3,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('compressor');
  });
});

// ========================================
// interpretLog - Volume & Pan
// ========================================

describe('interpretLog - Volume', () => {
  it('interprets track volume', () => {
    const log = makeDawLog({
      action: 'track_volume',
      metadata: { trackName: 'Vocals' },
      valueString: '-6.0 dB',
      value: -6.0,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('volume');
    expect(result.description).toContain('-6.0dB');
  });

  it('fallbacks to trackId when no track name', () => {
    const log = makeDawLog({
      action: 'track_volume',
      trackId: 3,
      valueString: '-3.0 dB',
      value: -3.0,
    });
    const result = interpretLog(log);
    expect(result.trackName).toBe('Track 3');
  });
});

describe('interpretLog - Pan', () => {
  it('interprets center pan', () => {
    const log = makeDawLog({
      action: 'track_pan',
      metadata: { trackName: 'Vocals' },
      valueString: '0',
      value: 0,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('pan');
    expect(result.description).toContain('Center');
  });

  it('interprets left pan', () => {
    const log = makeDawLog({
      action: 'track_pan',
      metadata: { trackName: 'Guitar L' },
      valueString: '-0.50',
      value: -0.5,
    });
    const result = interpretLog(log);
    expect(result.description).toContain('L50');
  });

  it('interprets right pan', () => {
    const log = makeDawLog({
      action: 'track_pan',
      metadata: { trackName: 'Guitar R' },
      valueString: '0.75',
      value: 0.75,
    });
    const result = interpretLog(log);
    expect(result.description).toContain('R75');
  });
});

// ========================================
// interpretLog - Other
// ========================================

describe('interpretLog - Other', () => {
  it('falls back to "other" category for unknown operations', () => {
    const log = makeDawLog({
      metadata: { trackName: 'Synth', deviceName: 'Wavetable', paramName: 'Filter Cutoff' },
      valueString: '1200 Hz',
      value: 1200,
    });
    const result = interpretLog(log);
    expect(result.category).toBe('other');
    expect(result.description).toContain('Wavetable');
    expect(result.description).toContain('1200 Hz');
  });
});

// ========================================
// groupByTrack
// ========================================

describe('groupByTrack', () => {
  it('returns empty array for empty input', () => {
    expect(groupByTrack([])).toEqual([]);
  });

  it('groups operations by track name', () => {
    const logs = [
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:00:00Z') })),
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:01:00Z') })),
      interpretLog(makeDawLog({ metadata: { trackName: 'Bass' }, ts: new Date('2026-02-27T14:00:30Z') })),
    ];
    const result = groupByTrack(logs);
    expect(result).toHaveLength(2);
    const trackNames = result.map(a => a.trackName);
    expect(trackNames).toContain('Vocals');
    expect(trackNames).toContain('Bass');
  });

  it('splits track activity by 3-minute gap', () => {
    const logs = [
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:00:00Z') })),
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:01:00Z') })),
      // 5-minute gap
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:06:00Z') })),
    ];
    const result = groupByTrack(logs);
    const vocalActivities = result.filter(a => a.trackName === 'Vocals');
    expect(vocalActivities).toHaveLength(2);
    expect(vocalActivities[0].totalOps).toBe(2);
    expect(vocalActivities[1].totalOps).toBe(1);
  });

  it('does not split within 3-minute window', () => {
    const logs = [
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:00:00Z') })),
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:02:59Z') })),
    ];
    const result = groupByTrack(logs);
    const vocalActivities = result.filter(a => a.trackName === 'Vocals');
    expect(vocalActivities).toHaveLength(1);
    expect(vocalActivities[0].totalOps).toBe(2);
  });

  it('sorts by operation count descending', () => {
    const logs = [
      interpretLog(makeDawLog({ metadata: { trackName: 'Bass' }, ts: new Date('2026-02-27T14:00:00Z') })),
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:00:00Z') })),
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:01:00Z') })),
      interpretLog(makeDawLog({ metadata: { trackName: 'Vocals' }, ts: new Date('2026-02-27T14:02:00Z') })),
    ];
    const result = groupByTrack(logs);
    expect(result[0].trackName).toBe('Vocals');
    expect(result[0].totalOps).toBe(3);
  });

  it('collects unique device names', () => {
    const logs = [
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3' },
        ts: new Date('2026-02-27T14:00:00Z'),
      })),
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-C 2' },
        ts: new Date('2026-02-27T14:01:00Z'),
      })),
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3' },
        ts: new Date('2026-02-27T14:02:00Z'),
      })),
    ];
    const result = groupByTrack(logs);
    expect(result[0].devices).toHaveLength(2);
    expect(result[0].devices).toContain('Pro-Q 3');
    expect(result[0].devices).toContain('Pro-C 2');
  });
});

// ========================================
// detectPatterns
// ========================================

describe('detectPatterns', () => {
  it('returns empty for empty input', () => {
    expect(detectPatterns([])).toEqual([]);
  });

  it('detects eq_retry when same band EQ revisited after 10+ minutes', () => {
    const logs = [
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
        ts: new Date('2026-02-27T14:00:00Z'),
        valueString: '2.40 kHz',
      })),
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
        ts: new Date('2026-02-27T14:15:00Z'),
        valueString: '2.20 kHz',
      })),
    ];
    const activities = groupByTrack(logs);
    const patterns = detectPatterns(activities);
    expect(patterns.some(p => p.type === 'eq_retry')).toBe(true);
  });

  it('does not detect eq_retry within 10 minutes', () => {
    const logs = [
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
        ts: new Date('2026-02-27T14:00:00Z'),
        valueString: '2.40 kHz',
      })),
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
        ts: new Date('2026-02-27T14:05:00Z'),
        valueString: '2.20 kHz',
      })),
    ];
    const activities = groupByTrack(logs);
    const patterns = detectPatterns(activities);
    expect(patterns.some(p => p.type === 'eq_retry')).toBe(false);
  });

  it('detects post_comp_eq when EQ adjusted after compressor', () => {
    const logs = [
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Compressor', paramName: 'Threshold' },
        ts: new Date('2026-02-27T14:00:00Z'),
        valueString: '-18.0 dB',
      })),
      interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Gain' },
        ts: new Date('2026-02-27T14:01:00Z'),
        valueString: '-3.0 dB',
      })),
    ];
    const activities = groupByTrack(logs);
    const patterns = detectPatterns(activities);
    expect(patterns.some(p => p.type === 'post_comp_eq')).toBe(true);
  });

  it('detects concentrated activity', () => {
    const logs: ReturnType<typeof interpretLog>[] = [];
    // 8 ops on Vocals
    for (let i = 0; i < 8; i++) {
      logs.push(interpretLog(makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
        ts: new Date(`2026-02-27T14:${String(i).padStart(2, '0')}:00Z`),
        valueString: '2.40 kHz',
      })));
    }
    // 2 ops on Bass
    for (let i = 0; i < 2; i++) {
      logs.push(interpretLog(makeDawLog({
        metadata: { trackName: 'Bass' },
        ts: new Date(`2026-02-27T14:${String(i).padStart(2, '0')}:00Z`),
        valueString: '100 Hz',
      })));
    }
    const activities = groupByTrack(logs);
    const patterns = detectPatterns(activities);
    expect(patterns.some(p => p.type === 'concentrated')).toBe(true);
  });

  it('detects volume_hunting with 5+ volume changes', () => {
    const logs: ReturnType<typeof interpretLog>[] = [];
    for (let i = 0; i < 6; i++) {
      logs.push(interpretLog(makeDawLog({
        action: 'track_volume',
        metadata: { trackName: 'Vocals' },
        ts: new Date(`2026-02-27T14:${String(i).padStart(2, '0')}:00Z`),
        valueString: `${-6 + i} dB`,
        value: -6 + i,
      })));
    }
    const activities = groupByTrack(logs);
    const patterns = detectPatterns(activities);
    expect(patterns.some(p => p.type === 'volume_hunting')).toBe(true);
  });

  it('does not detect volume_hunting with fewer than 5 changes', () => {
    const logs: ReturnType<typeof interpretLog>[] = [];
    for (let i = 0; i < 4; i++) {
      logs.push(interpretLog(makeDawLog({
        action: 'track_volume',
        metadata: { trackName: 'Vocals' },
        ts: new Date(`2026-02-27T14:${String(i).padStart(2, '0')}:00Z`),
        valueString: `${-6 + i} dB`,
        value: -6 + i,
      })));
    }
    const activities = groupByTrack(logs);
    const patterns = detectPatterns(activities);
    expect(patterns.some(p => p.type === 'volume_hunting')).toBe(false);
  });
});

// ========================================
// buildMusicalDawContext (Integration)
// ========================================

describe('buildMusicalDawContext', () => {
  it('returns null for empty logs', () => {
    expect(buildMusicalDawContext([])).toBeNull();
  });

  it('generates musical summary from EQ logs', () => {
    const logs: DawLog[] = [
      makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
        ts: new Date('2026-02-27T14:00:00Z'),
        valueString: '2.40 kHz',
        value: 2400,
      }),
      makeDawLog({
        metadata: { trackName: 'Vocals', deviceName: 'Pro-Q 3', paramName: 'Band 1 Gain' },
        ts: new Date('2026-02-27T14:00:05Z'),
        valueString: '-4.5 dB',
        value: -4.5,
      }),
    ];
    const result = buildMusicalDawContext(logs);
    expect(result).not.toBeNull();
    expect(result).toContain('DAW Activity');
    expect(result).toContain('Ableton Live');
    expect(result).toContain('EQ: 2');
    expect(result).toContain('Vocals');
    expect(result).toContain('Presence');
  });

  it('includes detected patterns in output', () => {
    const logs: DawLog[] = [];
    // 6 volume changes -> volume_hunting
    for (let i = 0; i < 6; i++) {
      logs.push(makeDawLog({
        action: 'track_volume',
        metadata: { trackName: 'Vocals' },
        ts: new Date(`2026-02-27T14:${String(i).padStart(2, '0')}:00Z`),
        valueString: `${-6 + i} dB`,
        value: -6 + i,
      }));
    }
    const result = buildMusicalDawContext(logs);
    expect(result).toContain('Detected Patterns');
    expect(result).toContain('volume');
  });

  it('includes track activity section', () => {
    const logs: DawLog[] = [
      makeDawLog({
        metadata: { trackName: 'Kick', deviceName: 'EQ Eight', paramName: 'Band 1 Frequency' },
        ts: new Date('2026-02-27T14:00:00Z'),
        valueString: '80 Hz',
        value: 80,
      }),
      makeDawLog({
        metadata: { trackName: 'Snare', deviceName: 'Compressor', paramName: 'Threshold' },
        ts: new Date('2026-02-27T14:01:00Z'),
        valueString: '-15.0 dB',
        value: -15.0,
      }),
    ];
    const result = buildMusicalDawContext(logs);
    expect(result).toContain('Track Activity');
    expect(result).toContain('Recent Operations');
  });

  it('handles mixed operation types', () => {
    const logs: DawLog[] = [
      makeDawLog({
        action: 'track_volume',
        metadata: { trackName: 'Vocals' },
        ts: new Date('2026-02-27T14:00:00Z'),
        valueString: '-6.0 dB',
        value: -6.0,
      }),
      makeDawLog({
        action: 'track_pan',
        metadata: { trackName: 'Guitar L' },
        ts: new Date('2026-02-27T14:00:30Z'),
        valueString: '-0.50',
        value: -0.5,
      }),
      makeDawLog({
        metadata: { trackName: 'Kick', deviceName: 'Pro-Q 3', paramName: 'Band 1 Frequency' },
        ts: new Date('2026-02-27T14:01:00Z'),
        valueString: '80 Hz',
        value: 80,
      }),
    ];
    const result = buildMusicalDawContext(logs);
    expect(result).toContain('Volume: 1');
    expect(result).toContain('Pan: 1');
    expect(result).toContain('EQ: 1');
  });
});
