import { describe, it, expect } from 'vitest';
import {
  extractAbcBlocks,
  extractAbcMetadata,
  hasRequiredHeaders,
  formatAbc,
  extractTitle,
} from '@/lib/abc-validator';

const SIMPLE_ABC = `X:1
T:Simple Scale
M:4/4
L:1/8
Q:1/4=120
K:C
CDEFGABC|`;

// ─── extractAbcBlocks ─────────────────────────────────────────────────────────

describe('extractAbcBlocks', () => {
  it('extracts a single abc block from markdown', () => {
    const content = `Here is a scale:\n\`\`\`abc\n${SIMPLE_ABC}\n\`\`\`\n`;
    const blocks = extractAbcBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe('abc_1');
    expect(blocks[0].title).toBe('Simple Scale');
    expect(blocks[0].abc).toContain('CDEFGABC');
  });

  it('extracts multiple abc blocks', () => {
    const content = `
\`\`\`abc
X:1
T:First
M:4/4
L:1/8
K:C
CDEF|
\`\`\`
Some text
\`\`\`abc
X:2
T:Second
M:3/4
L:1/8
K:G
GAB|
\`\`\`
`;
    const blocks = extractAbcBlocks(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].title).toBe('First');
    expect(blocks[1].title).toBe('Second');
    expect(blocks[1].id).toBe('abc_2');
  });

  it('uses default title when T: is missing', () => {
    const content = `\`\`\`abc\nX:1\nK:C\nCDEF|\n\`\`\``;
    const blocks = extractAbcBlocks(content);
    expect(blocks[0].title).toBe('楽譜 1');
  });

  it('returns empty array for content with no abc blocks', () => {
    expect(extractAbcBlocks('just some markdown text')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractAbcBlocks('')).toEqual([]);
  });
});

// ─── extractAbcMetadata ──────────────────────────────────────────────────────

describe('extractAbcMetadata', () => {
  it('extracts all standard fields', () => {
    const meta = extractAbcMetadata(SIMPLE_ABC);
    expect(meta.title).toBe('Simple Scale');
    expect(meta.meter).toBe('4/4');
    expect(meta.tempo).toBe(120);
    expect(meta.key).toBe('C');
    expect(meta.length).toBe('1/8');
  });

  it('extracts composer when present', () => {
    const abc = 'T:Sonata\nC:Bach\nK:G';
    const meta = extractAbcMetadata(abc);
    expect(meta.composer).toBe('Bach');
  });

  it('returns empty object for empty string', () => {
    const meta = extractAbcMetadata('');
    expect(meta).toEqual({});
  });

  it('handles missing fields gracefully', () => {
    const meta = extractAbcMetadata('X:1\nK:C');
    expect(meta.title).toBeUndefined();
    expect(meta.meter).toBeUndefined();
    expect(meta.key).toBe('C');
  });

  it('parses tempo from Q: fraction format', () => {
    const meta = extractAbcMetadata('Q:1/4=90');
    expect(meta.tempo).toBe(90);
  });

  it('returns undefined tempo for non-matching Q: format', () => {
    // Q: without the fraction=number form
    const meta = extractAbcMetadata('Q:Allegro');
    expect(meta.tempo).toBeUndefined();
  });
});

// ─── hasRequiredHeaders ──────────────────────────────────────────────────────

describe('hasRequiredHeaders', () => {
  it('returns valid for abc with all required headers', () => {
    const result = hasRequiredHeaders(SIMPLE_ABC);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('reports missing headers', () => {
    const abc = 'X:1\nT:Title\nK:C'; // missing M, L
    const result = hasRequiredHeaders(abc);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('M');
    expect(result.missing).toContain('L');
  });

  it('reports all missing for empty string', () => {
    const result = hasRequiredHeaders('');
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(5);
  });

  it('returns valid = false for only partially complete headers', () => {
    const result = hasRequiredHeaders('X:1\nT:Test');
    expect(result.valid).toBe(false);
  });
});

// ─── formatAbc ───────────────────────────────────────────────────────────────

describe('formatAbc', () => {
  it('trims whitespace from header lines', () => {
    const abc = '  X:1  \n  T:Title  \n  K:C  \nCDEF|';
    const formatted = formatAbc(abc);
    expect(formatted).toContain('X:1');
    expect(formatted).toContain('T:Title');
    expect(formatted).toContain('K:C');
  });

  it('adds blank line after K: header', () => {
    const abc = 'X:1\nT:Test\nM:4/4\nL:1/8\nK:C\nCDEF|';
    const formatted = formatAbc(abc);
    // There should be a blank line between K:C and the note body
    expect(formatted).toContain('K:C\n\nCDEF');
  });

  it('preserves empty lines', () => {
    const abc = 'X:1\n\nT:Test\nK:C\nCDEF|';
    const formatted = formatAbc(abc);
    expect(formatted).toContain('\n\n');
  });

  it('omits body lines that appear before K: header', () => {
    // Lines that look like notes before K: should be excluded (inHeader=true skips them)
    const abc = 'X:1\nCDEF|\nK:C\nGABC|';
    const formatted = formatAbc(abc);
    // CDEF before K: should not appear (it's not a header line)
    expect(formatted).not.toContain('CDEF');
    expect(formatted).toContain('GABC');
  });
});

// ─── extractTitle ─────────────────────────────────────────────────────────────

describe('extractTitle', () => {
  it('extracts markdown h1 title', () => {
    const content = '# My Song\n\nSome content here.';
    expect(extractTitle(content)).toBe('My Song');
  });

  it('prefers h1 over ABC T: field', () => {
    const content = `# Markdown Title\n\n\`\`\`abc\nT:ABC Title\nK:C\n\`\`\``;
    expect(extractTitle(content)).toBe('Markdown Title');
  });

  it('falls back to ABC T: when no h1', () => {
    const content = `\`\`\`abc\n${SIMPLE_ABC}\n\`\`\``;
    expect(extractTitle(content)).toBe('Simple Scale');
  });

  it('returns Untitled Material when no h1 and no ABC block', () => {
    expect(extractTitle('just plain text')).toBe('Untitled Material');
  });

  it('returns Untitled Material for empty string', () => {
    expect(extractTitle('')).toBe('Untitled Material');
  });
});
