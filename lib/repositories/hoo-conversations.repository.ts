/**
 * HooConversationsRepository - Data access layer for Hoo AI conversations
 *
 * Provides CRUD operations for storing and retrieving Hoo conversation history.
 */

import { db } from '@/db/edge';
import { hooConversations, type HooMessageData } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

export interface CreateConversationInput {
  userId: string;
  model: string;
  provider: 'claude' | 'gemini' | 'openai';
  title?: string;
}

export interface AddMessageInput {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export interface ConversationFilters {
  userId?: string;
  limit?: number;
  offset?: number;
}

// ========================================
// HooConversationsRepository Class
// ========================================

export class HooConversationsRepository {
  /**
   * Create a new conversation
   */
  async create(input: CreateConversationInput) {
    const [conversation] = await db
      .insert(hooConversations)
      .values({
        userId: input.userId,
        model: input.model,
        provider: input.provider,
        title: input.title,
        messages: [],
        messageCount: 0,
      })
      .returning();

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async findById(conversationId: string) {
    const [conversation] = await db
      .select()
      .from(hooConversations)
      .where(eq(hooConversations.id, conversationId))
      .limit(1);

    return conversation ?? null;
  }

  /**
   * Get conversations for a user
   */
  async findByUserId(userId: string, limit = 20, offset = 0) {
    return await db
      .select()
      .from(hooConversations)
      .where(eq(hooConversations.userId, userId))
      .orderBy(desc(hooConversations.lastMessageAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get most recent conversation for a user
   */
  async findMostRecent(userId: string) {
    const [conversation] = await db
      .select()
      .from(hooConversations)
      .where(eq(hooConversations.userId, userId))
      .orderBy(desc(hooConversations.lastMessageAt))
      .limit(1);

    return conversation ?? null;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(input: AddMessageInput) {
    const conversation = await this.findById(input.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const newMessage: HooMessageData = {
      role: input.role,
      content: input.content,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(conversation.messages ?? []), newMessage];

    const [updated] = await db
      .update(hooConversations)
      .set({
        messages: updatedMessages,
        messageCount: updatedMessages.length,
        lastMessageAt: new Date(),
        totalInputTokens: sql`${hooConversations.totalInputTokens} + ${input.inputTokens ?? 0}`,
        totalOutputTokens: sql`${hooConversations.totalOutputTokens} + ${input.outputTokens ?? 0}`,
        totalCostUsd: sql`${hooConversations.totalCostUsd} + ${input.costUsd ?? 0}`,
        updatedAt: new Date(),
      })
      .where(eq(hooConversations.id, input.conversationId))
      .returning();

    return updated ?? null;
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, title: string) {
    const [updated] = await db
      .update(hooConversations)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(eq(hooConversations.id, conversationId))
      .returning();

    return updated ?? null;
  }

  /**
   * Update conversation summary and tags
   */
  async updateSummary(conversationId: string, summary: string, tags?: string[]) {
    const [updated] = await db
      .update(hooConversations)
      .set({
        summary,
        tags,
        updatedAt: new Date(),
      })
      .where(eq(hooConversations.id, conversationId))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete a conversation
   */
  async delete(conversationId: string) {
    const [deleted] = await db
      .delete(hooConversations)
      .where(eq(hooConversations.id, conversationId))
      .returning();

    return deleted ?? null;
  }

  /**
   * Delete all conversations for a user
   */
  async deleteAllByUserId(userId: string) {
    return await db
      .delete(hooConversations)
      .where(eq(hooConversations.userId, userId))
      .returning();
  }

  /**
   * Get conversation count for a user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(hooConversations)
      .where(eq(hooConversations.userId, userId));

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Get total usage stats for a user
   */
  async getUserStats(userId: string) {
    const result = await db
      .select({
        totalConversations: sql<number>`count(*)`,
        totalMessages: sql<number>`sum(message_count)`,
        totalInputTokens: sql<number>`sum(total_input_tokens)`,
        totalOutputTokens: sql<number>`sum(total_output_tokens)`,
        totalCostUsd: sql<string>`sum(total_cost_usd)`,
      })
      .from(hooConversations)
      .where(eq(hooConversations.userId, userId));

    return {
      totalConversations: Number(result[0]?.totalConversations ?? 0),
      totalMessages: Number(result[0]?.totalMessages ?? 0),
      totalInputTokens: Number(result[0]?.totalInputTokens ?? 0),
      totalOutputTokens: Number(result[0]?.totalOutputTokens ?? 0),
      totalCostUsd: parseFloat(result[0]?.totalCostUsd ?? '0'),
    };
  }
}

// ========================================
// Singleton Instance
// ========================================

export const hooConversationsRepository = new HooConversationsRepository();
