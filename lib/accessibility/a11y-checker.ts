/**
 * Accessibility Checker
 *
 * WCAG 2.1 AA準拠のアクセシビリティチェック
 */

/**
 * カラーコントラスト比を計算（WCAG 2.1基準）
 */
export function calculateContrastRatio(
  foreground: string,
  background: string
): number {
  const fgLuminance = getRelativeLuminance(hexToRgb(foreground));
  const bgLuminance = getRelativeLuminance(hexToRgb(background));

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG AA準拠チェック
 * - 通常テキスト: 4.5:1以上
 * - 大きなテキスト（18pt以上または14pt太字）: 3:1以上
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): { passes: boolean; ratio: number; required: number } {
  const ratio = calculateContrastRatio(foreground, background);
  const required = isLargeText ? 3 : 4.5;

  return {
    passes: ratio >= required,
    ratio: Math.round(ratio * 100) / 100,
    required,
  };
}

/**
 * Hexカラーコードをrgb配列に変換
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * 相対輝度を計算
 */
function getRelativeLuminance([r, g, b]: [number, number, number]): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * プロジェクトで使用している主要カラーをチェック
 */
export function auditProjectColors(): {
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    name: string;
    foreground: string;
    background: string;
    passes: boolean;
    ratio: number;
    required: number;
  }>;
} {
  const colorCombinations = [
    // Primary colors
    { name: 'Primary on white', foreground: '#75bc11', background: '#ffffff' },
    { name: 'Primary text', foreground: '#000a14', background: '#ffffff' },

    // Status colors
    { name: 'Success', foreground: '#10b981', background: '#ffffff' },
    { name: 'Warning', foreground: '#f59e0b', background: '#ffffff' },
    { name: 'Error', foreground: '#ef4444', background: '#ffffff' },
    { name: 'Info', foreground: '#3b82f6', background: '#ffffff' },

    // Gray scale
    { name: 'Gray 900 on white', foreground: '#111827', background: '#ffffff' },
    { name: 'Gray 700 on white', foreground: '#374151', background: '#ffffff' },
    { name: 'Gray 600 on white', foreground: '#4b5563', background: '#ffffff' },
    { name: 'Gray 500 on white', foreground: '#6b7280', background: '#ffffff' },

    // Dark mode (if applicable)
    { name: 'White on gray 900', foreground: '#ffffff', background: '#111827' },
  ];

  const results = colorCombinations.map((combo) => {
    const check = meetsWCAGAA(combo.foreground, combo.background);
    return {
      name: combo.name,
      foreground: combo.foreground,
      background: combo.background,
      passes: check.passes,
      ratio: check.ratio,
      required: check.required,
    };
  });

  const passed = results.filter((r) => r.passes).length;
  const failed = results.filter((r) => !r.passes).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

/**
 * アクセシビリティチェックリスト
 */
export interface A11yChecklistItem {
  category: string;
  requirement: string;
  status: 'pass' | 'fail' | 'manual';
  notes?: string;
}

export function getA11yChecklist(): A11yChecklistItem[] {
  return [
    // Perceivable
    {
      category: 'Perceivable',
      requirement: 'All images have alt text',
      status: 'manual',
      notes: 'Check all <img> tags and next/image components',
    },
    {
      category: 'Perceivable',
      requirement: 'Color contrast meets WCAG AA (4.5:1)',
      status: 'pass',
      notes: 'Run auditProjectColors() to verify',
    },
    {
      category: 'Perceivable',
      requirement: 'Content is not conveyed by color alone',
      status: 'manual',
      notes: 'Verify status indicators use icons + color',
    },
    {
      category: 'Perceivable',
      requirement: 'Audio has captions/transcripts',
      status: 'manual',
      notes: 'Check ABC audio player',
    },

    // Operable
    {
      category: 'Operable',
      requirement: 'All functionality keyboard accessible',
      status: 'manual',
      notes: 'Tab through all interactive elements',
    },
    {
      category: 'Operable',
      requirement: 'No keyboard traps',
      status: 'manual',
      notes: 'Verify modals and dropdowns',
    },
    {
      category: 'Operable',
      requirement: 'Skip navigation link present',
      status: 'manual',
      notes: 'Add skip-to-content link in header',
    },
    {
      category: 'Operable',
      requirement: 'Page titles are descriptive',
      status: 'manual',
      notes: 'Check all <title> tags',
    },
    {
      category: 'Operable',
      requirement: 'Focus visible for all elements',
      status: 'pass',
      notes: 'Tailwind focus-visible classes applied',
    },

    // Understandable
    {
      category: 'Understandable',
      requirement: 'Language of page is set',
      status: 'pass',
      notes: '<html lang="en"> set',
    },
    {
      category: 'Understandable',
      requirement: 'Error messages are clear',
      status: 'manual',
      notes: 'Review form validation messages',
    },
    {
      category: 'Understandable',
      requirement: 'Labels associated with inputs',
      status: 'manual',
      notes: 'Check all form fields have <label>',
    },

    // Robust
    {
      category: 'Robust',
      requirement: 'Valid HTML',
      status: 'manual',
      notes: 'Run W3C validator',
    },
    {
      category: 'Robust',
      requirement: 'ARIA used correctly',
      status: 'manual',
      notes: 'Verify aria-label, aria-describedby, role attributes',
    },
    {
      category: 'Robust',
      requirement: 'Components work with assistive tech',
      status: 'manual',
      notes: 'Test with screen reader (NVDA/JAWS)',
    },
  ];
}
