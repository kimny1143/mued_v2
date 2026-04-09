/**
 * MUEDial MCP Tools (Tier 2)
 *
 * 5 read-only tools for MUEDial session management:
 *   get_dial_session_status  — Complete session state snapshot
 *   get_dial_chat_history    — Hoo dialogue + parameter changes
 *   get_dial_credit_balance  — Subscription + credit packs
 *   get_dial_task_details    — Single task detail (RoEx job)
 *   get_dial_phase_and_actions — Phase detection + available actions
 *
 * Design: Same patterns as Tier 1 — data only, markdown output, stateless.
 */

import type { SQL } from "./tools";

type Row = Record<string, unknown>;

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

// ========================================
// Tool Definitions
// ========================================

export const DIAL_TOOL_DEFINITIONS = [
  {
    name: "get_dial_session_status",
    description:
      "Get complete MUEDial AI mixing session state — mode, status, uploaded tracks, processing tasks, limits, and mix analysis. Use this when: the user asks about their mix session progress, wants to check track uploads, or needs to know the current state of an AI mixing/mastering job.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session_id: {
          type: "string",
          description: "UUID of the dial session",
        },
      },
      required: ["session_id"] as string[],
    },
  },
  {
    name: "get_dial_chat_history",
    description:
      "Get the Hoo conversation history for a MUEDial AI mixing session, including parameter change proposals and mixing actions taken. Use this when: the user asks what Hoo suggested for their mix, wants to review past mixing decisions, or needs context on parameter changes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session_id: {
          type: "string",
          description: "UUID of the dial session",
        },
        limit: {
          type: "number",
          description: "Number of messages to return (default 20, max 100)",
          default: 20,
        },
      },
      required: ["session_id"] as string[],
    },
  },
  {
    name: "get_dial_credit_balance",
    description:
      "Get the user's MUEDial AI mixing credit balance — subscription tier, remaining credits, credit packs, and cost per action. Use this when: the user asks about credits, pricing, how many mixes they can do, or wants to understand MUEDial costs.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_dial_task_details",
    description:
      "Get details of a specific MUEDial mixing/mastering task — processing status, download URLs, FX settings applied, and credits consumed. Use this when: the user asks about a specific mix result, wants download links, or needs to see what effects were applied.",
    inputSchema: {
      type: "object" as const,
      properties: {
        task_id: {
          type: "string",
          description: "UUID of the dial task",
        },
        include_fx_settings: {
          type: "boolean",
          description: "Include the full FX chain settings (default false)",
          default: false,
        },
      },
      required: ["task_id"] as string[],
    },
  },
  {
    name: "get_dial_phase_and_actions",
    description:
      "Detect the current phase of a MUEDial AI mixing session and list what actions are available or blocked (with reasons). Use this when: the user asks 'what can I do next?', wants to know their options in a mix session, or needs guidance on the mixing workflow.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session_id: {
          type: "string",
          description: "UUID of the dial session",
        },
      },
      required: ["session_id"] as string[],
    },
  },
];

// ========================================
// Session Ownership Verification
// ========================================

async function verifySessionOwnership(
  sql: SQL,
  sessionId: string,
  clerkId: string
): Promise<Row | null> {
  const rows = (await sql`
    SELECT * FROM dial_sessions WHERE id = ${sessionId} LIMIT 1
  `) as Row[];

  if (rows.length === 0) return null;

  const session = rows[0];
  // Ownership: session belongs to this clerk user
  if (session.user_id === clerkId) return session;

  // No match — deny access
  return null;
}

// ========================================
// Tool 1: get_dial_session_status
// ========================================

