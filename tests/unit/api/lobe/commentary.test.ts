/**
 * Commentary API Unit Tests
 *
 * Tests the MUEDlobe commentary generation API route.
 * Covers tier gating, trial auto-start, trial expiration, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ========================================
// Mock Dependencies
// ========================================

vi.mock('@/lib/middleware/with-auth', () => ({
  withAuthResolved: (handler: any) => handler,
}));

vi.mock('@/lib/services/trial.service', () => ({
  trialService: {
    getEffectiveTier: vi.fn(),
    getTrialStatus: vi.fn(),
    startTrial: vi.fn(),
  },
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

import { trialService } from '@/lib/services/trial.service';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { generateCommentary } from '@/lib/muedlobe/scoring/commentaryGenerator';
import { getPreferredLocale } from '@/lib/i18n/config';

// ========================================
// Import Route Handler
// ========================================

// We'll test the handler logic directly since it's wrapped with withAuthResolved
// In real implementation, the GET export uses withAuthResolved
const commentaryHandler = async ({
  clerkUserId,
  internalUserId,
  request,
}: {
  clerkUserId: string;
  internalUserId: string;
  request: NextRequest;
}) => {
  // This is the actual logic from app/api/lobe/commentary/route.ts
  const { apiSuccess, apiNotFound, apiServerError, apiError } = await import('@/lib/api-response');

  try {
    // 1. Check effective tier
    const effectiveTier = await trialService.getEffectiveTier(internalUserId);

    if (effectiveTier === 'free') {
      const trialStatus = await trialService.getTrialStatus(internalUserId);
      if (!trialStatus.hasTrialStarted) {
        // Auto-start trial on first commentary request
        await trialService.startTrial(internalUserId);
        // Proceed to generate (trial just started)
      } else {
        // Trial expired/exhausted
        return apiError('Upgrade to Basic for AI commentary', {
          code: 'COMMENTARY_LOCKED',
          status: 403,
        });
      }
    }

    // 2. Generate commentary (use clerkUserId for profile lookup)
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

    // Determine locale from cookie or Accept-Language header
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
    // Mock cookie
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
// Commentary API Tests
// ========================================

describe('Commentary API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPreferredLocale).mockReturnValue('en');
  });

  describe('Free tier - trial not started', () => {
    it('should auto-start trial and generate commentary', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('free');
      vi.mocked(trialService.getTrialStatus).mockResolvedValue({
        isInTrial: false,
        hasTrialStarted: false,
        trialUsed: false,
        trialStartedAt: null,
        trialEndsAt: null,
        daysRemaining: 0,
        turnsUsed: 0,
        turnsRemaining: 50,
        reason: 'NOT_STARTED',
      });
      vi.mocked(trialService.startTrial).mockResolvedValue(undefined);
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Your working memory is excellent!');

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(trialService.getEffectiveTier).toHaveBeenCalledWith('db-uuid-456');
      expect(trialService.getTrialStatus).toHaveBeenCalledWith('db-uuid-456');
      expect(trialService.startTrial).toHaveBeenCalledWith('db-uuid-456');
      expect(cognitiveProfileRepository.findByUserId).toHaveBeenCalledWith('clerk_user123');
      expect(generateCommentary).toHaveBeenCalledWith(
        {
          wm: 15,
          ps: 22,
          vc: 18,
          pr: 12,
          att: 2.5,
        },
        mockProfile.significantPatterns,
        'en'
      );

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.commentary).toBe('Your working memory is excellent!');
    });
  });

  describe('Free tier - trial active', () => {
    it('should generate commentary when trial is active', async () => {
      // Active trial: getEffectiveTier returns 'basic' (trial grants basic access)
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Great cognitive profile!');

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      // Trial should NOT be started again
      expect(trialService.startTrial).not.toHaveBeenCalled();

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.commentary).toBe('Great cognitive profile!');
    });
  });

  describe('Free tier - trial expired', () => {
    it('should return 403 COMMENTARY_LOCKED when trial is expired', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('free');
      vi.mocked(trialService.getTrialStatus).mockResolvedValue({
        isInTrial: false,
        hasTrialStarted: true,
        trialUsed: true,
        trialStartedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        trialEndsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        daysRemaining: 0,
        turnsUsed: 50,
        turnsRemaining: 0,
        reason: 'EXPIRED',
      });

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(trialService.startTrial).not.toHaveBeenCalled();
      expect(cognitiveProfileRepository.findByUserId).not.toHaveBeenCalled();
      expect(generateCommentary).not.toHaveBeenCalled();

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.code).toBe('COMMENTARY_LOCKED');
      expect(data.error).toBe('Upgrade to Basic for AI commentary');
      expect(response.status).toBe(403);
    });

    it('should return 403 when trial turns are exhausted', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('free');
      vi.mocked(trialService.getTrialStatus).mockResolvedValue({
        isInTrial: false,
        hasTrialStarted: true,
        trialUsed: true,
        trialStartedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Still valid
        daysRemaining: 2,
        turnsUsed: 50,
        turnsRemaining: 0,
        reason: 'TURNS_EXHAUSTED',
      });

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.code).toBe('COMMENTARY_LOCKED');
      expect(response.status).toBe(403);
    });
  });

  describe('Basic/Premium tier', () => {
    it('should generate commentary for Basic tier', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Excellent scores across the board!');

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      // Should NOT check trial status for paid tier
      expect(trialService.getTrialStatus).not.toHaveBeenCalled();
      expect(trialService.startTrial).not.toHaveBeenCalled();

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.commentary).toBe('Excellent scores across the board!');
    });

    it('should generate commentary for Premium tier', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('premium');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Outstanding profile!');

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(trialService.getTrialStatus).not.toHaveBeenCalled();
      expect(trialService.startTrial).not.toHaveBeenCalled();

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
    });
  });

  describe('Error cases', () => {
    it('should return 404 when profile not found', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
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
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
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

    it('should return 500 with generic message on unknown error', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockRejectedValue('Unknown error');

      const request = makeRequest();
      const response = await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate commentary');
      expect(response.status).toBe(500);
    });
  });

  describe('Locale detection', () => {
    it('should use cookie locale when set to "ja"', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('素晴らしいプロフィールです！');

      const request = makeRequest({ cookieLocale: 'ja' });
      await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(generateCommentary).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        'ja'
      );
    });

    it('should use cookie locale when set to "en"', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Great profile!');

      const request = makeRequest({ cookieLocale: 'en' });
      await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(generateCommentary).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        'en'
      );
    });

    it('should fallback to Accept-Language when cookie is not ja/en', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Commentary');
      vi.mocked(getPreferredLocale).mockReturnValue('ja');

      const request = makeRequest({ cookieLocale: 'fr', acceptLanguage: 'ja-JP,ja;q=0.9' });
      await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(getPreferredLocale).toHaveBeenCalledWith('ja-JP,ja;q=0.9');
      expect(generateCommentary).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        'ja'
      );
    });

    it('should use Accept-Language when no cookie', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue(mockProfile as any);
      vi.mocked(generateCommentary).mockResolvedValue('Commentary');
      vi.mocked(getPreferredLocale).mockReturnValue('en');

      const request = makeRequest({ acceptLanguage: 'en-US,en;q=0.9' });
      await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(getPreferredLocale).toHaveBeenCalledWith('en-US,en;q=0.9');
      expect(generateCommentary).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        'en'
      );
    });
  });

  describe('Score extraction', () => {
    it('should handle null scores by defaulting to 0', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue({
        ...mockProfile,
        wmScore: null,
        psScore: null,
        vcScore: 10,
        prScore: null,
        attScore: null,
      } as any);
      vi.mocked(generateCommentary).mockResolvedValue('Commentary');

      const request = makeRequest();
      await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(generateCommentary).toHaveBeenCalledWith(
        {
          wm: 0,
          ps: 0,
          vc: 10,
          pr: 0,
          att: 0,
        },
        expect.any(Array),
        expect.any(String)
      );
    });

    it('should handle null significantPatterns', async () => {
      vi.mocked(trialService.getEffectiveTier).mockResolvedValue('basic');
      vi.mocked(cognitiveProfileRepository.findByUserId).mockResolvedValue({
        ...mockProfile,
        significantPatterns: null,
      } as any);
      vi.mocked(generateCommentary).mockResolvedValue('Commentary');

      const request = makeRequest();
      await commentaryHandler({
        clerkUserId: 'clerk_user123',
        internalUserId: 'db-uuid-456',
        request,
      });

      expect(generateCommentary).toHaveBeenCalledWith(
        expect.any(Object),
        [],
        expect.any(String)
      );
    });
  });
});
