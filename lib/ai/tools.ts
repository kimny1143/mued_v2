import { z } from 'zod';
import OpenAI from 'openai';
import { db } from '@/db';
import { lessonSlots, reservations, materials, subscriptions } from '@/db/schema';
import { eq, and, gte, lt, desc } from 'drizzle-orm';

/**
 * OpenAI Function Calling Tools for MUED v2
 *
 * Available tools:
 * 1. searchAvailableSlots - Search for available lesson slots
 * 2. createReservation - Create a new lesson reservation
 * 3. generateStudyMaterial - Generate AI study materials
 * 4. getSubscriptionStatus - Get user's subscription information
 * 5. upgradeSubscription - Upgrade user's subscription plan
 */

// ============================================================================
// Tool Schemas (Zod)
// ============================================================================

export const searchAvailableSlotsSchema = z.object({
  startDate: z.string().describe('Start date in ISO 8601 format (YYYY-MM-DD)'),
  endDate: z.string().describe('End date in ISO 8601 format (YYYY-MM-DD)'),
  mentorId: z.string().uuid().optional().describe('Filter by specific mentor ID'),
});

export const createReservationSchema = z.object({
  slotId: z.string().uuid().describe('ID of the lesson slot to book'),
  userId: z.string().uuid().describe('ID of the user making the reservation'),
  notes: z.string().optional().describe('Additional notes for the reservation'),
});

export const generateStudyMaterialSchema = z.object({
  subject: z.string().describe('Subject of the study material (e.g., "Math", "English")'),
  topic: z.string().describe('Specific topic to generate material for'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Difficulty level'),
  format: z.enum(['quiz', 'summary', 'flashcards', 'practice']).describe('Material format'),
  userId: z.string().uuid().describe('ID of the user requesting the material'),
});

export const getSubscriptionStatusSchema = z.object({
  userId: z.string().uuid().describe('ID of the user'),
});

export const upgradeSubscriptionSchema = z.object({
  userId: z.string().uuid().describe('ID of the user'),
  newTier: z.enum(['starter', 'basic', 'premium']).describe('New subscription tier'),
});

// ============================================================================
// OpenAI Function Definitions
// ============================================================================

export const searchAvailableSlotsTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'searchAvailableSlots',
    description:
      'Search for available lesson slots within a date range. Can filter by subject or specific mentor.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO 8601 format (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO 8601 format (YYYY-MM-DD)',
        },
        subject: {
          type: 'string',
          description: 'Filter by subject (optional)',
        },
        mentorId: {
          type: 'string',
          description: 'Filter by specific mentor UUID (optional)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
};

export const createReservationTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'createReservation',
    description: 'Create a new lesson reservation for a user',
    parameters: {
      type: 'object',
      properties: {
        slotId: {
          type: 'string',
          description: 'UUID of the lesson slot to book',
        },
        userId: {
          type: 'string',
          description: 'UUID of the user making the reservation',
        },
        notes: {
          type: 'string',
          description: 'Additional notes for the reservation (optional)',
        },
      },
      required: ['slotId', 'userId'],
    },
  },
};

export const generateStudyMaterialTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'generateStudyMaterial',
    description:
      'Generate AI-powered study materials in various formats (quiz, summary, flashcards, practice problems)',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Subject of the study material',
        },
        topic: {
          type: 'string',
          description: 'Specific topic to generate material for',
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Difficulty level',
        },
        format: {
          type: 'string',
          enum: ['quiz', 'summary', 'flashcards', 'practice'],
          description: 'Material format',
        },
        userId: {
          type: 'string',
          description: 'UUID of the user requesting the material',
        },
      },
      required: ['subject', 'topic', 'difficulty', 'format', 'userId'],
    },
  },
};

export const getSubscriptionStatusTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'getSubscriptionStatus',
    description:
      "Get user's current subscription plan, usage limits, and remaining quota",
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'UUID of the user',
        },
      },
      required: ['userId'],
    },
  },
};

export const upgradeSubscriptionTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'upgradeSubscription',
    description: "Upgrade user's subscription to a higher tier",
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'UUID of the user',
        },
        newTier: {
          type: 'string',
          enum: ['starter', 'basic', 'premium'],
          description: 'New subscription tier',
        },
      },
      required: ['userId', 'newTier'],
    },
  },
};

// All available tools
export const ALL_TOOLS = [
  searchAvailableSlotsTool,
  createReservationTool,
  generateStudyMaterialTool,
  getSubscriptionStatusTool,
  upgradeSubscriptionTool,
];

// ============================================================================
// Tool Execution Functions
// ============================================================================

/**
 * Execute searchAvailableSlots tool
 */
export async function executeSearchAvailableSlots(
  args: z.infer<typeof searchAvailableSlotsSchema>
) {
  const validated = searchAvailableSlotsSchema.parse(args);

  const startDate = new Date(validated.startDate);
  const endDate = new Date(validated.endDate);

  // Build where conditions
  const conditions = [
    eq(lessonSlots.status, 'available'),
    gte(lessonSlots.startTime, startDate),
    lt(lessonSlots.startTime, endDate),
  ];

  if (validated.mentorId) {
    conditions.push(eq(lessonSlots.mentorId, validated.mentorId));
  }

  const slots = await db
    .select()
    .from(lessonSlots)
    .where(and(...conditions))
    .orderBy(lessonSlots.startTime)
    .limit(20);

  return {
    success: true,
    slots: slots.map((slot) => ({
      id: slot.id,
      mentorId: slot.mentorId,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      price: slot.price,
      status: slot.status,
    })),
    count: slots.length,
  };
}