export async function getDialSessionStatus(
  sql: SQL,
  clerkId: string,
  params: { session_id: string }
): Promise<ToolResult> {
  const session = await verifySessionOwnership(sql, params.session_id, clerkId);
  if (!session) return textResult("Session not found or access denied.");

  // Fetch tracks and tasks in parallel
  const [trackRows, taskRows] = await Promise.all([
    sql`SELECT id, original_filename, instrument_group, presence_setting,
               pan_preference, reverb_preference, uploaded_at
        FROM dial_tracks WHERE session_id = ${params.session_id}
        ORDER BY uploaded_at ASC` as Promise<Row[]>,
    sql`SELECT id, task_type, status, credits_consumed,
               preview_url, final_url, stems_urls,
               created_at, completed_at
        FROM dial_tasks WHERE session_id = ${params.session_id}
        ORDER BY created_at DESC` as Promise<Row[]>,
  ]);

  const sections: string[] = ["# MUEDial Session Status"];

  // Session info
  sections.push(`\n## Session`);
  sections.push(`- **ID**: ${session.id}`);
  sections.push(`- **Mode**: ${session.mode || "mastering-only"}`);
  sections.push(`- **Mastering**: ${session.mastering_mode || "none"}`);
  sections.push(`- **Status**: ${session.status}`);
  sections.push(`- **Style**: ${session.musical_style}`);
  if (session.title) sections.push(`- **Title**: ${session.title}`);
  sections.push(`- **Payment**: ${session.payment_status}`);
  sections.push(
    `- **Created**: ${new Date(session.created_at as string).toISOString().slice(0, 16)}`
  );

  // Limits
  sections.push(`\n## Limits & Counters`);
  sections.push(`- **Previews**: ${session.preview_count}${session.mode === "omakase" ? "/5" : " (unlimited)"}`);
  sections.push(`- **Mix Checks**: ${session.mix_check_count}/2`);
  const totalCycleLimit =
    (session.base_cycle_limit as number) +
    (session.additional_cycles_purchased as number);
  sections.push(
    `- **Paid Cycles**: ${session.paid_cycle_count}/${totalCycleLimit} (base ${session.base_cycle_limit} + purchased ${session.additional_cycles_purchased})`
  );

  // Tracks
  sections.push(`\n## Tracks (${trackRows.length})`);
  if (trackRows.length === 0) {
    sections.push("No tracks uploaded yet.");
  } else {
    sections.push("| # | Filename | Instrument | Presence | Pan | Reverb |");
    sections.push("|---|----------|------------|----------|-----|--------|");
    trackRows.forEach((t, i) => {
      sections.push(
        `| ${i + 1} | ${t.original_filename} | ${t.instrument_group} | ${t.presence_setting} | ${t.pan_preference} | ${t.reverb_preference} |`
      );
    });
  }

  // Tasks
  sections.push(`\n## Tasks (${taskRows.length})`);
  if (taskRows.length === 0) {
    sections.push("No tasks yet.");
  } else {
    sections.push("| Type | Status | Credits | Created | Completed |");
    sections.push("|------|--------|---------|---------|-----------|");
    for (const t of taskRows) {
      const created = new Date(t.created_at as string)
        .toISOString()
        .slice(0, 16);
      const completed = t.completed_at
        ? new Date(t.completed_at as string).toISOString().slice(0, 16)
        : "—";
      sections.push(
        `| ${t.task_type} | ${t.status} | ${t.credits_consumed ?? "—"} | ${created} | ${completed} |`
      );
    }
  }

  // Analysis
  if (session.analysis_result) {
    const analysis = session.analysis_result as Record<string, unknown>;
    sections.push(`\n## Mix Analysis`);
    if (analysis.lufs !== undefined) sections.push(`- **LUFS**: ${analysis.lufs}`);
    if (analysis.peak !== undefined) sections.push(`- **Peak**: ${analysis.peak}`);
    if (analysis.stereoWidth !== undefined)
      sections.push(`- **Stereo Width**: ${analysis.stereoWidth}`);
  }

  // Reference track
  if (session.reference_track_filename) {
    sections.push(`\n## Reference Track`);
    sections.push(`- **File**: ${session.reference_track_filename}`);
    if (session.reference_analysis_result) {
      const ref = session.reference_analysis_result as Record<string, unknown>;
      if (ref.lufs !== undefined) sections.push(`- **Reference LUFS**: ${ref.lufs}`);
    }
  }

  return textResult(sections.join("\n"));
}

// ========================================
// Tool 2: get_dial_chat_history
// ========================================

