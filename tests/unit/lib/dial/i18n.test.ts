import { describe, it, expect } from 'vitest';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys = keys.concat(getAllKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// ─── Key Parity ─────────────────────────────────────────────────────────────

describe('MUEDial i18n key parity', () => {
  const enDialKeys = getAllKeys(enMessages.dial as Record<string, unknown>, 'dial');
  const jaDialKeys = getAllKeys(jaMessages.dial as Record<string, unknown>, 'dial');

  it('en.json and ja.json have the same number of dial keys', () => {
    expect(enDialKeys.length).toBe(jaDialKeys.length);
  });

  it('every EN dial key exists in JA', () => {
    const missingInJa = enDialKeys.filter((k) => !jaDialKeys.includes(k));
    expect(missingInJa).toEqual([]);
  });

  it('every JA dial key exists in EN', () => {
    const missingInEn = jaDialKeys.filter((k) => !enDialKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it('no dial values are empty strings', () => {
    const emptyEn = enDialKeys.filter((k) => {
      const val = getNestedValue(enMessages as Record<string, unknown>, k);
      return typeof val === 'string' && val.trim() === '';
    });
    const emptyJa = jaDialKeys.filter((k) => {
      const val = getNestedValue(jaMessages as Record<string, unknown>, k);
      return typeof val === 'string' && val.trim() === '';
    });
    expect(emptyEn).toEqual([]);
    expect(emptyJa).toEqual([]);
  });

  it('JA translations are not identical to EN (translation actually happened)', () => {
    // At least 80% of keys should differ (some short words like "OK" may match)
    const identical = enDialKeys.filter((k) => {
      const enVal = getNestedValue(enMessages as Record<string, unknown>, k);
      const jaVal = getNestedValue(jaMessages as Record<string, unknown>, k);
      return enVal === jaVal;
    });
    const identicalRatio = identical.length / enDialKeys.length;
    expect(identicalRatio).toBeLessThan(0.2);
  });
});

// ─── Required Sections ──────────────────────────────────────────────────────

describe('MUEDial i18n required sections', () => {
  const requiredSections = ['checkout', 'analyzer', 'dashboard', 'chat', 'session'];

  for (const section of requiredSections) {
    it(`has '${section}' section in EN`, () => {
      expect(enMessages.dial).toHaveProperty(section);
    });

    it(`has '${section}' section in JA`, () => {
      expect(jaMessages.dial).toHaveProperty(section);
    });
  }
});

// ─── Critical UI Keys ───────────────────────────────────────────────────────

describe('MUEDial i18n critical keys', () => {
  const criticalKeys = [
    // Checkout flow
    'dial.checkout.continueToPayment',
    'dial.checkout.total',
    'dial.checkout.omakaseName',
    'dial.checkout.dialogueName',
    'dial.checkout.masteringName',
    // Chat interaction
    'dial.chat.placeholder',
    'dial.chat.send',
    'dial.chat.thinking',
    'dial.chat.generateFinal',
    'dial.chat.generateMixCheck',
    // Session management
    'dial.session.uploadStems',
    'dial.session.generatePreview',
    'dial.session.downloadFinal',
    'dial.session.processing',
    // Dashboard
    'dial.dashboard.newSession',
    'dial.dashboard.noSessionsYet',
  ];

  for (const key of criticalKeys) {
    it(`'${key}' exists in both EN and JA`, () => {
      const enVal = getNestedValue(enMessages as Record<string, unknown>, key);
      const jaVal = getNestedValue(jaMessages as Record<string, unknown>, key);
      expect(enVal).toBeDefined();
      expect(jaVal).toBeDefined();
      expect(typeof enVal).toBe('string');
      expect(typeof jaVal).toBe('string');
    });
  }
});
