import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { getUserIdFromClerkId } from '@/lib/services/ai-material.service';

// Material content schema for validation
const musicContentSchema = z.object({
  type: z.literal('music'),
  title: z.string().min(1),
  description: z.string().min(1),
  abcNotation: z.string().min(1),
  learningPoints: z.array(z.string()).optional(),
  practiceInstructions: z.array(z.string()).optional(),
});

const quizContentSchema = z.object({
  type: z.literal('quiz'),
  title: z.string().min(1),
  description: z.string().min(1),
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.string(),
    explanation: z.string().optional(),
  })).min(1),
});

const summaryContentSchema = z.object({
  type: z.literal('summary'),
  title: z.string().min(1),
  description: z.string().min(1),
  overview: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).optional(),
});

const flashcardsContentSchema = z.object({
  type: z.literal('flashcards'),
  title: z.string().min(1),
  description: z.string().min(1),
  cards: z.array(z.object({
    front: z.string().optional(),
    back: z.string().optional(),
    term: z.string().optional(),
    definition: z.string().optional(),
    example: z.string().optional(),
  })).min(1),
});

const practiceContentSchema = z.object({
  type: z.literal('practice'),
  title: z.string().min(1),
  description: z.string().min(1),
  problems: z.array(z.object({
    problem: z.string(),
    hints: z.array(z.string()).optional(),
    hint: z.string().optional(),
    solution: z.string().optional(),
    steps: z.array(z.string()).optional(),
  })).min(1),
});

// Union of all content types
const materialContentSchema = z.discriminatedUnion('type', [
  musicContentSchema,
  quizContentSchema,
  summaryContentSchema,
  flashcardsContentSchema,
  practiceContentSchema,
]);

const importRequestSchema = z.object({
  content: materialContentSchema,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  makePublic: z.boolean().optional().default(false),
});

/**
 * POST /api/ai/materials/import
 *
 * Import material from external JSON (Claude Desktop, ChatGPT)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get internal user UUID
    const userId = await getUserIdFromClerkId(clerkUserId);

    // Parse and validate request
    const body = await request.json();
    const validatedData = importRequestSchema.parse(body);

    const { content, difficulty, makePublic } = validatedData;

    // Insert into database
    const [newMaterial] = await db
      .insert(materials)
      .values({
        title: content.title,
        description: content.description,
        type: content.type,
        difficulty,
        content: content as unknown as Record<string, unknown>,
        creatorId: userId,
        isPublic: makePublic, // Set isPublic column directly
        metadata: {
          importedFrom: 'external',
          importedAt: new Date().toISOString(),
        },
      })
      .returning();

    console.log('[Material Import] Successfully imported:', {
      id: newMaterial.id,
      title: newMaterial.title,
      type: newMaterial.type,
      difficulty: newMaterial.difficulty,
      isPublic: makePublic,
    });

    return NextResponse.json({
      success: true,
      materialId: newMaterial.id,
      material: {
        id: newMaterial.id,
        title: newMaterial.title,
        description: newMaterial.description,
        type: newMaterial.type,
        difficulty: newMaterial.difficulty,
      },
      message: 'Material imported successfully',
    });
  } catch (error) {
    console.error('[Material Import] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid material format',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      },
      { status: 500 }
    );
  }
}
