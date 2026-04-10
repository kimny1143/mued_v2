/**
 * glasswerks MCP Tools (Tier 3)
 *
 * Phase 2: submit_inquiry — Write tool for service inquiry submission.
 * Follows save_conversation pattern: DB INSERT → fire-and-forget notification.
 *
 * Security:
 *   - Rate limit: 3 inquiries per hour per user (DB-based)
 *   - Description capped at 2000 chars
 *   - Enum validation for service_type, urgency, language
 *   - Authenticated via existing API key flow (clerk_id)
 */

import type { SQL } from "./tools";

type Row = Record<string, unknown>;

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

async function resolveInternalId(
  sql: SQL,
  clerkId: string
): Promise<string | null> {
  const rows = (await sql`SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1`) as Row[];
  return rows.length > 0 ? (rows[0].id as string) : null;
}

// ========================================
// Tool Definition
// ========================================

export const GLASSWERKS_TOOL_DEFINITIONS = [
  {
    name: "submit_inquiry",
    description:
      "Submit a service inquiry to glasswerks inc. on behalf of the user. " +
      "Use this when: the user has confirmed they want to request professional music production services " +
      "(composition, arrangement, recording, mixing, mastering, sound design) " +
      "AND Hoo has completed the budget-first hearing flow. " +
      "Do NOT call without: (1) user's explicit intent to order, (2) budget range, (3) service type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        service_type: {
          type: "string",
          enum: [
            "composition",
            "arrangement",
            "recording",
            "mixing",
            "mastering",
            "sound_design",
            "other",
          ],
          description: "Primary service category",
        },
        budget_range: {
          type: "string",
          description:
            "User's stated budget range (e.g., '10万円くらい', '$500-1000', 'under 50k JPY')",
        },
        description: {
          type: "string",
          description:
            "Structured summary of user's request — genre, track count, deadline, special requirements. Written by Hoo based on the conversation.",
        },
        urgency: {
          type: "string",
          enum: ["flexible", "within_2_weeks", "within_1_week", "asap"],
          description: "Desired timeline (default: flexible)",
          default: "flexible",
        },
        language: {
          type: "string",
          enum: ["ja", "en"],
          description: "User's preferred communication language",
          default: "ja",
        },
      },
      required: ["service_type", "budget_range", "description"] as string[],
    },
  },
];

// ========================================
// Validation
// ========================================

const VALID_SERVICE_TYPES = [
  "composition",
  "arrangement",
  "recording",
  "mixing",
  "mastering",
  "sound_design",
  "other",
];
const VALID_URGENCIES = ["flexible", "within_2_weeks", "within_1_week", "asap"];
const VALID_LANGUAGES = ["ja", "en"];

// ========================================
// Tool Implementation
// ========================================

export interface SubmitInquiryParams {
  service_type: string;
  budget_range: string;
  description: string;
  urgency?: string;
  language?: string;
}

export async function submitInquiry(
  sql: SQL,
  clerkId: string,
  params: SubmitInquiryParams,
  env: { MUED_API_URL: string; INTERNAL_API_KEY: string }
): Promise<ToolResult> {
  // Validate required fields
  if (!params.service_type || !params.budget_range || !params.description) {
    return textResult(
      "Error: service_type, budget_range, and description are all required."
    );
  }

  // Validate enums
  if (!VALID_SERVICE_TYPES.includes(params.service_type)) {
    return textResult(
      `Error: Invalid service_type "${params.service_type}". Valid values: ${VALID_SERVICE_TYPES.join(", ")}`
    );
  }

  const urgency = params.urgency ?? "flexible";
  if (!VALID_URGENCIES.includes(urgency)) {
    return textResult(
      `Error: Invalid urgency "${urgency}". Valid values: ${VALID_URGENCIES.join(", ")}`
    );
  }

  const language = params.language ?? "ja";
  if (!VALID_LANGUAGES.includes(language)) {
    return textResult(
      `Error: Invalid language "${language}". Valid values: ${VALID_LANGUAGES.join(", ")}`
    );
  }

  // Resolve internal user ID
  const internalId = await resolveInternalId(sql, clerkId);
  if (!internalId) return textResult("Error: User not found.");

  // Rate limit: max 3 per hour per user
  const recentCount = (await sql`
    SELECT COUNT(*) as cnt FROM glasswerks_inquiries
    WHERE user_id = ${internalId} AND created_at > NOW() - INTERVAL '1 hour'
  `) as Row[];
  if (Number(recentCount[0].cnt) >= 3) {
    return textResult(
      "1時間あたりの問い合わせ上限（3件）に達しています。少し時間をおいて再度お試しください。"
    );
  }

  // Get user info for notification
  const userRows = (await sql`
    SELECT email, name FROM users WHERE id = ${internalId} LIMIT 1
  `) as Row[];
  const user = userRows[0] ?? {};

  // Cap description length
  const desc = params.description.slice(0, 2000);

  // Insert inquiry
  const inserted = (await sql`
    INSERT INTO glasswerks_inquiries (
      user_id, clerk_id, service_type, budget_range,
      description, urgency, language, status
    ) VALUES (
      ${internalId}, ${clerkId}, ${params.service_type}, ${params.budget_range},
      ${desc}, ${urgency}, ${language}, 'pending'
    ) RETURNING id, created_at
  `) as Row[];

  if (inserted.length === 0) {
    return textResult("Error: Failed to save inquiry.");
  }

  const inquiryId = inserted[0].id as string;
  const inquiryNumber = `GW-${inquiryId.slice(0, 8).toUpperCase()}`;

  // Trigger notification (fire-and-forget)
  if (env.MUED_API_URL && env.INTERNAL_API_KEY) {
    fetch(`${env.MUED_API_URL}/api/glasswerks/inquiry/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": env.INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        inquiryId,
        inquiryNumber,
        userId: internalId,
        userEmail: user.email ?? null,
        userName: user.name ?? null,
        serviceType: params.service_type,
        budgetRange: params.budget_range,
        description: desc,
        urgency,
        language,
      }),
    }).catch(() => {});
  }

  // Service type display names
  const serviceNames: Record<string, string> = {
    composition: "Composition (作曲)",
    arrangement: "Arrangement (編曲)",
    recording: "Recording (レコーディング)",
    mixing: "Mixing (ミキシング)",
    mastering: "Mastering (マスタリング)",
    sound_design: "Sound Design (音響設計)",
    other: "Other",
  };

  return textResult(
    `問い合わせを送信しました。\n\n` +
      `- **問い合わせ番号**: ${inquiryNumber}\n` +
      `- **サービス**: ${serviceNames[params.service_type] ?? params.service_type}\n` +
      `- **予算感**: ${params.budget_range}\n\n` +
      `glasswerksチームが確認次第、連絡します。通常1-2営業日以内に返信します。`
  );
}
