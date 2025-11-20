/**
 * Testcontainers Global Setup
 *
 * Manages PostgreSQL + pgvector Docker container for integration tests.
 * This file is used as Vitest's globalSetup.
 *
 * Features:
 * - Starts PostgreSQL 16 with pgvector extension
 * - Initializes database schema
 * - Sets TEST_DATABASE_URL environment variable
 * - Cleans up container after tests
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

let container: StartedPostgreSqlContainer | null = null;

/**
 * Global setup function - runs before all tests
 */
export async function setup(): Promise<() => Promise<void>> {
  console.log('🐳 Starting PostgreSQL + pgvector container...');

  try {
    // Start PostgreSQL container with pgvector extension
    container = await new PostgreSqlContainer('pgvector/pgvector:pg16')
      .withDatabase('test_mued')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();

    const connectionUri = container.getConnectionUri();

    // Set both TEST_DATABASE_URL and DATABASE_URL
    // DATABASE_URL is used by db/index.ts
    // CI=true triggers db/index.ts to use node-postgres instead of neon-serverless
    process.env.TEST_DATABASE_URL = connectionUri;
    process.env.DATABASE_URL = connectionUri;
    process.env.CI = 'true';

    console.log(`✅ Container started: ${container.getHost()}:${container.getPort()}`);
    console.log(`📦 Database: ${container.getDatabase()}`);
    console.log(`🔗 Connection URI: ${connectionUri}`);

    // Initialize database with pgvector extension and test schema
    await initializeDatabase(connectionUri);

    console.log('✅ Database initialization complete');

    // Return teardown function
    return async () => {
      console.log('🧹 Cleaning up testcontainers...');
      if (container) {
        await container.stop();
        console.log('✅ Container stopped');
      }
    };
  } catch (error) {
    console.error('❌ Failed to start testcontainers:', error);
    throw error;
  }
}

/**
 * Initialize database with pgvector extension and test schema
 */
async function initializeDatabase(connectionUri: string): Promise<void> {
  const client = new Client({ connectionString: connectionUri });

  try {
    await client.connect();
    console.log('🔌 Connected to test database');

    // Read initialization SQL
    const sqlPath = path.join(__dirname, 'init-pgvector.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute initialization SQL
    console.log('📝 Running initialization SQL...');
    await client.query(sql);

    // Verify pgvector extension
    const result = await client.query(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
    );

    if (result.rows.length === 0) {
      throw new Error('pgvector extension not installed');
    }

    console.log(`✅ pgvector extension verified: v${result.rows[0].extversion}`);

    // Verify test tables
    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'test_%'
    `);

    console.log(`✅ Created ${tables.rows.length} test table(s):`,
      tables.rows.map(r => r.tablename).join(', '));

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Teardown function is returned from setup()
 * It will be automatically called by Vitest after all tests complete
 */
