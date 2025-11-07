import { NextRequest } from "next/server";
import { db } from "@/db";
import { provenance, type NewProvenance } from "@/db/schema/rag-metrics";
import { eq, like, and, or, desc } from "drizzle-orm";
import { z } from "zod";
import { withAdminAuth } from "@/lib/middleware/with-auth";
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from "@/lib/api-response";

// Query schema for GET
const querySchema = z.object({
  contentId: z.string().uuid().optional(),
  contentType: z.enum(["material", "creation_log", "generated", "note_article", "ai_response"]).optional(),
  sourceUri: z.string().optional(),
  licenseType: z.enum([
    "cc_by",
    "cc_by_sa",
    "cc_by_nc",
    "cc_by_nc_sa",
    "proprietary",
    "mit",
    "apache_2_0",
    "all_rights_reserved",
    "public_domain",
  ]).optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(), // Search in source_uri and rights_holder
});

// Body schema for POST
const createProvenanceSchema = z.object({
  contentId: z.string().uuid("Invalid content ID"),
  contentType: z.enum(["material", "creation_log", "generated", "note_article", "ai_response"]),
  sourceUri: z.string().url("Invalid source URI").optional(),
  licenseType: z.enum([
    "cc_by",
    "cc_by_sa",
    "cc_by_nc",
    "cc_by_nc_sa",
    "proprietary",
    "mit",
    "apache_2_0",
    "all_rights_reserved",
    "public_domain",
  ]).optional(),
  acquisitionMethod: z.enum(["api_fetch", "manual_upload", "ai_generated", "user_created", "system_import"]).optional(),
  rightsHolder: z.string().max(500).optional(),
  permissionFlag: z.boolean().default(false),
  hashSha256: z.string().optional(),
  retentionYears: z.number().int().min(1).max(100).optional(),
  accessPolicy: z.object({
    readGroups: z.array(z.string()),
    writeGroups: z.array(z.string()),
    expiresAt: z.string().datetime().optional(),
    geoRestrictions: z.array(z.string()).optional(),
    ipWhitelist: z.array(z.string()).optional(),
  }).optional(),
  externalShareConsent: z.boolean().default(false),
  acquiredBy: z.string().uuid().optional(),
  acquiredAt: z.string().datetime().optional(),
});

/**
 * GET /api/admin/provenance
 *
 * List and search provenance records
 *
 * Query parameters:
 * - contentId: UUID (optional)
 * - contentType: enum (optional)
 * - sourceUri: string (optional)
 * - licenseType: enum (optional)
 * - search: string (searches source_uri and rights_holder)
 * - limit: number (1-1000, default: 100)
 * - offset: number (min: 0, default: 0)
 *
 * Authorization: Admin only
 */
export const GET = withAdminAuth(async ({ request }) => {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      contentId: searchParams.get("contentId") || undefined,
      contentType: searchParams.get("contentType") || undefined,
      sourceUri: searchParams.get("sourceUri") || undefined,
      licenseType: searchParams.get("licenseType") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
      return apiValidationError("Invalid query parameters", validation.error.errors);
    }

    const { contentId, contentType, sourceUri, licenseType, limit, offset, search } = validation.data;

    // Build WHERE conditions
    const conditions = [];
    if (contentId) {
      conditions.push(eq(provenance.contentId, contentId));
    }
    if (contentType) {
      conditions.push(eq(provenance.contentType, contentType));
    }
    if (sourceUri) {
      conditions.push(eq(provenance.sourceUri, sourceUri));
    }
    if (licenseType) {
      conditions.push(eq(provenance.licenseType, licenseType));
    }
    if (search) {
      conditions.push(
        or(
          like(provenance.sourceUri, `%${search}%`),
          like(provenance.rightsHolder, `%${search}%`)
        )
      );
    }

    // Build query
    let query = db.select().from(provenance).orderBy(desc(provenance.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Apply pagination
    const records = await query.limit(limit).offset(offset);

    return apiSuccess({
      records,
      pagination: {
        limit,
        offset,
        total: records.length,
        hasMore: records.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching provenance records:", error);
    return apiServerError(
      error instanceof Error ? error : new Error("Failed to fetch provenance records")
    );
  }
});

/**
 * POST /api/admin/provenance
 *
 * Create a new provenance record
 *
 * Authorization: Admin only
 */
export const POST = withAdminAuth(async ({ userId, request }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = createProvenanceSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError("Invalid request body", validation.error.errors);
    }

    const data = validation.data;

    // Create provenance record
    const [newRecord] = await db
      .insert(provenance)
      .values({
        ...data,
        acquiredBy: data.acquiredBy || userId,
        acquiredAt: data.acquiredAt ? new Date(data.acquiredAt) : new Date(),
        lastVerifiedAt: new Date(),
        verificationStatus: "verified",
      } as NewProvenance)
      .returning();

    return apiSuccess(
      { record: newRecord },
      { message: "Provenance record created successfully" }
    );
  } catch (error) {
    console.error("Error creating provenance record:", error);
    return apiServerError(
      error instanceof Error ? error : new Error("Failed to create provenance record")
    );
  }
});