/**
 * Execute createReservation tool
 */
export async function executeCreateReservation(
  args: z.infer<typeof createReservationSchema>
) {
  const validated = createReservationSchema.parse(args);

  // Check if slot exists and is available
  const [slot] = await db
    .select()
    .from(lessonSlots)
    .where(and(eq(lessonSlots.id, validated.slotId), eq(lessonSlots.status, 'available')))
    .limit(1);

  if (!slot) {
    return {
      success: false,
      error: 'Slot not found or already booked',
    };
  }

  // Create reservation
  const [reservation] = await db
    .insert(reservations)
    .values({
      slotId: validated.slotId,
      studentId: validated.userId,
      mentorId: slot.mentorId,
      amount: slot.price,
      status: 'pending',
      notes: validated.notes,
    })
    .returning();

  // Mark slot as booked
  await db
    .update(lessonSlots)
    .set({ status: 'booked' })
    .where(eq(lessonSlots.id, validated.slotId));

  return {
    success: true,
    reservation: {
      id: reservation.id,
      slotId: reservation.slotId,
      status: reservation.status,
      createdAt: reservation.createdAt.toISOString(),
    },
  };
}

/**
 * Execute generateStudyMaterial tool
 */
export async function executeGenerateStudyMaterial(
  args: z.infer<typeof generateStudyMaterialSchema>
) {
  const validated = generateStudyMaterialSchema.parse(args);

  // Note: Actual AI generation will be implemented in ai-material.service.ts
  // This is a placeholder that saves the request and returns a pending status

  const [material] = await db
    .insert(materials)
    .values({
      creatorId: validated.userId,
      title: `${validated.subject}: ${validated.topic}`,
      description: `${validated.format} for ${validated.difficulty} level`,
      content: 'Generating...',
      type: validated.format,
      difficulty: validated.difficulty,
      metadata: {
        subject: validated.subject,
        topic: validated.topic,
        format: validated.format,
        status: 'generating',
      },
    })
    .returning();

  return {
    success: true,
    materialId: material.id,
    status: 'generating',
    message: 'Material generation started. This will be ready shortly.',
  };
}

/**
 * Execute getSubscriptionStatus tool
 */
export async function executeGetSubscriptionStatus(
  args: z.infer<typeof getSubscriptionStatusSchema>
) {
  const validated = getSubscriptionStatusSchema.parse(args);

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, validated.userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!subscription) {
    return {
      success: true,
      tier: 'freemium',
      status: 'active',
      usage: {
        aiMaterials: 0,
        aiMaterialsLimit: 3,
        reservations: 0,
        reservationsLimit: 1,
      },
    };
  }

  return {
    success: true,
    tier: subscription.tier,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
    usage: {
      aiMaterials: subscription.aiMaterialsUsed,
      aiMaterialsLimit: getAIMaterialsLimit(subscription.tier),
      reservations: subscription.reservationsUsed,
      reservationsLimit: getReservationsLimit(subscription.tier),
    },
  };
}

/**
 * Execute upgradeSubscription tool
 */
export async function executeUpgradeSubscription(
  args: z.infer<typeof upgradeSubscriptionSchema>
) {
  const validated = upgradeSubscriptionSchema.parse(args);

  // Note: Actual Stripe integration will be implemented separately
  // This is a placeholder that returns the checkout URL

  return {
    success: true,
    message: `Please complete payment to upgrade to ${validated.newTier} plan`,
    checkoutUrl: `/dashboard/subscription/checkout?tier=${validated.newTier}`,
    requiresPayment: true,
  };
}

// ============================================================================
// Tool Router
// ============================================================================

export type ToolName =
  | 'searchAvailableSlots'
  | 'createReservation'
  | 'generateStudyMaterial'
  | 'getSubscriptionStatus'
  | 'upgradeSubscription';

/**
 * Execute a tool by name with arguments
 */
export async function executeTool(toolName: ToolName, args: unknown) {
  switch (toolName) {
    case 'searchAvailableSlots':
      return executeSearchAvailableSlots(args as z.infer<typeof searchAvailableSlotsSchema>);
    case 'createReservation':
      return executeCreateReservation(args as z.infer<typeof createReservationSchema>);
    case 'generateStudyMaterial':
      return executeGenerateStudyMaterial(args as z.infer<typeof generateStudyMaterialSchema>);
    case 'getSubscriptionStatus':
      return executeGetSubscriptionStatus(args as z.infer<typeof getSubscriptionStatusSchema>);
    case 'upgradeSubscription':
      return executeUpgradeSubscription(args as z.infer<typeof upgradeSubscriptionSchema>);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAIMaterialsLimit(tier: string): number {
  switch (tier) {
    case 'freemium':
    case 'starter':
      return 3;
    case 'basic':
      return -1; // unlimited
    case 'premium':
      return -1; // unlimited
    default:
      return 3;
  }
}

function getReservationsLimit(tier: string): number {
  switch (tier) {
    case 'freemium':
    case 'starter':
      return 1;
    case 'basic':
      return 5;
    case 'premium':
      return -1; // unlimited
    default:
      return 1;
  }
}
