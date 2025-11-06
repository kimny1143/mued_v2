import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import OpenAI from 'openai';
import {
  createChatCompletion,
  extractToolCalls,
  requiresToolExecution,
} from '@/lib/openai';
import { ALL_TOOLS, executeTool, type ToolName } from '@/lib/ai/tools';

/**
 * POST /api/ai/intent
 *
 * Natural language intent analysis endpoint using OpenAI Function Calling
 *
 * Features:
 * - Parses user's natural language input
 * - Determines intent and extracts parameters
 * - Executes appropriate tool(s)
 * - Returns natural language response
 *
 * Example requests:
 * - "Find me available math lessons next week"
 * - "Book a lesson on Tuesday at 2pm"
 * - "Generate a quiz on algebra for beginners"
 * - "What's my subscription status?"
 */

// Request schema
const intentRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are MUED, an AI assistant for an online learning management system. Your role is to help students:

1. Search for available lesson slots
2. Book lessons with mentors
3. Generate study materials (quizzes, summaries, flashcards, practice problems)
4. Check subscription status and limits
5. Upgrade their subscription plan

You have access to the following tools:
- searchAvailableSlots: Find available lesson slots by date range, subject, or mentor
- createReservation: Book a lesson slot for the user
- generateStudyMaterial: Create AI-powered study materials
- getSubscriptionStatus: Check the user's subscription plan and usage limits
- upgradeSubscription: Upgrade to a higher subscription tier

Guidelines:
- Be helpful, friendly, and educational
- Always confirm important actions (like booking lessons) before executing
- Explain subscription limits when relevant
- Suggest appropriate study material formats based on the topic
- If multiple tools are needed, execute them in logical order

When users ask about dates:
- "today" = current date
- "tomorrow" = next day
- "next week" = 7 days from now
- "this week" = current week (Monday to Sunday)

Current date: ${new Date().toISOString().split('T')[0]}`;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const { message, conversationHistory } = intentRequestSchema.parse(body);

    // Build conversation messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Initial AI call with tools
    const { completion: initialCompletion, usage: initialUsage } =
      await createChatCompletion(messages, {
        tools: ALL_TOOLS,
        toolChoice: 'auto',
        // Note: GPT-5 only supports temperature=1 (default)
      });

    const initialMessage = initialCompletion.choices[0]?.message;
    if (!initialMessage) {
      throw new Error('No response from AI');
    }

    // Check if AI wants to use tools
    if (requiresToolExecution(initialCompletion)) {
      const toolCalls = extractToolCalls(initialCompletion);

      // Execute each tool call
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          if (!('function' in toolCall)) {
            throw new Error('Tool call does not have function property');
          }
          const toolName = toolCall.function.name as ToolName;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          try {
            const result = await executeTool(toolName, toolArgs);
            return {
              tool_call_id: toolCall.id,
              role: 'tool' as const,
              name: toolName,
              content: JSON.stringify(result),
            };
          } catch (error) {
            console.error(`Tool execution error (${toolName}):`, error);
            return {
              tool_call_id: toolCall.id,
              role: 'tool' as const,
              name: toolName,
              content: JSON.stringify({
                success: false,
                error:
                  error instanceof Error ? error.message : 'Unknown error',
              }),
            };
          }
        })
      );

      // Add assistant message with tool calls and tool results to conversation
      messages.push({
        role: 'assistant',
        content: initialMessage.content || '',
        tool_calls: initialMessage.tool_calls,
      });

      toolResults.forEach((result) => {
        messages.push(result);
      });

      // Get final response from AI with tool results
      const { completion: finalCompletion, usage: finalUsage } =
        await createChatCompletion(messages, {
          // Note: GPT-5 only supports temperature=1 (default)
        });

      const finalMessage = finalCompletion.choices[0]?.message;

      return NextResponse.json({
        success: true,
        message: finalMessage?.content || 'I apologize, but I could not generate a response.',
        toolsUsed: toolCalls.map((tc) => ('function' in tc ? tc.function.name : 'unknown')),
        usage: {
          initial: initialUsage,
          final: finalUsage,
          total: {
            promptTokens:
              initialUsage.promptTokens + finalUsage.promptTokens,
            completionTokens:
              initialUsage.completionTokens + finalUsage.completionTokens,
            totalTokens: initialUsage.totalTokens + finalUsage.totalTokens,
            estimatedCost: initialUsage.estimatedCost + finalUsage.estimatedCost,
          },
        },
      });
    } else {
      // No tool execution needed, return direct response
      return NextResponse.json({
        success: true,
        message: initialMessage.content || 'I apologize, but I could not generate a response.',
        toolsUsed: [],
        usage: {
          initial: initialUsage,
          total: initialUsage,
        },
      });
    }
  } catch (error) {
    console.error('Intent API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/ai/intent',
    description: 'Natural language intent analysis',
    availableTools: ALL_TOOLS.map((tool) => tool.function.name),
  });
}