export async function getDialChatHistory(
  sql: SQL,
  clerkId: string,
  params: { session_id: string; limit?: number }
): Promise<ToolResult> {
  const session = await verifySessionOwnership(sql, params.session_id, clerkId);
  if (!session) return textResult("Session not found or access denied.");

  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

  const msgRows = (await sql`
    SELECT id, role, content, parameter_changes, action, created_at
    FROM dial_messages WHERE session_id = ${params.session_id}
    ORDER BY created_at ASC LIMIT ${limit}
  `) as Row[];

  if (msgRows.length === 0) {
    return textResult("# MUEDial Chat History\n\nNo messages yet.");
  }

  const sections: string[] = [
    `# MUEDial Chat History (${msgRows.length} messages)`,
  ];

  // Summary
  const userMsgs = msgRows.filter((m) => m.role === "user").length;
  const assistantMsgs = msgRows.filter((m) => m.role === "assistant").length;
  const actionsUsed = msgRows
    .filter((m) => m.action)
    .map((m) => m.action as string);
  sections.push(`\n- User messages: ${userMsgs}`);
  sections.push(`- Hoo messages: ${assistantMsgs}`);
  if (actionsUsed.length > 0) {
    sections.push(`- Actions proposed: ${actionsUsed.join(", ")}`);
  }

  // Messages
  sections.push(`\n## Messages\n`);
  for (const msg of msgRows) {
    const role = msg.role === "user" ? "**User**" : "**Hoo**";
    const time = new Date(msg.created_at as string)
      .toISOString()
      .slice(11, 16);
    sections.push(`${role} (${time}):`);
    sections.push(`${msg.content}\n`);

    if (msg.action) {
      sections.push(`> Action: \`${msg.action}\``);
    }

    if (msg.parameter_changes) {
      const changes = msg.parameter_changes as Array<{
        track: string;
        changes: Record<string, unknown>;
        reason: string;
      }>;
      if (changes.length > 0) {
        sections.push(`> Parameter changes:`);
        for (const change of changes) {
          sections.push(
            `>   - **${change.track}**: ${JSON.stringify(change.changes)} — ${change.reason}`
          );
        }
      }
    }
  }

  return textResult(sections.join("\n"));
}

// ========================================
// Tool 3: get_dial_credit_balance
// ========================================

