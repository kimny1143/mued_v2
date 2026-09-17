/**
 * Reconcile recent completed FastSpring masterchain orders against the two local fulfillment facts:
 * a received webhook_events row and a non-empty masterchain_purchases.license_key.
 *
 * Live:
 *   npx tsx scripts/ops/reconcile-fastspring-orders.ts [--days 8]
 * Fixture (no API or database credentials required):
 *   npx tsx scripts/ops/reconcile-fastspring-orders.ts --dry-run --fixture ./fixture.json
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const FASTSPRING_ORDERS_URL = "https://api.fastspring.com/orders";
const PRODUCT_PATH = "muedsp-masterchain";
const DATABASE_PRODUCT_ID = "muedsp_masterchain";
const PAGE_LIMIT = 50;
const DEFAULT_DAYS = 8;
const DAY_MS = 24 * 60 * 60 * 1_000;

export interface DatabaseOrderState {
  orderId: string;
  webhookEventId: string | null;
  webhookStatus: string | null;
  hasLicense: boolean;
}

export interface MissingDatabaseOrder {
  orderId: string;
  missingWebhook: boolean;
  missingLicense: boolean;
}

export interface ReconciliationReport {
  matched: string[];
  missingInDb: MissingDatabaseOrder[];
  presentInDbButNotInFastspring: string[];
}

export type ReconciliationExitCode = 0 | 1 | 3;

export interface QueryOrdersInput {
  days: number;
  fastspringOrderIds: readonly string[];
  since: Date;
}

export type QueryOrders = (input: QueryOrdersInput) => Promise<DatabaseOrderState[]>;

interface FastspringCredentials {
  username: string;
  password: string;
}

interface FetchFastspringOrderIdsInput {
  days: number;
  credentials: FastspringCredentials;
  fetchImpl?: typeof fetch;
}

interface FastspringOrdersPage {
  page?: number;
  limit?: number;
  nextPage?: number;
  total?: number;
  orders: string[];
}

interface RunReconciliationInput {
  days: number;
  fetchOrders: (days: number) => Promise<string[]>;
  queryOrders: QueryOrders;
  now?: Date;
}

interface FixtureFile {
  fastspringOrderIds: string[];
  databaseOrders: DatabaseOrderState[];
}

interface CliOptions {
  days: number;
  dryRun: boolean;
  fixturePath?: string;
  help: boolean;
}

export interface MainDependencies {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  createQuery?: (databaseUrl: string) => QueryOrders;
  loadEnvironment?: () => Promise<void> | void;
  log?: (message: string) => void;
  logError?: (message: string) => void;
}

interface WebhookRow {
  event_id: string;
  status: string;
  order_id: string | null;
  items: unknown;
}

interface PurchaseRow {
  order_id: string;
  license_key: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseOrdersPage(value: unknown): FastspringOrdersPage {
  if (!isRecord(value) || !Array.isArray(value.orders) ||
      !value.orders.every((order) => typeof order === "string" && order.length > 0)) {
    throw new Error("FastSpring Orders API returned an invalid orders payload");
  }
  if (value.result !== undefined && value.result !== "success") {
    throw new Error(`FastSpring Orders API reported result=${String(value.result)}`);
  }

  for (const key of ["page", "limit", "nextPage", "total"] as const) {
    const field = value[key];
    if (field !== undefined && field !== null && (!Number.isInteger(field) || (field as number) < 0)) {
      throw new Error(`FastSpring Orders API returned an invalid ${key}`);
    }
  }

  return {
    page: value.page as number | undefined,
    limit: value.limit as number | undefined,
    nextPage: value.nextPage === null ? undefined : value.nextPage as number | undefined,
    total: value.total as number | undefined,
    orders: value.orders,
  };
}

export async function fetchFastspringOrderIds({
  days,
  credentials,
  fetchImpl = fetch,
}: FetchFastspringOrderIdsInput): Promise<string[]> {
  const authorization = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
  const orderIds: string[] = [];
  const visitedPages = new Set<number>();
  let page = 1;

  while (!visitedPages.has(page)) {
    visitedPages.add(page);
    const url = new URL(FASTSPRING_ORDERS_URL);
    url.searchParams.set("days", String(days));
    url.searchParams.set("products", PRODUCT_PATH);
    url.searchParams.set("status", "completed");
    url.searchParams.set("scope", "live");
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("page", String(page));

    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authorization}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "MUED-FastSpring-Reconciliation/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`FastSpring Orders API returned ${response.status} ${response.statusText}`.trim());
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("FastSpring Orders API returned invalid JSON");
    }
    const result = parseOrdersPage(body);
    orderIds.push(...result.orders);

    if (result.nextPage !== undefined && result.nextPage > page) {
      page = result.nextPage;
      continue;
    }
    if (result.total !== undefined && orderIds.length < result.total && result.orders.length > 0) {
      page += 1;
      continue;
    }
    break;
  }

  return orderIds;
}

function mergeDatabaseOrders(rows: readonly DatabaseOrderState[]): Map<string, DatabaseOrderState> {
  const merged = new Map<string, DatabaseOrderState>();
  for (const row of rows) {
    const prior = merged.get(row.orderId);
    merged.set(row.orderId, {
      orderId: row.orderId,
      webhookEventId: prior?.webhookEventId ?? row.webhookEventId,
      webhookStatus: prior?.webhookStatus ?? row.webhookStatus,
      hasLicense: Boolean(prior?.hasLicense || row.hasLicense),
    });
  }
  return merged;
}

export function reconcileOrderIds(
  fastspringOrderIds: readonly string[],
  databaseOrders: readonly DatabaseOrderState[],
): ReconciliationReport {
  const fastspring = new Set(fastspringOrderIds);
  const database = mergeDatabaseOrders(databaseOrders);
  const matched: string[] = [];
  const missingInDb: MissingDatabaseOrder[] = [];

  for (const orderId of fastspring) {
    const row = database.get(orderId);
    const missingWebhook = !row?.webhookEventId;
    const missingLicense = !row?.hasLicense;
    if (missingWebhook || missingLicense) {
      missingInDb.push({ orderId, missingWebhook, missingLicense });
    } else {
      matched.push(orderId);
    }
  }

  return {
    matched: matched.sort(),
    missingInDb: missingInDb.sort((a, b) => a.orderId.localeCompare(b.orderId)),
    presentInDbButNotInFastspring: [...database.keys()]
      .filter((orderId) => !fastspring.has(orderId))
      .sort(),
  };
}

export async function runReconciliation({
  days,
  fetchOrders,
  queryOrders,
  now = new Date(),
}: RunReconciliationInput): Promise<{ report: ReconciliationReport; exitCode: 0 | 1 }> {
  const fastspringOrderIds = await fetchOrders(days);
  const databaseOrders = await queryOrders({
    days,
    fastspringOrderIds,
    since: new Date(now.getTime() - days * DAY_MS),
  });
  const report = reconcileOrderIds(fastspringOrderIds, databaseOrders);
  return { report, exitCode: report.missingInDb.length > 0 ? 1 : 0 };
}

function webhookContainsProduct(items: unknown): boolean {
  return Array.isArray(items) && items.some((item) =>
    isRecord(item) && item.product === PRODUCT_PATH);
}

/**
 * Read candidate rows in one bounded window, plus any older rows whose IDs FastSpring returned.
 * Including the explicit FastSpring IDs avoids a false "missing" at the exact date-window boundary.
 */
