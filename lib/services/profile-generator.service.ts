/**
 * ProfileGeneratorService — Generates and updates user profiles
 *
 * Two modes:
 * 1. Full generation: Processes all data sources to create a complete profile
 * 2. Incremental update: Extracts new info from recent conversations/DAW logs
 *    and merges into existing profile
 *
 * Data sources:
 * - MUEDlobe cognitive scores
 * - Hoo conversation history
 * - DAW parameter logs
 * - User custom instructions
 */

import { createChatCompletion, type ModelName } from '@/lib/openai';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { hooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import { hooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
import { dawLogsRepository } from '@/lib/repositories/daw-logs.repository';
import { userProfileRepository } from '@/lib/repositories/user-profiles.repository';
import {
  DEFAULT_PROFILE_DATA,
  type UserProfileData,
  type CognitiveStyle,
} from '@/db/schema/user-profiles';
import type { PromptParams } from '@/db/schema/cognitive-profiles';
import { buildMusicalDawContext } from '@/lib/services/daw-log-interpreter.service';
import { logger } from '@/lib/utils/logger';

// ========================================
// Constants
// ========================================

const PROFILE_MODEL = (process.env.OPENAI_MODEL || 'gpt-5-mini') as ModelName;
const MAX_CONVERSATIONS_FOR_PROFILE = 10;
const MAX_DAW_LOGS_FOR_PROFILE = 500;

// ========================================
// Profile Generation Prompt
// ========================================

const PROFILE_EXTRACTION_PROMPT = `You are an AI assistant that builds a musician profile from conversation history and production data.

Extract the following from the provided data. Only include information that is explicitly stated or strongly implied. Do NOT fabricate or assume.

Return a JSON object with this exact structure:
{
  "bio": "One sentence: who they are as a music creator",
  "musical": {
    "genres": ["genre1", "genre2"],
    "instruments": ["instrument1"],
    "influences": ["artist1"],
    "productionStyle": "description or null",
    "mixingPreferences": "description or null"
  },
  "creative": {
    "focusAreas": ["area1", "area2"],
    "strengths": ["strength1"],
    "growthAreas": ["area1"],
    "workPatterns": "description or null"
  }
}

Rules:
- Arrays can be empty if no info found
- Use null for unknown string fields
- Keep descriptions concise (under 50 chars)
- Use lowercase for genres/instruments
- focusAreas should use: harmony, melody, rhythm, mix, emotion, structure
- Return ONLY valid JSON, no markdown or explanation`;

const INCREMENTAL_UPDATE_PROMPT = `You are updating a musician's profile with new information from a recent conversation.

Current profile:
{CURRENT_PROFILE}

New conversation:
{CONVERSATION}

Extract ONLY NEW information not already in the profile. Return a JSON patch object with the same structure — include only fields that have new data to add. For arrays, return the COMPLETE updated array (existing + new items, no duplicates).

If nothing new was learned, return: {}

Return ONLY valid JSON.`;

// ========================================
// Service
// ========================================

export class ProfileGeneratorService {
  /**
   * Generate a full profile from all available data sources
   */
  async generateFullProfile(clerkUserId: string, internalUserId: string): Promise<UserProfileData> {
    logger.info('[ProfileGenerator] Starting full profile generation', { clerkUserId });

    // Gather all data sources in parallel
    const [cognitiveProfile, conversations, customInstructions, dawLogs] = await Promise.all([
      cognitiveProfileRepository.findByUserId(clerkUserId),
      hooConversationsRepository.findByUserId(internalUserId, MAX_CONVERSATIONS_FOR_PROFILE),
      hooMemoriesRepository.getCustomInstructions(internalUserId),
      dawLogsRepository.getLogs({ userId: clerkUserId, limit: MAX_DAW_LOGS_FOR_PROFILE }),
    ]);

    // Build cognitive style from MUEDlobe
    const cognitive = this.extractCognitiveStyle(cognitiveProfile);

    // Build conversation context
    const conversationText = this.formatConversationsForExtraction(conversations);
    const dawContext = buildMusicalDawContext(dawLogs);

    // If no conversation data, return skeleton profile
    if (!conversationText && !customInstructions && !dawContext) {
      const profile: UserProfileData = {
        ...DEFAULT_PROFILE_DATA,
        cognitive,
      };

      await userProfileRepository.upsert(internalUserId, profile, PROFILE_MODEL);
      logger.info('[ProfileGenerator] Created skeleton profile (no data)', { clerkUserId });
      return profile;
    }

    // Build extraction context
    const context = [
      customInstructions ? `## User's Custom Instructions\n${customInstructions}` : '',
      conversationText ? `## Conversation History\n${conversationText}` : '',
      dawContext ? `## DAW Activity\n${dawContext}` : '',
    ].filter(Boolean).join('\n\n');

    // Extract profile via LLM
    const extracted = await this.extractWithLLM(PROFILE_EXTRACTION_PROMPT, context);

    const profile: UserProfileData = {
      musical: {
        genres: extracted.musical?.genres ?? [],
        instruments: extracted.musical?.instruments ?? [],
        influences: extracted.musical?.influences ?? [],
        productionStyle: extracted.musical?.productionStyle ?? null,
        mixingPreferences: extracted.musical?.mixingPreferences ?? null,
      },
      creative: {
        focusAreas: extracted.creative?.focusAreas ?? [],
        strengths: extracted.creative?.strengths ?? [],
        growthAreas: extracted.creative?.growthAreas ?? [],
        workPatterns: extracted.creative?.workPatterns ?? null,
      },
      cognitive,
      bio: extracted.bio ?? null,
      lastExtractedFromConversation: conversations[0]?.id ?? null,
      lastExtractedFromDawLog: dawLogs[0]?.ts?.toISOString() ?? null,
    };

    await userProfileRepository.upsert(internalUserId, profile, PROFILE_MODEL);
    logger.info('[ProfileGenerator] Full profile generated', {
      clerkUserId,
      conversationCount: conversations.length,
      dawLogCount: dawLogs.length,
      hasCognitive: !!cognitiveProfile,
    });

    return profile;
  }

  /**
   * Incrementally update profile from a single new conversation
   */
  async updateFromConversation(
    internalUserId: string,
    conversationId: string
  ): Promise<UserProfileData | null> {
    const existing = await userProfileRepository.findByUserId(internalUserId);
    if (!existing) return null;

    const conversation = await hooConversationsRepository.findById(conversationId);
    if (!conversation || !conversation.messages?.length) return null;

    // Skip if we already processed this conversation
    if (existing.profileData.lastExtractedFromConversation === conversationId) {
      return existing.profileData;
    }

    const conversationText = this.formatSingleConversation(conversation);
    const prompt = INCREMENTAL_UPDATE_PROMPT
      .replace('{CURRENT_PROFILE}', JSON.stringify(existing.profileData, null, 2))
      .replace('{CONVERSATION}', conversationText);

    const patch = await this.extractWithLLM(prompt, '');

    // If nothing new, just update the cursor
    if (!patch || Object.keys(patch).length === 0) {
      const updated: UserProfileData = {
        ...existing.profileData,
        lastExtractedFromConversation: conversationId,
      };
      await userProfileRepository.upsert(internalUserId, updated, PROFILE_MODEL);
      return updated;
    }

    // Merge patch into existing profile
    const merged: UserProfileData = {
      musical: {
        genres: patch.musical?.genres ?? existing.profileData.musical.genres,
        instruments: patch.musical?.instruments ?? existing.profileData.musical.instruments,
        influences: patch.musical?.influences ?? existing.profileData.musical.influences,
        productionStyle: patch.musical?.productionStyle ?? existing.profileData.musical.productionStyle,
        mixingPreferences: patch.musical?.mixingPreferences ?? existing.profileData.musical.mixingPreferences,
      },
      creative: {
        focusAreas: patch.creative?.focusAreas ?? existing.profileData.creative.focusAreas,
        strengths: patch.creative?.strengths ?? existing.profileData.creative.strengths,
        growthAreas: patch.creative?.growthAreas ?? existing.profileData.creative.growthAreas,
        workPatterns: patch.creative?.workPatterns ?? existing.profileData.creative.workPatterns,
      },
      cognitive: existing.profileData.cognitive, // Cognitive doesn't change from conversations
      bio: patch.bio ?? existing.profileData.bio,
      lastExtractedFromConversation: conversationId,
      lastExtractedFromDawLog: existing.profileData.lastExtractedFromDawLog,
    };

    await userProfileRepository.upsert(internalUserId, merged, PROFILE_MODEL);
    logger.info('[ProfileGenerator] Incremental update from conversation', {
      conversationId,
      patchKeys: Object.keys(patch),
    });

    return merged;
  }

  /**
   * Extract profile data from externally imported AI conversation text
   * (Claude, ChatGPT, Gemini, etc.)
   */
  async extractFromExternalConversation(
    internalUserId: string,
    text: string,
    source: string
  ): Promise<UserProfileData | null> {
    const existing = await userProfileRepository.findByUserId(internalUserId);
    if (!existing) return null;

    const prompt = INCREMENTAL_UPDATE_PROMPT
      .replace('{CURRENT_PROFILE}', JSON.stringify(existing.profileData, null, 2))
      .replace('{CONVERSATION}', `[Imported from ${source}]\n\n${text.slice(0, 8000)}`);

    const patch = await this.extractWithLLM(prompt, '');

    if (!patch || Object.keys(patch).length === 0) {
      return null;
    }

    const merged: UserProfileData = {
      musical: {
        genres: patch.musical?.genres ?? existing.profileData.musical.genres,
        instruments: patch.musical?.instruments ?? existing.profileData.musical.instruments,
        influences: patch.musical?.influences ?? existing.profileData.musical.influences,
        productionStyle: patch.musical?.productionStyle ?? existing.profileData.musical.productionStyle,
        mixingPreferences: patch.musical?.mixingPreferences ?? existing.profileData.musical.mixingPreferences,
      },
      creative: {
        focusAreas: patch.creative?.focusAreas ?? existing.profileData.creative.focusAreas,
        strengths: patch.creative?.strengths ?? existing.profileData.creative.strengths,
        growthAreas: patch.creative?.growthAreas ?? existing.profileData.creative.growthAreas,
        workPatterns: patch.creative?.workPatterns ?? existing.profileData.creative.workPatterns,
      },
      cognitive: existing.profileData.cognitive,
      bio: patch.bio ?? existing.profileData.bio,
      lastExtractedFromConversation: existing.profileData.lastExtractedFromConversation,
      lastExtractedFromDawLog: existing.profileData.lastExtractedFromDawLog,
    };

    await userProfileRepository.upsert(internalUserId, merged, PROFILE_MODEL);
    logger.info('[ProfileGenerator] External conversation imported', {
      source,
      textLength: text.length,
      patchKeys: Object.keys(patch),
    });

    return merged;
  }

  // ========================================
  // Private Helpers
  // ========================================

  private extractCognitiveStyle(
    profile: Awaited<ReturnType<typeof cognitiveProfileRepository.findByUserId>>
  ): CognitiveStyle {
    if (!profile) {
      return {
        summary: null,
        informationDensity: null,
        pacing: null,
        abstractionLevel: null,
      };
    }

    const params = profile.promptParams as PromptParams | null;

    // Build summary from scores
    const scores = [
      { name: 'Working Memory', score: profile.wmScore ?? 0 },
      { name: 'Processing Speed', score: profile.psScore ?? 0 },
      { name: 'Verbal', score: profile.vcScore ?? 0 },
      { name: 'Perceptual', score: profile.prScore ?? 0 },
      { name: 'Attention', score: profile.attScore ?? 0 },
    ];

    const strengths = scores.filter(s => s.score >= 70).map(s => s.name);
    const summary = strengths.length > 0
      ? `Strong in ${strengths.join(', ').toLowerCase()}`
      : null;

    return {
      summary,
      informationDensity: params?.informationDensity ?? null,
      pacing: params?.pacing ?? null,
      abstractionLevel: params?.abstractionLevel ?? null,
    };
  }

  private formatConversationsForExtraction(
    conversations: Awaited<ReturnType<typeof hooConversationsRepository.findByUserId>>
  ): string | null {
    if (!conversations.length) return null;

    return conversations
      .map((conv) => {
        const msgs = (conv.messages as Array<{ role: string; content: string }>) ?? [];
        const userMsgs = msgs
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .join('\n');
        return userMsgs;
      })
      .filter(Boolean)
      .join('\n---\n')
      .slice(0, 8000); // Token budget
  }

  private formatSingleConversation(
    conversation: NonNullable<Awaited<ReturnType<typeof hooConversationsRepository.findById>>>
  ): string {
    const msgs = (conversation.messages as Array<{ role: string; content: string }>) ?? [];
    return msgs
      .map((m) => `${m.role === 'user' ? 'User' : 'Hoo'}: ${m.content}`)
      .join('\n')
      .slice(0, 4000);
  }

  private async extractWithLLM(
    systemPrompt: string,
    userContent: string
  ): Promise<Partial<UserProfileData>> {
    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];
      if (userContent) {
        messages.push({ role: 'user', content: userContent });
      }

      const { completion } = await createChatCompletion(messages, {
        model: PROFILE_MODEL,
        temperature: 0.3,
        maxTokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return {};

      // Strip markdown code fences that LLMs sometimes add
      const cleaned = content
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();

      return JSON.parse(cleaned) as Partial<UserProfileData>;
    } catch (error) {
      logger.error('[ProfileGenerator] LLM extraction failed', { error });
      return {};
    }
  }
}

export const profileGeneratorService = new ProfileGeneratorService();