export async function getDialCreditBalance(
  sql: SQL,
  clerkId: string
): Promise<ToolResult> {
  const sections: string[] = ["# MUEDial Credit Balance"];

  // Subscription + credit grants + packs in parallel
  const [subRows, packRows] = await Promise.all([
    sql`SELECT id, tier, status, mix_credits_remaining, mix_credits_total,
               current_period_end, cancel_at_period_end
        FROM dial_subscriptions
        WHERE user_id = ${clerkId} AND status = 'active'
        LIMIT 1` as Promise<Row[]>,
    sql`SELECT pack_size, credits, credits_remaining, expires_at
        FROM dial_credit_packs
        WHERE user_id = ${clerkId}
          AND status = 'completed'
          AND credits_remaining > 0
          AND (expires_at IS NULL OR expires_at > NOW())` as Promise<Row[]>,
  ]);

  let subCredits = 0;
  const sub = subRows[0] ?? null;

  if (sub) {
    // Fetch grant breakdown
    const grantRows = (await sql`
      SELECT credits, credits_remaining, granted_at, expires_at
      FROM dial_credit_expiry
      WHERE subscription_id = ${sub.id}
        AND credits_remaining > 0
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY expires_at ASC
    `) as Row[];

    subCredits = grantRows.reduce(
      (sum, g) => sum + (g.credits_remaining as number),
      0
    );

    sections.push(`\n## Subscription`);
    sections.push(`- **Tier**: ${(sub.tier as string).toUpperCase()}`);
    sections.push(`- **Status**: active`);
    sections.push(
      `- **Plan credits**: ${sub.mix_credits_remaining}/${sub.mix_credits_total}`
    );
    if (sub.current_period_end) {
      sections.push(
        `- **Period ends**: ${new Date(sub.current_period_end as string).toISOString().slice(0, 10)}`
      );
    }
    if (sub.cancel_at_period_end) {
      sections.push(`- **Cancels at period end**: Yes`);
    }

    if (grantRows.length > 0) {
      sections.push(`\n### Credit Grants: ${subCredits}`);
      for (const g of grantRows) {
        const expiry = g.expires_at
          ? new Date(g.expires_at as string).toISOString().slice(0, 10)
          : "no expiry";
        sections.push(
          `  - ${g.credits_remaining}/${g.credits} remaining (${expiry})`
        );
      }
    }
  } else {
    sections.push(`\n## Subscription: None (Free tier)`);
  }

  // Credit packs
  const packCredits = packRows.reduce(
    (sum, p) => sum + (p.credits_remaining as number),
    0
  );
  if (packRows.length > 0) {
    sections.push(`\n## Credit Packs: ${packCredits}`);
    for (const p of packRows) {
      const expiry = p.expires_at
        ? new Date(p.expires_at as string).toISOString().slice(0, 10)
        : "no expiry";
      sections.push(
        `  - ${p.pack_size}: ${p.credits_remaining}/${p.credits} remaining (${expiry})`
      );
    }
  }

  // Total
  const totalCredits = subCredits + packCredits;
  sections.push(`\n## Total Available Credits: ${totalCredits}`);

  // Credit cost reference
  sections.push(`\n## Credit Costs (per action)`);
  sections.push(`| Action | Credits |`);
  sections.push(`|--------|---------|`);
  sections.push(`| Preview (omakase) | 25 |`);
  sections.push(`| Preview (dialogue) | 25 |`);
  sections.push(`| Mix Check | 250 |`);
  sections.push(`| Final (basic/omakase) | 150 |`);
  sections.push(`| Final (advanced/dialogue) | 250 |`);
  sections.push(`| Mastering Preview | FREE |`);
  sections.push(`| Mastering Final | 220 |`);

  return textResult(sections.join("\n"));
}

// ========================================
// Tool 4: get_dial_task_details
// ========================================

export async function getDialTaskDetails(
  sql: SQL,
  clerkId: string,
  params: { task_id: string; include_fx_settings?: boolean }
): Promise<ToolResult> {
  // Fetch task and verify ownership via session
  const taskRows = (await sql`
    SELECT t.*, s.user_id
    FROM dial_tasks t
    JOIN dial_sessions s ON t.session_id = s.id
    WHERE t.id = ${params.task_id}
    LIMIT 1
  `) as Row[];

  if (taskRows.length === 0) return textResult("Task not found.");

  const task = taskRows[0];
  if (task.user_id !== clerkId) {
    return textResult("Task not found or access denied.");
  }

  const sections: string[] = ["# MUEDial Task Details"];

  sections.push(`\n## Task`);
  sections.push(`- **ID**: ${task.id}`);
  sections.push(`- **Session**: ${task.session_id}`);
  sections.push(`- **Type**: ${task.task_type}`);
  sections.push(`- **Status**: ${task.status}`);
  sections.push(`- **RoEx Task**: ${task.roex_task_id}`);
  if (task.credits_consumed != null) {
    sections.push(`- **Credits consumed**: ${task.credits_consumed}`);
  }

  // Timestamps
  sections.push(`\n## Timestamps`);
  sections.push(
    `- **Created**: ${new Date(task.created_at as string).toISOString().slice(0, 19)}`
  );
  if (task.completed_at) {
    sections.push(
      `- **Completed**: ${new Date(task.completed_at as string).toISOString().slice(0, 19)}`
    );
  }

  // URLs
  const hasUrls = task.preview_url || task.final_url || task.r2_final_url;
  if (hasUrls) {
    sections.push(`\n## Deliverables`);
    if (task.preview_url) sections.push(`- **Preview**: ${task.preview_url}`);
    if (task.final_url) sections.push(`- **Final**: ${task.final_url}`);
    if (task.r2_final_url) {
      const expiryStr = task.r2_expires_at
        ? new Date(task.r2_expires_at as string).toISOString().slice(0, 10)
        : "unknown";
      sections.push(`- **R2 Download**: ${task.r2_final_url} (expires ${expiryStr})`);
    }
    if (task.stems_urls) {
      const stems = task.stems_urls as Record<string, string>;
      sections.push(`\n### Processed Stems`);
      for (const [name, url] of Object.entries(stems)) {
        sections.push(`  - ${name}: ${url}`);
      }
    }
  }

  // FX settings
  if (params.include_fx_settings && task.fx_settings) {
    const fx = task.fx_settings as Record<string, unknown>;
    sections.push(`\n## FX Settings`);
    sections.push("```json");
    sections.push(JSON.stringify(fx, null, 2));
    sections.push("```");
  } else if (task.fx_settings) {
    sections.push(`\n## FX Settings: Available (pass include_fx_settings=true to view)`);
  }

  // Preview params snapshot
  if (task.preview_params) {
    const pp = task.preview_params as {
      musicalStyle?: string;
      tracks?: Array<{ filename: string; instrumentGroup: string }>;
    };
    sections.push(`\n## Preview Parameters Snapshot`);
    if (pp.musicalStyle) sections.push(`- **Style**: ${pp.musicalStyle}`);
    if (pp.tracks?.length) {
      sections.push(`- **Tracks**: ${pp.tracks.map((t) => `${t.filename} (${t.instrumentGroup})`).join(", ")}`);
    }
  }

  return textResult(sections.join("\n"));
}