export function createDatabaseQuery(databaseUrl: string): QueryOrders {
  return async ({ fastspringOrderIds, since }) => {
    const [{ Pool, neonConfig }, wsModule] = await Promise.all([
      import("@neondatabase/serverless"),
      import("ws"),
    ]);
    neonConfig.webSocketConstructor = wsModule.default;
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const [webhookResult, purchaseResult] = await Promise.all([
        pool.query(
          `SELECT
             event_id,
             status,
             COALESCE(
               NULLIF(payload #>> '{data,order}', ''),
               NULLIF(payload #>> '{data,id}', ''),
               NULLIF(payload ->> 'id', '')
             ) AS order_id,
             payload #> '{data,items}' AS items
           FROM webhook_events
           WHERE source = 'fastspring'
             AND type = 'order.completed'
             AND (
               (
                 created_at >= $1
                 AND payload ->> 'live' = 'true'
               )
               OR COALESCE(
                 NULLIF(payload #>> '{data,order}', ''),
                 NULLIF(payload #>> '{data,id}', ''),
                 NULLIF(payload ->> 'id', '')
               ) = ANY($2::text[])
             )`,
          [since, fastspringOrderIds],
        ),
        pool.query(
          `SELECT order_id, license_key
           FROM masterchain_purchases
           WHERE product_id = $1
             AND (created_at >= $2 OR order_id = ANY($3::text[]))`,
          [DATABASE_PRODUCT_ID, since, fastspringOrderIds],
        ),
      ]);

      const webhookRows = webhookResult.rows as WebhookRow[];
      const purchaseRows = purchaseResult.rows as PurchaseRow[];
      const apiIds = new Set(fastspringOrderIds);
      const purchases = new Map(purchaseRows.map((row) => [row.order_id, row]));
      const states: DatabaseOrderState[] = [];

      for (const webhook of webhookRows) {
        if (!webhook.order_id) continue;
        const purchase = purchases.get(webhook.order_id);
        // API IDs are already product-filtered. Reverse-only webhook rows must prove their product.
        if (!apiIds.has(webhook.order_id) && !purchase && !webhookContainsProduct(webhook.items)) continue;
        states.push({
          orderId: webhook.order_id,
          webhookEventId: webhook.event_id,
          webhookStatus: webhook.status,
          hasLicense: Boolean(purchase?.license_key?.trim()),
        });
      }

      const ordersWithWebhook = new Set(states.map((state) => state.orderId));
      for (const purchase of purchaseRows) {
        if (ordersWithWebhook.has(purchase.order_id)) continue;
        states.push({
          orderId: purchase.order_id,
          webhookEventId: null,
          webhookStatus: null,
          hasLicense: Boolean(purchase.license_key?.trim()),
        });
      }
      return states;
    } finally {
      await pool.end();
    }
  };
}

