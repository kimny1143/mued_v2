/**
 * Commentary API Unit Tests
 *
 * Tests the MUEDlobe commentary generation API route.
 * All tiers have access (MUEDnote free-ified).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ========================================
// Mock Dependencies
// ========================================

vi.mock('@/lib/middleware/with-auth', () => ({
  withAuthResolved: (handler: any) => handler,
}));

vi.mock('@/lib/repositories/cognitive-profiles.repository', () => ({
  cognitiveProfileRepository: {
    findByUserId: vi.fn(),
  },
}));

vi.mock('@/lib/muedlobe/scoring/commentaryGenerator', () => ({
  generateCommentary: vi.fn(),
}));

vi.mock('@/lib/i18n/config', () => ({
  getPreferredLocale: vi.fn(),
}));

import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { generateCommentary } from '@/lib/muedlobe/scoring/commentaryGenerator';
import { getPreferredLocale } from '@/lib/i18n/config';

// ========================================
// Inline handler matching current route logic (no trial gating)
// ========================================

const commentaryHandler = async ({
  clerkUserId,
  request,
}: {
  clerkUserId: string;
  internalUserId: string;
  request: NextRequest;
}) => {
  const { apiSuccess, apiNotFound, apiServerError } = await import('@/lib/api-response');

  try {
    const profile = await cognitiveProfileRepository.findByUserId(clerkUserId);

    if (!profile) {
      return apiNotFound('Cognitive profile not found');
    }

    const scores = {
      wm: profile.wmScore ?? 0,
      ps: profile.psScore ?? 0,
      vc: profile.vcScore ?? 0,
      pr: profile.prScore ?? 0,
      att: profile.attScore ?? 0,
    };

    const patterns = (profile.significantPatterns as any[] | null) ?? [];

    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale = cookieLocale === 'ja' || cookieLocale === 'en'
      ? cookieLocale
      : getPreferredLocale(request.headers.get('accept-language'));

    const commentary = await generateCommentary(scores, patterns, locale);

    return apiSuccess({ commentary });
  } catch (error) {
    console.error('[Commentary API] Error:', error);
    return apiServerError(
      error instanceof Error ? error.message : 'Failed to generate commentary'
    );
  }
};

// ========================================
// Test Helpers
// ========================================

function makeRequest(options: {
  cookieLocale?: string;
  acceptLanguage?: string;
} = {}): NextRequest {
  const headers = new Headers();
  if (options.acceptLanguage) {
    headers.set('accept-language', options.acceptLanguage);
  }

  const request = new NextRequest('http://localhost:3000/api/lobe/commentary', { headers });

  if (options.cookieLocale) {
    vi.spyOn(request.cookies, 'get').mockReturnValue({
      name: 'NEXT_LOCALE',
      value: options.cookieLocale,
    } as any);
  }

  return request;
}

async function parseJsonResponse(response: any) {
  const text = await response.text();
  return JSON.parse(text);
}

const mockProfile = {
  id: 'profile-uuid',
  userId: 'clerk_user123',
  wmScore: 15,
  psScore: 22,
  vcScore: 18,
  prScore: 12,
  attScore: 2.5,
  significantPatterns: [
    { dimension: 'wm', type: 'strength', rawValue: 15, percentile: 85 },
  ],
  measuredAt: new Date(),
  version: 1,
  createdAt: new Date(),
};

// ========================================
// Tests
// ========================================

describe('Commentary API (free-ified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPreferredLocale).mockReturnValue('en');
  });

  describe('Commentary generation', () => {
    it('should generate commentary for any user with profile', async () => {
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Your working memory is excellent!');

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(cognitiveProfileRepository.findByUserId).toHaveBeenCalledWith('clerk_user123');
      expect(generateCommentary).toHaveBeenCalledWith(
        { wm: 15, ps: 22, vc: 18, pr: 12, att: 2.5 },
        mockProfile.significantPatterns,
        'en'
      );

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.commentary).toBe('Your working memory is excellent!');
    });
  });

  describe('Error cases', () => {
    it('should return 404 when profile not found', async () => {
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(null);

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cognitive profile not found');
      expect(response.status).toBe(404);
    });

    it('should return 500 when commentary generation fails', async () => {
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockRejectedValue(new Error('OpenAI API error'));

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toBe('OpenAI API error');
      expect(response.status).toBe(500);
    });
  });

  describe('Locale detection', () => {
    it('should use cookie locale "ja"', async () => {
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('素晴らしい！');

      const request = makeRequest({ cookieLocale: 'ja' });
      await commentaryHandler({ clerkUserId: 'clerk_user123', internalUserId: 'db-uuid-456', request });

      expect(generateCommentary).toHaveBeenCalledWith(expect.any(Object), expect.any(Array), 'ja');
    });

    it('should fallback to Accept-Language when no valid cookie', async () => {
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Commentary');
      vi.mocked(getPreferredLocale).mockReturnValue('ja');

      const request = makeRequest({ cookieLocale: 'fr', acceptLanguage: 'ja-JP,ja;q=0.9' });
      await commentaryHandler({ clerkUserId: 'clerk_user123', internalUserId: 'db-uuid-456', request });

      expect(getPreferredLocale).toHaveBeenCalledWith('ja-JP,ja;q=0.9');
      expect(generateCommentary).toHaveBeenCalledWith(expect.any(Object), expect.any(Array), 'ja');
    });
  });

  describe('Score extraction', () => {
    it('should default null scores to 0', async () => {
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue({
        ...mockProfile,
        wmScore: null, psScore: null, vcScore: 10, prScore: null, attScore: null,
      } as any);
      vi.mocked(generateCommentary).mockResolvedValue('Commentary');

      const request = makeRequest();
      await commentaryHandler({ clerkUserId: 'clerk_user123', internalUserId: 'db-uuid-456', request });

      expect(generateCommentary).toHaveBeenCalledWith(
        { wm: 0, ps: 0, vc: 10, pr: 0, att: 0 },
        expect.any(Array),
        expect.any(String)
      );
    });

    it('should handle null significantPatterns', async () => {
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue({
        ...mockProfile, significantPatterns: null,
      } as any);
      vi.mocked(generateCommentary).mockResolvedValue('Commentary');

      const request = makeRequest();
      await commentaryHandler({ clerkUserId: 'clerk_user123', internalUserId: 'db-uuid-456', request });

      expect(generateCommentary).toHaveBeenCalledWith(expect.any(Object), [], expect.any(String));
    });
  });
});