// ========================================
// Tool 5: get_dial_phase_and_actions
// ========================================

interface PhaseAction {
  action: string;
  available: boolean;
  reason?: string;
}

export async function getDialPhaseAndActions(
  sql: SQL,
  clerkId: string,
  params: { session_id: string }
): Promise<ToolResult> {
  const session = await verifySessionOwnership(sql, params.session_id, clerkId);
  if (!session) return textResult("Session not found or access denied.");

  const taskRows = (await sql`
    SELECT task_type, status FROM dial_tasks
    WHERE session_id = ${params.session_id}
    ORDER BY created_at DESC
  `) as Row[];

  const mode = session.mode as string | null;
  const status = session.status as string;
  const previewCount = session.preview_count as number;
  const mixCheckCount = session.mix_check_count as number;
  const paidCycleCount = session.paid_cycle_count as number;
  const baseCycleLimit = session.base_cycle_limit as number;
  const additionalPurchased = session.additional_cycles_purchased as number;
  const totalCycleLimit = baseCycleLimit + additionalPurchased;
  const hasMastering = !!session.mastering_mode;

  const hasCompletedPreview = taskRows.some(
    (t) => t.task_type === "preview" && t.status === "completed"
  );
  const hasCompletedFinal = taskRows.some(
    (t) =>
      (t.task_type === "final_basic" || t.task_type === "final_advanced") &&
      t.status === "completed"
  );
  const hasCompletedMasteringPreview = taskRows.some(
    (t) => t.task_type === "mastering_preview" && t.status === "completed"
  );
  const hasProcessingTask = taskRows.some((t) => t.status === "processing");

  // Detect phase
  let phase: string;
  let phaseDescription: string;
  if (status === "completed" || status === "archived") {
    phase = "Completed";
    phaseDescription = "Session is finished.";
  } else if (status === "mastering" || (hasCompletedFinal && hasMastering)) {
    phase = "Phase 3: Mastering";
    phaseDescription = "Mix is locked. Mastering preview and final available.";
  } else if (hasCompletedPreview && mode === "dialogue") {
    phase = "Phase 2: Dialogue";
    phaseDescription =
      "Preview exists. Mix check and final mix available via Hoo dialogue.";
  } else if (hasCompletedPreview && mode === "omakase") {
    phase = "Phase 2: Omakase Final";
    phaseDescription =
      "Preview exists. Can generate more previews or go to final.";
  } else {
    phase = "Phase 1: Upload & Preview";
    phaseDescription =
      "Upload tracks and generate first preview.";
  }

  // Build actions
  const actions: PhaseAction[] = [];

  // Upload
  actions.push({
    action: "upload_tracks",
    available: status === "uploading" || status === "previewing",
    reason:
      status !== "uploading" && status !== "previewing"
        ? `Session status is "${status}"`
        : undefined,
  });

  // Preview
  if (mode === "omakase") {
    actions.push({
      action: "generate_preview",
      available: previewCount < 5 && !hasProcessingTask,
      reason:
        previewCount >= 5
          ? "Preview limit reached (5/5)"
          : hasProcessingTask
            ? "A task is currently processing"
            : undefined,
    });
  } else {
    actions.push({
      action: "generate_preview",
      available: !hasProcessingTask,
      reason: hasProcessingTask
        ? "A task is currently processing"
        : undefined,
    });
  }

  // Mix check (dialogue only)
  if (mode === "dialogue") {
    actions.push({
      action: "request_mix_check",
      available:
        hasCompletedPreview &&
        mixCheckCount < 2 &&
        paidCycleCount < totalCycleLimit &&
        !hasProcessingTask,
      reason: !hasCompletedPreview
        ? "No preview exists yet"
        : mixCheckCount >= 2
          ? "Mix check limit reached (2/2)"
          : paidCycleCount >= totalCycleLimit
            ? `Cycle limit reached (${paidCycleCount}/${totalCycleLimit})`
            : hasProcessingTask
              ? "A task is currently processing"
              : undefined,
    });
  }

  // Final mix
  actions.push({
    action: "generate_final",
    available:
      hasCompletedPreview &&
      paidCycleCount < totalCycleLimit &&
      !hasProcessingTask,
    reason: !hasCompletedPreview
      ? "No preview exists yet"
      : paidCycleCount >= totalCycleLimit
        ? `Cycle limit reached (${paidCycleCount}/${totalCycleLimit})`
        : hasProcessingTask
          ? "A task is currently processing"
          : undefined,
  });

  // Mastering
  if (hasMastering) {
    actions.push({
      action: "mastering_preview",
      available: hasCompletedFinal && !hasProcessingTask,
      reason: !hasCompletedFinal
        ? "Final mix not yet complete"
        : hasProcessingTask
          ? "A task is currently processing"
          : undefined,
    });

    actions.push({
      action: "mastering_final",
      available: hasCompletedMasteringPreview && !hasProcessingTask,
      reason: !hasCompletedMasteringPreview
        ? "Mastering preview not yet complete"
        : hasProcessingTask
          ? "A task is currently processing"
          : undefined,
    });
  }

  // Purchase additional cycles
  actions.push({
    action: "purchase_additional_cycles",
    available: paidCycleCount >= totalCycleLimit,
    reason:
      paidCycleCount < totalCycleLimit
        ? `Cycles still available (${paidCycleCount}/${totalCycleLimit})`
        : undefined,
  });

  // Build output
  const sections: string[] = ["# MUEDial Phase & Actions"];

  sections.push(`\n## Current Phase: ${phase}`);
  sections.push(phaseDescription);

  sections.push(`\n## Session Context`);
  sections.push(`- **Mode**: ${mode || "mastering-only"}`);
  sections.push(`- **Status**: ${status}`);
  sections.push(`- **Mastering**: ${hasMastering ? "yes" : "no"}`);
  sections.push(
    `- **Previews**: ${previewCount}${mode === "omakase" ? "/5" : ""}`
  );
  if (mode === "dialogue") {
    sections.push(`- **Mix Checks**: ${mixCheckCount}/2`);
  }
  sections.push(`- **Paid Cycles**: ${paidCycleCount}/${totalCycleLimit}`);

  // Available actions
  const available = actions.filter((a) => a.available);
  const blocked = actions.filter((a) => !a.available);

  sections.push(`\n## Available Actions (${available.length})`);
  if (available.length === 0) {
    sections.push("No actions available.");
  } else {
    for (const a of available) {
      sections.push(`- \`${a.action}\``);
    }
  }

  if (blocked.length > 0) {
    sections.push(`\n## Blocked Actions (${blocked.length})`);
    for (const a of blocked) {
      sections.push(`- \`${a.action}\`: ${a.reason}`);
    }
  }

  return textResult(sections.join("\n"));
}