function parsePositiveDays(raw: string): number {
  const days = Number(raw);
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error(`--days must be a positive integer (received ${JSON.stringify(raw)})`);
  }
  return days;
}

export function parseCliArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = { days: DEFAULT_DAYS, dryRun: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--days") {
      const value = args[index + 1];
      if (!value) throw new Error("--days requires a value");
      options.days = parsePositiveDays(value);
      index += 1;
    } else if (arg === "--fixture") {
      const value = args[index + 1];
      if (!value) throw new Error("--fixture requires a JSON file path");
      options.fixturePath = value;
      index += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (options.fixturePath && !options.dryRun) {
    throw new Error("--fixture must be used with --dry-run");
  }
  if (options.dryRun && !options.fixturePath) {
    throw new Error("--dry-run requires --fixture <json>");
  }
  return options;
}

function parseDatabaseOrderState(value: unknown): DatabaseOrderState {
  if (!isRecord(value) || typeof value.orderId !== "string" || value.orderId.length === 0 ||
      !(typeof value.webhookEventId === "string" || value.webhookEventId === null) ||
      !(typeof value.webhookStatus === "string" || value.webhookStatus === null) ||
      typeof value.hasLicense !== "boolean") {
    throw new Error("Fixture contains an invalid databaseOrders entry");
  }
  return {
    orderId: value.orderId,
    webhookEventId: value.webhookEventId,
    webhookStatus: value.webhookStatus,
    hasLicense: value.hasLicense,
  };
}

