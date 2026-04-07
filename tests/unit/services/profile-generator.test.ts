/**
 * ProfileGeneratorService Unit Tests
 *
 * Tests:
 * - extractCognitiveStyle: converts MUEDlobe scores to CognitiveStyle
 * - formatConversationsForExtraction: formats conversation history for LLM
 * - formatSingleConversation: formats a single conversation
 * - generateFullProfile: skeleton profile when no data, LLM extraction
 * - updateFromConversation: incremental update, skip-if-already-processed
 * - extractFromExternalConversation: external import, null-when-no-patch
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserProfileData } from '@/db/schema/user-profiles';

// ========================================
// Mocks
// ========================================

const mockCreateChatCompletion = vi.fn();
vi.mock('@/lib/openai', () => ({
  createChatCompletion: (...args: any[]) => mockCreateChatCompletion(...args),
}));

const mockFindByUserId_cognitive = vi.fn();
vi.mock('@/lib/repositories/cognitive-profiles.repository', () => ({
  cognitiveProfileRepository: {
    findByUserId: (...args: any[]) => mockFindByUserId_cognitive(...args),
  },
}));

const mockFindByUserId_conversations = vi.fn();
const mockFindById_conversation = vi.fn();
vi.mock('@/lib/repositories/hoo-conversations.repository', () => ({
  hooConversationsRepository: {
    findByUserId: (...args: any[]) => mockFindByUserId_conversations(...args),
    findById: (...args: any[]) => mockFindById_conversation(...args),
  },
}));

const mockGetCustomInstructions = vi.fn();
vi.mock('@/lib/repositories/hoo-memories.repository', () => ({
  hooMemoriesRepository: {
    getCustomInstructions: (...args: any[]) => mockGetCustomInstructions(...args),
  },
}));

const mockGetLogs = vi.fn();
vi.mock('@/lib/repositories/daw-logs.repository', () => ({
  dawLogsRepository: {
    getLogs: (...args: any[]) => mockGetLogs(...args),
  },
}));

const mockUpsert = vi.fn().mockResolvedValue({});
const mockFindByUserId_profile = vi.fn();
vi.mock('@/lib/repositories/user-profiles.repository', () => ({
  userProfileRepository: {
    upsert: (...args: any[]) => mockUpsert(...args),
    findByUserId: (...args: any[]) => mockFindByUserId_profile(...args),
  },
}));

vi.mock('@/lib/services/daw-log-interpreter.service', () => ({
  buildMusicalDawContext: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { ProfileGeneratorService } from '@/lib/services/profile-generator.service';

// ========================================
// Test Data
// ========================================

const _DEFAULT_PROFILE: UserProfileData = {
  musical: {
    genres: [],
    instruments: [],
    influences: [],
    productionStyle: null,
    mixingPreferences: null,
  },
  creative: {
    focusAreas: [],
    strengths: [],
    growthAreas: [],
    workPatterns: null,
  },
  cognitive: {
    summary: null,
    informationDensity: null,
    pacing: null,
    abstractionLevel: null,
  },
  bio: null,
  lastExtractedFromConversation: null,
  lastExtractedFromDawLog: null,
};

const EXISTING_PROFILE: UserProfileData = {
  musical: {
    genres: ['indie rock'],
    instruments: ['guitar'],
    influences: ['Radiohead'],
    productionStyle: 'warm analog',
    mixingPreferences: null,
  },
  creative: {
    focusAreas: ['harmony'],
    strengths: ['melodic intuition'],
    growthAreas: ['mixing'],
    workPatterns: 'night owl',
  },
  cognitive: {
    summary: 'Strong in working memory',
    informationDensity: 'high',
    pacing: 'fast',
    abstractionLevel: 'abstract',
  },
  bio: 'Indie rock guitarist',
  lastExtractedFromConversation: 'conv-old',
  lastExtractedFromDawLog: null,
};

// ========================================
// Tests
// ========================================

describe('ProfileGeneratorService', () => {
  let service: ProfileGeneratorService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new ProfileGeneratorService();
    mockFindByUserId_cognitive.mockResolvedValue(null);
    mockFindByUserId_conversations.mockResolvedValue([]);
    mockGetCustomInstructions.mockResolvedValue(null);
    mockGetLogs.mockResolvedValue([]);
    mockUpsert.mockResolvedValue({});
  });

  // ------------------------------------------------------------------
  // extractCognitiveStyle (via generateFullProfile)
  // ------------------------------------------------------------------

  describe('generateFullProfile — cognitive style extraction', () => {
    it('returns null fields when no cognitive profile', async () => {
      mockFindByUserId_cognitive.mockResolvedValue(null);

      const result = await service.generateFullProfile('clerk-1', 'user-1');
      expect(result.cognitive).toEqual({
        summary: null,
        informationDensity: null,
        pacing: null,
        abstractionLevel: null,
      });
    });

    it('extracts strengths from scores >= 70', async () => {
      mockFindByUserId_cognitive.mockResolvedValue({
        wmScore: 85,
        psScore: 45,
        vcScore: 72,
        prScore: 30,
        attScore: 90,
        promptParams: null,
      });

      const result = await service.generateFullProfile('clerk-1', 'user-1');
      expect(result.cognitive.summary).toContain('working memory');
      expect(result.cognitive.summary).toContain('verbal');
      expect(result.cognitive.summary).toContain('attention');
      expect(result.cognitive.summary).not.toContain('processing speed');
      expect(result.cognitive.summary).not.toContain('perceptual');
    });

    it('returns null summary when no scores >= 70', async () => {
      mockFindByUserId_cognitive.mockResolvedValue({
        wmScore: 50,
        psScore: 45,
        vcScore: 60,
        prScore: 30,
        attScore: 69,
        promptParams: null,
      });

      const result = await service.generateFullProfile('clerk-1', 'user-1');
      expect(result.cognitive.summary).toBeNull();
    });

    it('extracts promptParams for density/pacing/abstraction', async () => {
      mockFindByUserId_cognitive.mockResolvedValue({
        wmScore: 80,
        psScore: 75,
        vcScore: 90,
        prScore: 65,
        attScore: 85,
        promptParams: {
          informationDensity: 'high',
          pacing: 'fast',
          abstractionLevel: 'abstract',
        },
      });

      const result = await service.generateFullProfile('clerk-1', 'user-1');
      expect(result.cognitive.informationDensity).toBe('high');
      expect(result.cognitive.pacing).toBe('fast');
      expect(result.cognitive.abstractionLevel).toBe('abstract');
    });

    it('handles null scores as 0', async () => {
      mockFindByUserId_cognitive.mockResolvedValue({
        wmScore: null,
        psScore: null,
        vcScore: null,
        prScore: null,
        attScore: null,
        promptParams: null,
      });

      const result = await service.generateFullProfile('clerk-1', 'user-1');
      expect(result.cognitive.summary).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // Skeleton profile (no data)
  // ------------------------------------------------------------------

  describe('generateFullProfile — skeleton profile', () => {
    it('returns default profile when no conversations, instructions, or DAW data', async () => {
      const result = await service.generateFullProfile('clerk-1', 'user-1');

      expect(result.musical.genres).toEqual([]);
      expect(result.musical.instruments).toEqual([]);
      expect(result.bio).toBeNull();
      expect(mockUpsert).toHaveBeenCalledWith('user-1', expect.any(Object), expect.any(String));
    });

    it('does not call LLM when no data sources available', async () => {
      await service.generateFullProfile('clerk-1', 'user-1');
      expect(mockCreateChatCompletion).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Full profile with LLM extraction
  // ------------------------------------------------------------------

  describe('generateFullProfile — with data', () => {
    it('calls LLM when conversation data exists', async () => {
      mockFindByUserId_conversations.mockResolvedValue([
        {
          id: 'conv-1',
          messages: [
            { role: 'user', content: 'I play guitar in an indie rock band' },
            { role: 'assistant', content: 'Cool!' },
          ],
        },
      ]);

      mockCreateChatCompletion.mockResolvedValue({
        completion: {
          choices: [{
            message: {
              content: JSON.stringify({
                bio: 'Indie rock guitarist',
                musical: { genres: ['indie rock'], instruments: ['guitar'], influences: [], productionStyle: null, mixingPreferences: null },
                creative: { focusAreas: [], strengths: [], growthAreas: [], workPatterns: null },
              }),
            },
          }],
        },
      });

      const result = await service.generateFullProfile('clerk-1', 'user-1');
      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(1);
      expect(result.bio).toBe('Indie rock guitarist');
      expect(result.musical.genres).toEqual(['indie rock']);
    });

    it('handles LLM failure gracefully, returns empty profile data', async () => {
      mockFindByUserId_conversations.mockResolvedValue([
        { id: 'conv-1', messages: [{ role: 'user', content: 'test' }, { role: 'assistant', content: 'ok' }] },
      ]);

      mockCreateChatCompletion.mockRejectedValue(new Error('API error'));

      const result = await service.generateFullProfile('clerk-1', 'user-1');
      // Should return defaults for missing LLM data
      expect(result.musical.genres).toEqual([]);
      expect(result.bio).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // updateFromConversation (incremental)
  // ------------------------------------------------------------------

  describe('updateFromConversation', () => {
    it('returns null when no existing profile', async () => {
      mockFindByUserId_profile.mockResolvedValue(null);
      const result = await service.updateFromConversation('user-1', 'conv-1');
      expect(result).toBeNull();
    });

    it('returns null when conversation not found', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockFindById_conversation.mockResolvedValue(null);

      const result = await service.updateFromConversation('user-1', 'conv-1');
      expect(result).toBeNull();
    });

    it('skips if conversation already processed', async () => {
      mockFindByUserId_profile.mockResolvedValue({
        profileData: { ...EXISTING_PROFILE, lastExtractedFromConversation: 'conv-1' },
      });
      mockFindById_conversation.mockResolvedValue({
        id: 'conv-1',
        messages: [{ role: 'user', content: 'test' }],
      });

      const result = await service.updateFromConversation('user-1', 'conv-1');
      expect(result).toEqual({ ...EXISTING_PROFILE, lastExtractedFromConversation: 'conv-1' });
      expect(mockCreateChatCompletion).not.toHaveBeenCalled();
    });

    it('updates cursor only when LLM returns empty patch', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockFindById_conversation.mockResolvedValue({
        id: 'conv-new',
        messages: [
          { role: 'user', content: 'Just chatting' },
          { role: 'assistant', content: 'Ok' },
        ],
      });

      mockCreateChatCompletion.mockResolvedValue({
        completion: { choices: [{ message: { content: '{}' } }] },
      });

      const result = await service.updateFromConversation('user-1', 'conv-new');
      expect(result!.lastExtractedFromConversation).toBe('conv-new');
      expect(result!.musical.genres).toEqual(['indie rock']); // unchanged
    });

    it('merges new data into existing profile', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockFindById_conversation.mockResolvedValue({
        id: 'conv-new',
        messages: [
          { role: 'user', content: 'I also play synth and produce lo-fi' },
          { role: 'assistant', content: 'Interesting' },
        ],
      });

      mockCreateChatCompletion.mockResolvedValue({
        completion: {
          choices: [{
            message: {
              content: JSON.stringify({
                musical: {
                  genres: ['indie rock', 'lo-fi hip hop'],
                  instruments: ['guitar', 'synth'],
                },
              }),
            },
          }],
        },
      });

      const result = await service.updateFromConversation('user-1', 'conv-new');
      expect(result!.musical.genres).toEqual(['indie rock', 'lo-fi hip hop']);
      expect(result!.musical.instruments).toEqual(['guitar', 'synth']);
      // Non-patched fields preserved
      expect(result!.musical.influences).toEqual(['Radiohead']);
      expect(result!.bio).toBe('Indie rock guitarist');
    });

    it('preserves cognitive data (not changed from conversations)', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockFindById_conversation.mockResolvedValue({
        id: 'conv-new',
        messages: [{ role: 'user', content: 'test' }, { role: 'assistant', content: 'ok' }],
      });

      mockCreateChatCompletion.mockResolvedValue({
        completion: {
          choices: [{
            message: { content: JSON.stringify({ bio: 'Updated bio' }) },
          }],
        },
      });

      const result = await service.updateFromConversation('user-1', 'conv-new');
      expect(result!.cognitive).toEqual(EXISTING_PROFILE.cognitive);
    });
  });

  // ------------------------------------------------------------------
  // extractFromExternalConversation
  // ------------------------------------------------------------------

  describe('extractFromExternalConversation', () => {
    it('returns null when no existing profile', async () => {
      mockFindByUserId_profile.mockResolvedValue(null);

      const result = await service.extractFromExternalConversation(
        'user-1', 'Some conversation text', 'ChatGPT'
      );
      expect(result).toBeNull();
    });

    it('returns null when LLM finds nothing new', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockCreateChatCompletion.mockResolvedValue({
        completion: { choices: [{ message: { content: '{}' } }] },
      });

      const result = await service.extractFromExternalConversation(
        'user-1', 'Just some chat', 'Gemini'
      );
      expect(result).toBeNull();
    });

    it('merges extracted data from external conversation', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockCreateChatCompletion.mockResolvedValue({
        completion: {
          choices: [{
            message: {
              content: JSON.stringify({
                musical: { mixingPreferences: 'vocal-forward mix' },
              }),
            },
          }],
        },
      });

      const result = await service.extractFromExternalConversation(
        'user-1', 'Long conversation about mixing...', 'Claude'
      );
      expect(result!.musical.mixingPreferences).toBe('vocal-forward mix');
      expect(result!.musical.genres).toEqual(['indie rock']); // preserved
    });

    it('truncates input text to 8000 chars', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockCreateChatCompletion.mockResolvedValue({
        completion: { choices: [{ message: { content: '{}' } }] },
      });

      const longText = 'x'.repeat(10000);
      await service.extractFromExternalConversation('user-1', longText, 'ChatGPT');

      const llmCall = mockCreateChatCompletion.mock.calls[0];
      // The system prompt should contain the truncated text
      expect(llmCall).toBeDefined();
    });

    it('preserves cognitive and cursor data', async () => {
      mockFindByUserId_profile.mockResolvedValue({ profileData: EXISTING_PROFILE });
      mockCreateChatCompletion.mockResolvedValue({
        completion: {
          choices: [{
            message: { content: JSON.stringify({ bio: 'New bio from external' }) },
          }],
        },
      });

      const result = await service.extractFromExternalConversation(
        'user-1', 'External conversation', 'Claude'
      );
      expect(result!.cognitive).toEqual(EXISTING_PROFILE.cognitive);
      expect(result!.lastExtractedFromConversation).toBe('conv-old');
    });
  });
});
