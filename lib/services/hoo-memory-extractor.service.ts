/**
 * HooMemoryExtractorService — Extracts auto-memories from Hoo conversations
 *
 * Analyzes completed conversations and extracts structured facts about the user
 * (equipment, genre preferences, skills, projects, production preferences).
 * Results are stored in hoo_memories.autoMemories for Hoo prompt injection.
 */

import { createChatCompletion, type ModelName } from '@/lib/openai';
import { hooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
import { hooConversationsRepository } from '@/lib/repositories/hoo-conversations.repository';
import type { HooAutoMemory } from '@/db/schema/hoo-memories';
import { logger } from '@/lib/utils/logger';

// ========================================
// Constants
// ========================================

const EXTRACTION_MODEL = (process.env.OPENAI_MODEL || 'gpt-5-mini') as ModelName;
const MAX_CONVERSATION_LENGTH = 6000;
const MAX_AUTO_MEMORIES = 50;

// ========================================
// Extraction Prompt
// ========================================

const MEMORY_EXTRACTION_PROMPT = `You are analyzing a conversation between a music creator and Hoo (an AI thought-organization companion). Extract specific facts about the user that would be useful to remember for future conversations.

Return a JSON array of memories. Each memory must have:
- "content": A concise fact (under 120 chars) in the user's language
- "category": One of "equipment", "genre", "skill", "project", "preference"
- "confidence": 0.0-1.0 (0.8+ for directly stated facts, 0.5-0.7 for implied)

Categories:
- equipment: DAW, instruments, plugins, hardware
- genre: Musical genres, subgenres, style preferences
- skill: Skill level, techniques, areas of expertise
- project: Current or recent projects, goals, deadlines
- preference: Production preferences, workflow habits, mixing/mastering preferences

Rules:
- Only extract facts that are clearly stated or strongly implied
- Do NOT extract generic opinions or temporary emotions
- Do NOT extract facts about Hoo or the conversation itself
- Maximum 5 memories per conversation
- If nothing meaningful can be extracted, return: []

Return ONLY valid JSON (an array), no markdown or explanation.`;

// ========================================
// Types
// ========================================

interface ExtractedMemory {
  content: string;
  category: HooAutoMemory['category'];
  confidence: number;
}

const VALID_CATEGORIES = new Set(['equipment', 'genre', 'skill', 'project', 'preference']);

// ========================================
// Service
// ========================================

export class HooMemoryExtractorService {
  /**
   * Extract memories from a specific conversation
   */
  async extractFromConversation(
    userId: string,
    conversationId: string
  ): Promise<HooAutoMemory[]> {
    const conversation = await hooConversationsRepository.findById(conversationId);
    if (!conversation || !conversation.messages?.length) {
      return [];
    }

    // Skip very short conversations (< 4 messages = 2 turns)
    if (conversation.messages.length < 4) {
      return [];
    }

    // Format conversation for LLM
    const messages = (conversation.messages as Array<{ role: string; content: string }>);
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Hoo'}: ${m.content}`)
      .join('\n')
      .slice(0, MAX_CONVERSATION_LENGTH);

    // Extract via LLM
    const extracted = await this.extractWithLLM(conversationText);
    if (extracted.length === 0) {
      return [];
    }

    // Convert to HooAutoMemory format
    const now = new Date().toISOString();
    const newMemories: HooAutoMemory[] = extracted.map(e => ({
      id: crypto.randomUUID(),
      content: e.content,
      category: e.category,
      source: {
        conversationId,
        extractedAt: now,
      },
      confidence: e.confidence,
      createdAt: now,
    }));

    // Merge into existing memories
    await this.mergeMemories(userId, newMemories);

    logger.info('[HooMemoryExtractor] Extracted memories', {
      userId,
      conversationId,
      count: newMemories.length,
      categories: newMemories.map(m => m.category),
    });

    return newMemories;
  }

  /**
   * Merge new memories with existing ones, deduplicating and capping at MAX_AUTO_MEMORIES
   */
  private async mergeMemories(userId: string, newMemories: HooAutoMemory[]): Promise<void> {
    const settings = await hooMemoriesRepository.getMemorySettings(userId);
    const existing = settings?.autoMemories ?? [];

    // Deduplicate: skip new memories whose content closely matches existing
    const filtered = newMemories.filter(newMem => {
      const normalized = newMem.content.toLowerCase().trim();
      return !existing.some(ex =>
        ex.content.toLowerCase().trim() === normalized
      );
    });

    if (filtered.length === 0) return;

    // Merge and cap
    const merged = [...existing, ...filtered];

    // If over limit, drop lowest-confidence oldest entries
    const capped = merged
      .sort((a, b) => b.confidence - a.confidence || b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_AUTO_MEMORIES);

    await hooMemoriesRepository.updateAutoMemories(userId, capped);
  }

  /**
   * Extract structured memories from conversation text via LLM
   */
  private async extractWithLLM(conversationText: string): Promise<ExtractedMemory[]> {
    try {
      const { completion } = await createChatCompletion(
        [
          { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
          { role: 'user', content: conversationText },
        ],
        {
          model: EXTRACTION_MODEL,
          temperature: 0.2,
          maxTokens: 500,
        }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) return [];

      const cleaned = content
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];

      // Validate and filter
      return parsed
        .filter((item: unknown): item is ExtractedMemory => {
          if (!item || typeof item !== 'object') return false;
          const obj = item as Record<string, unknown>;
          return (
            typeof obj.content === 'string' &&
            obj.content.length > 0 &&
            obj.content.length <= 120 &&
            typeof obj.category === 'string' &&
            VALID_CATEGORIES.has(obj.category) &&
            typeof obj.confidence === 'number' &&
            obj.confidence >= 0 &&
            obj.confidence <= 1
          );
        })
        .slice(0, 5);
    } catch (error) {
      logger.error('[HooMemoryExtractor] LLM extraction failed', { error });
      return [];
    }
  }
}

export const hooMemoryExtractorService = new HooMemoryExtractorService();