export async function readFixture(path: string): Promise<FixtureFile> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not read fixture ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(value) || !Array.isArray(value.fastspringOrderIds) ||
      !value.fastspringOrderIds.every((id) => typeof id === "string" && id.length > 0) ||
      !Array.isArray(value.databaseOrders)) {
    throw new Error("Fixture must contain fastspringOrderIds[] and databaseOrders[]");
  }
  return {
    fastspringOrderIds: value.fastspringOrderIds,
    databaseOrders: value.databaseOrders.map(parseDatabaseOrderState),
  };
}

export function formatReport(report: ReconciliationReport, days: number, mode: "live" | "fixture"): string {
  const lines = [
    `FastSpring order reconciliation: product=${PRODUCT_PATH} days=${days} mode=${mode}`,
    `matched (${report.matched.length})`,
    ...report.matched.map((orderId) => `  ${orderId}`),
    `missing-in-db (${report.missingInDb.length})`,
    ...report.missingInDb.map((missing) => {
      const reasons = [
        missing.missingWebhook ? "webhook_events" : null,
        missing.missingLicense ? "issued license" : null,
      ].filter((reason): reason is string => reason !== null);
      return `  ${missing.orderId} [missing: ${reasons.join(", ")}]`;
    }),
    `present-in-db-but-not-in-fastspring (${report.presentInDbButNotInFastspring.length})`,
    ...report.presentInDbButNotInFastspring.map((orderId) => `  ${orderId}`),
  ];
  return lines.join("\n");
}

function usage(): string {
  return [
    "Usage:",
    "  npm run ops:reconcile-fastspring-orders -- [--days 8]",
    "  npm run ops:reconcile-fastspring-orders -- --dry-run --fixture <json> [--days 8]",
  ].join("\n");
}

async function loadDotenv(): Promise<void> {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
}

export async function main(
  args = process.argv.slice(2),
  dependencies: MainDependencies = {},
): Promise<ReconciliationExitCode> {
  const log = dependencies.log ?? console.log;
  const logError = dependencies.logError ?? console.error;

  try {
    const options = parseCliArgs(args);
    if (options.help) {
      log(usage());
      return 0;
    }

    let result: Awaited<ReturnType<typeof runReconciliation>>;
    let mode: "live" | "fixture";
    if (options.fixturePath) {
      const fixture = await readFixture(options.fixturePath);
      mode = "fixture";
      result = await runReconciliation({
        days: options.days,
        fetchOrders: async () => fixture.fastspringOrderIds,
        queryOrders: async () => fixture.databaseOrders,
      });
    } else {
      const env = dependencies.env ?? process.env;
      await (dependencies.loadEnvironment ?? loadDotenv)();
      const required = [
        "FASTSPRING_API_USERNAME",
        "FASTSPRING_API_PASSWORD",
        "DATABASE_URL",
      ] as const;
      const missing = required.filter((name) => !env[name]);
      if (missing.length > 0) {
        throw new Error(
          `Refusing live reconciliation: missing required environment variables: ${missing.join(", ")}`,
        );
      }

      const username = env.FASTSPRING_API_USERNAME as string;
      const password = env.FASTSPRING_API_PASSWORD as string;
      const databaseUrl = env.DATABASE_URL as string;
      mode = "live";
      result = await runReconciliation({
        days: options.days,
        fetchOrders: (days) => fetchFastspringOrderIds({
          days,
          credentials: { username, password },
          fetchImpl: dependencies.fetchImpl,
        }),
        queryOrders: (dependencies.createQuery ?? createDatabaseQuery)(databaseUrl),
      });
    }

    log(formatReport(result.report, options.days, mode));
    return result.exitCode;
  } catch (error: unknown) {
    logError(`[reconcile-fastspring-orders] ${error instanceof Error ? error.message : String(error)}`);
    return 3;
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry === import.meta.url) {
  main()
    .then((exitCode) => { process.exitCode = exitCode; })
    .catch((error: unknown) => {
      console.error(`[reconcile-fastspring-orders] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 3;
    });
}
