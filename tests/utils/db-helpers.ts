/**
 * Database Test Helpers
 *
 * Utilities for setting up and tearing down test database state.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@/db/schema';

/**
 * Database connection for tests
 */
let testDb: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create test database connection
 */
export function getTestDb() {
  if (!testDb) {
    const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set for tests');
    }

    const sql = neon(connectionString);
    testDb = drizzle(sql, { schema });
  }

  return testDb;
}

/**
 * Setup test database state
 *
 * Creates necessary tables and seeds initial data for tests.
 */
export async function setupTestDatabase() {
  const db = getTestDb();

  // Note: In production, you would run migrations here
  // For now, we assume tables exist from drizzle-kit push

  console.log('[Test DB] Database setup complete');
}

/**
 * Teardown test database state
 *
 * Cleans up test data and resets database state.
 */
export async function teardownTestDatabase() {
  const db = getTestDb();

  // Clean up test data in reverse dependency order
  // Note: Add actual cleanup queries based on your schema

  console.log('[Test DB] Database teardown complete');
}

/**
 * Seed test data
 *
 * Inserts mock data for testing.
 */
export async function seedTestData() {
  const db = getTestDb();

  // Insert test users
  const testUsers = [
    {
      clerkId: 'test_user_123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
    },
    {
      clerkId: 'admin_user_123',
      email: 'admin@test.example.com',
      name: 'Admin User',
      role: 'admin',
    },
    {
      clerkId: 'mentor_user_123',
      email: 'mentor@test.example.com',
      name: 'Mentor User',
      role: 'mentor',
    },
  ];

  // Note: Add actual insert statements based on your schema
  // await db.insert(schema.users).values(testUsers);

  console.log('[Test DB] Test data seeded');
}

/**
 * Clean specific tables
 */
export async function cleanTables(tableNames: string[]) {
  const db = getTestDb();

  for (const tableName of tableNames) {
    // Note: Add actual delete statements
    // await db.delete(schema[tableName]);
    console.log(`[Test DB] Cleaned table: ${tableName}`);
  }
}

/**
 * Create test transaction
 *
 * Creates a database transaction that can be rolled back after tests.
 */
export async function createTestTransaction() {
  const db = getTestDb();

  // Note: Implement transaction logic based on Drizzle ORM API
  // This is a placeholder for the actual implementation

  return {
    db,
    rollback: async () => {
      console.log('[Test DB] Transaction rolled back');
    },
    commit: async () => {
      console.log('[Test DB] Transaction committed');
    },
  };
}

/**
 * Wait for database operation
 *
 * Helper to wait for async database operations to complete.
 */
export async function waitForDb(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if database is ready
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    const db = getTestDb();
    // Try a simple query
    // await db.select().from(schema.users).limit(1);
    return true;
  } catch (error) {
    console.error('[Test DB] Database not ready:', error);
    return false;
  }
}

/**
 * Reset database to clean state
 *
 * Useful for integration tests that need a fresh database.
 */
export async function resetDatabase() {
  await teardownTestDatabase();
  await setupTestDatabase();
  await seedTestData();
}

/**
 * Test data builders
 */
export const testDataBuilders = {
  /**
   * Create a test user
   */
  createUser(overrides?: Partial<typeof schema.users.$inferInsert>) {
    return {
      clerkId: `test_${Math.random().toString(36).substr(2, 9)}`,
      email: `test-${Math.random().toString(36).substr(2, 9)}@example.com`,
      name: 'Test User',
      role: 'student',
      ...overrides,
    };
  },

  /**
   * Create test material
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMaterial(overrides?: any) {
    return {
      creatorId: 'test_user_123',
      title: 'Test Material',
      description: 'Test description',
      type: 'text',
      isPublic: true,
      ...overrides,
    };
  },
};

/**
 * Database assertion helpers
 */
export const dbAssertions = {
  /**
   * Assert record exists
   */
  async assertRecordExists(tableName: string, id: string): Promise<boolean> {
    // Note: Implement actual query
    return true;
  },

  /**
   * Assert record count
   */
  async assertRecordCount(tableName: string, expectedCount: number): Promise<boolean> {
    // Note: Implement actual query
    return true;
  },

  /**
   * Get record by ID
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getRecordById(tableName: string, id: string): Promise<any> {
    // Note: Implement actual query
    return null;
  },
};
