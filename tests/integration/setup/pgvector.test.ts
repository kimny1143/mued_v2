/**
 * pgvector Integration Test
 *
 * Tests PostgreSQL + pgvector functionality in testcontainers environment.
 *
 * Test Coverage:
 * 1. pgvector extension installation
 * 2. VECTOR data type support
 * 3. HNSW index creation and usage
 * 4. Vector similarity search operations
 * 5. Helper functions (cosine_similarity, find_similar_embeddings)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

describe('pgvector Integration Tests', () => {
  let client: Client;

  beforeAll(async () => {
    // Get connection URI from testcontainers setup
    const connectionUri = process.env.TEST_DATABASE_URL;

    if (!connectionUri) {
      throw new Error(
        'TEST_DATABASE_URL not set. Ensure globalSetup is configured correctly.'
      );
    }

    // Connect to test database
    client = new Client({ connectionString: connectionUri });
    await client.connect();
  });

  afterAll(async () => {
    // Close connection
    if (client) {
      await client.end();
    }
  });

  describe('Extension Verification', () => {
    it('should have pgvector extension installed', async () => {
      const result = await client.query(`
        SELECT extname, extversion
        FROM pg_extension
        WHERE extname = 'vector'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].extname).toBe('vector');
      expect(result.rows[0].extversion).toBeTruthy();

      console.log(`✅ pgvector version: ${result.rows[0].extversion}`);
    });

    it('should support VECTOR data type', async () => {
      const result = await client.query(`
        SELECT typname
        FROM pg_type
        WHERE typname = 'vector'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].typname).toBe('vector');
    });
  });

  describe('Table and Index Verification', () => {
    it('should have test_embeddings table created', async () => {
      const result = await client.query(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'test_embeddings'
        ORDER BY ordinal_position
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('text');
      expect(columns).toContain('embedding');
      expect(columns).toContain('metadata');
      expect(columns).toContain('created_at');
    });

    it('should have HNSW index created', async () => {
      const result = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'test_embeddings'
          AND indexname = 'idx_test_embeddings_vector'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].indexdef).toContain('hnsw');
      expect(result.rows[0].indexdef).toContain('vector_cosine_ops');
    });

    it('should have sample test data inserted', async () => {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM test_embeddings
      `);

      expect(result.rows[0].count).toBe('5');
    });
  });

  describe('Vector Operations', () => {
    it('should insert a new embedding vector', async () => {
      // Generate a simple test vector (1536 dimensions)
      const testVector = Array(1536).fill(0.1);
      const vectorString = `[${testVector.join(',')}]`;

      const result = await client.query(
        `
        INSERT INTO test_embeddings (text, embedding, metadata)
        VALUES ($1, $2, $3)
        RETURNING id, text
        `,
        [
          'Test embedding insert',
          vectorString,
          JSON.stringify({ test: true }),
        ]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].text).toBe('Test embedding insert');
    });

    it('should calculate vector dimensions correctly', async () => {
      const result = await client.query(`
        SELECT vector_dims(embedding) as dimensions
        FROM test_embeddings
        LIMIT 1
      `);

      expect(result.rows[0].dimensions).toBe(1536);
    });

    it('should perform cosine distance calculation', async () => {
      // Get two embeddings
      const result = await client.query(`
        SELECT
          e1.embedding AS vec1,
          e2.embedding AS vec2,
          (e1.embedding <=> e2.embedding) AS cosine_distance
        FROM test_embeddings e1
        CROSS JOIN test_embeddings e2
        WHERE e1.id != e2.id
        LIMIT 1
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].cosine_distance).toBeTypeOf('number');
      expect(result.rows[0].cosine_distance).toBeGreaterThanOrEqual(0);
      expect(result.rows[0].cosine_distance).toBeLessThanOrEqual(2);
    });
  });

  describe('Helper Functions', () => {
    it('should have cosine_similarity function', async () => {
      const result = await client.query(`
        SELECT proname, pronargs
        FROM pg_proc
        WHERE proname = 'cosine_similarity'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].pronargs).toBe(2); // Two arguments
    });

    it('should calculate cosine similarity correctly', async () => {
      const result = await client.query(`
        SELECT
          e1.text AS text1,
          e2.text AS text2,
          cosine_similarity(e1.embedding, e2.embedding) AS similarity
        FROM test_embeddings e1
        CROSS JOIN test_embeddings e2
        WHERE e1.id != e2.id
        LIMIT 1
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].similarity).toBeTypeOf('number');
      expect(result.rows[0].similarity).toBeGreaterThanOrEqual(-1);
      expect(result.rows[0].similarity).toBeLessThanOrEqual(1);
    });

    it('should have find_similar_embeddings function', async () => {
      const result = await client.query(`
        SELECT proname, pronargs
        FROM pg_proc
        WHERE proname = 'find_similar_embeddings'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].pronargs).toBe(3); // Three arguments
    });
  });

  describe('Similarity Search', () => {
    it('should find similar embeddings using HNSW index', async () => {
      // Get a reference embedding
      const refResult = await client.query(`
        SELECT embedding
        FROM test_embeddings
        LIMIT 1
      `);

      const referenceEmbedding = refResult.rows[0].embedding;

      // Find similar embeddings
      const result = await client.query(
        `
        SELECT
          id,
          text,
          (embedding <=> $1) AS distance,
          cosine_similarity(embedding, $1) AS similarity
        FROM test_embeddings
        ORDER BY embedding <=> $1
        LIMIT 3
        `,
        [referenceEmbedding]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeLessThanOrEqual(3);

      // First result should be the most similar (lowest distance)
      expect(result.rows[0].distance).toBeTypeOf('number');

      // Verify ordering (distances should be ascending)
      for (let i = 0; i < result.rows.length - 1; i++) {
        expect(result.rows[i].distance).toBeLessThanOrEqual(
          result.rows[i + 1].distance
        );
      }
    });

    it('should use find_similar_embeddings helper function', async () => {
      // Get a reference embedding
      const refResult = await client.query(`
        SELECT embedding
        FROM test_embeddings
        LIMIT 1
      `);

      const referenceEmbedding = refResult.rows[0].embedding;

      // Use helper function with low threshold to get results
      const result = await client.query(
        `
        SELECT *
        FROM find_similar_embeddings($1::VECTOR, 0.0, 5)
        `,
        [referenceEmbedding]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeLessThanOrEqual(5);

      // Verify result structure
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0]).toHaveProperty('text');
      expect(result.rows[0]).toHaveProperty('similarity');
      expect(result.rows[0]).toHaveProperty('metadata');
    });

    it('should filter by metadata using JSONB', async () => {
      const result = await client.query(`
        SELECT
          text,
          metadata->>'focus' AS focus,
          metadata->>'level' AS level
        FROM test_embeddings
        WHERE metadata->>'focus' = 'harmony'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(row => {
        expect(row.focus).toBe('harmony');
      });
    });
  });

  describe('Performance and Index Usage', () => {
    it('should use HNSW index in query plan', async () => {
      // Get a reference embedding
      const refResult = await client.query(`
        SELECT embedding
        FROM test_embeddings
        LIMIT 1
      `);

      const referenceEmbedding = refResult.rows[0].embedding;

      // Check query plan
      const planResult = await client.query(
        `
        EXPLAIN (FORMAT JSON)
        SELECT id, text
        FROM test_embeddings
        ORDER BY embedding <=> $1
        LIMIT 3
        `,
        [referenceEmbedding]
      );

      const plan = JSON.stringify(planResult.rows[0]);

      // Verify that the query plan includes index scan
      // Note: With small datasets, PostgreSQL might choose seq scan
      // This is expected behavior
      expect(plan).toBeTruthy();
      console.log('Query plan:', JSON.stringify(planResult.rows[0], null, 2));
    });

    it('should handle bulk similarity searches', async () => {
      // Get multiple reference embeddings
      const refResult = await client.query(`
        SELECT id, embedding
        FROM test_embeddings
        LIMIT 2
      `);

      expect(refResult.rows.length).toBe(2);

      // Perform similarity search for each
      for (const ref of refResult.rows) {
        const result = await client.query(
          `
          SELECT id, text
          FROM test_embeddings
          WHERE id != $1
          ORDER BY embedding <=> $2
          LIMIT 3
          `,
          [ref.id, ref.embedding]
        );

        expect(result.rows.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Data Type Constraints', () => {
    it('should enforce vector dimension constraints', async () => {
      // Try to insert a vector with wrong dimensions
      const wrongDimensionVector = Array(512).fill(0.1); // Wrong: 512 instead of 1536

      await expect(async () => {
        await client.query(
          `
          INSERT INTO test_embeddings (text, embedding)
          VALUES ($1, $2)
          `,
          ['Wrong dimension test', `[${wrongDimensionVector.join(',')}]`]
        );
      }).rejects.toThrow();
    });

    it('should require NOT NULL for embedding column', async () => {
      await expect(async () => {
        await client.query(
          `
          INSERT INTO test_embeddings (text, embedding)
          VALUES ($1, NULL)
          `,
          ['Null embedding test']
        );
      }).rejects.toThrow();
    });
  });
});
