/**
 * Phase 1.3 Test Helper Functions
 *
 * Utility functions for testing InterviewerService, RAGService, and Interview API.
 * Provides deterministic vector generation, similarity calculations, and database seeding.
 */

/**
 * Generate deterministic embedding vector for testing
 * @param text - Input text
 * @param dim - Vector dimension (default: 1536 for OpenAI ada-002)
 * @returns Deterministic vector based on text hash
 */
export function generateDeterministicVector(text: string, dim = 1536): number[] {
  const hashCode = hashString(text);

  return Array.from({ length: dim }, (_, i) => {
    const value = Math.sin(hashCode + i * 0.1);
    // Normalize to [-1, 1]
    return Math.max(-1, Math.min(1, value));
  });
}

/**
 * Hash a string to a number (for deterministic vector generation)
 * @param text - Input string
 * @returns Hash code as number
 */
export function hashString(text: string): number {
  return text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
}

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity score (0 to 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate Euclidean distance between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Euclidean distance
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 * @param vector - Input vector
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (norm === 0) {
    return vector.map(() => 0);
  }

  return vector.map((val) => val / norm);
}

/**
 * Find top-k most similar vectors
 * @param queryVector - Query vector
 * @param corpus - Array of vectors with metadata
 * @param k - Number of results to return
 * @returns Top-k similar results with scores
 */
export function findTopKSimilar<T>(
  queryVector: number[],
  corpus: Array<{ vector: number[]; metadata: T }>,
  k = 5
): Array<{ similarity: number; metadata: T }> {
  const similarities = corpus.map((item) => ({
    similarity: cosineSimilarity(queryVector, item.vector),
    metadata: item.metadata,
  }));

  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, k);
}

/**
 * Seed test database with Phase 1.3 fixtures
 * @param db - Database connection
 * @param fixtures - Test fixtures to insert
 */
export async function seedTestDatabase(db: any, fixtures: {
  sessions?: any[];
  questionTemplates?: any[];
  embeddings?: any[];
  questions?: any[];
  answers?: any[];
}) {
  // Insert sessions
  if (fixtures.sessions && fixtures.sessions.length > 0) {
    for (const session of fixtures.sessions) {
      await db.execute(`
        INSERT INTO sessions (id, user_id, type, title, user_short_note, ai_annotations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        session.id,
        session.userId,
        session.type,
        session.title,
        session.userShortNote,
        JSON.stringify(session.aiAnnotations),
        session.createdAt,
      ]);
    }
  }

  // Insert question templates
  if (fixtures.questionTemplates && fixtures.questionTemplates.length > 0) {
    for (const template of fixtures.questionTemplates) {
      await db.execute(`
        INSERT INTO question_templates (id, focus, depth, template_text, variables, priority, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        template.id,
        template.focus,
        template.depth,
        template.template,
        JSON.stringify(template.variables || {}),
        template.priority,
      ]);
    }
  }

  // Insert RAG embeddings
  if (fixtures.embeddings && fixtures.embeddings.length > 0) {
    for (const embedding of fixtures.embeddings) {
      await db.execute(`
        INSERT INTO rag_embeddings (id, source_type, source_id, embedding, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [
        embedding.id,
        embedding.sourceType,
        embedding.sourceId,
        JSON.stringify(embedding.embedding),
        JSON.stringify(embedding.metadata || {}),
        embedding.createdAt,
      ]);
    }
  }

  // Insert interview questions
  if (fixtures.questions && fixtures.questions.length > 0) {
    for (const question of fixtures.questions) {
      await db.execute(`
        INSERT INTO interview_questions (id, session_id, text, focus, depth, "order", generation_method, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        question.id,
        question.sessionId,
        question.text,
        question.focus,
        question.depth,
        question.order,
        question.generationMethod,
        question.createdAt,
      ]);
    }
  }

  // Insert interview answers
  if (fixtures.answers && fixtures.answers.length > 0) {
    for (const answer of fixtures.answers) {
      await db.execute(`
        INSERT INTO interview_answers (id, question_id, text, ai_insights, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        answer.id,
        answer.questionId,
        answer.text,
        JSON.stringify(answer.aiInsights || {}),
        answer.createdAt,
      ]);
    }
  }
}

/**
 * Clear test data from database
 * @param db - Database connection
 * @param tables - Tables to clear (default: all Phase 1.3 tables)
 */
export async function clearTestDatabase(
  db: any,
  tables = ['interview_answers', 'interview_questions', 'rag_embeddings', 'question_templates', 'session_analyses', 'sessions']
) {
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table} WHERE user_id LIKE 'user-test%' OR user_id = 'user-001'`);
  }
}

/**
 * Calculate RAG quality metrics
 * @param retrievedResults - Retrieved session IDs
 * @param expectedResults - Expected session IDs (ground truth)
 * @returns Precision, Recall, F1 score
 */
export function calculateRAGMetrics(
  retrievedResults: string[],
  expectedResults: string[]
): { precision: number; recall: number; f1: number } {
  const expectedSet = new Set(expectedResults);
  const retrievedSet = new Set(retrievedResults);

  const truePositives = retrievedResults.filter((r) => expectedSet.has(r)).length;

  const precision = retrievedResults.length > 0 ? truePositives / retrievedResults.length : 0;
  const recall = expectedResults.length > 0 ? truePositives / expectedResults.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision: Math.round(precision * 1000) / 1000, // Round to 3 decimals
    recall: Math.round(recall * 1000) / 1000,
    f1: Math.round(f1 * 1000) / 1000,
  };
}

/**
 * Calculate Mean Reciprocal Rank (MRR)
 * @param retrievedResults - Retrieved session IDs in order
 * @param expectedResults - Expected session IDs
 * @returns MRR score
 */
export function calculateMRR(retrievedResults: string[], expectedResults: string[]): number {
  const expectedSet = new Set(expectedResults);

  for (let i = 0; i < retrievedResults.length; i++) {
    if (expectedSet.has(retrievedResults[i])) {
      return 1 / (i + 1);
    }
  }

  return 0;
}

/**
 * Calculate Normalized Discounted Cumulative Gain (NDCG)
 * @param retrievedResults - Retrieved session IDs in order
 * @param expectedResults - Expected session IDs with relevance scores
 * @returns NDCG score
 */
export function calculateNDCG(
  retrievedResults: string[],
  expectedResults: Array<{ id: string; relevance: number }>
): number {
  const relevanceMap = new Map(expectedResults.map((r) => [r.id, r.relevance]));

  // Calculate DCG
  const dcg = retrievedResults.reduce((sum, id, index) => {
    const relevance = relevanceMap.get(id) || 0;
    return sum + relevance / Math.log2(index + 2);
  }, 0);

  // Calculate IDCG (ideal DCG)
  const sortedExpected = [...expectedResults].sort((a, b) => b.relevance - a.relevance);
  const idcg = sortedExpected.reduce((sum, item, index) => {
    return sum + item.relevance / Math.log2(index + 2);
  }, 0);

  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Wait for async operation with timeout
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with result or rejects on timeout
 */
export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Retry an async operation with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelayMs - Initial delay in milliseconds
 * @returns Promise that resolves with result or rejects after max retries
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Mock delay for simulating async operations
 * @param ms - Delay in milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format test assertion message
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Additional message
 * @returns Formatted assertion message
 */
export function formatAssertionMessage(actual: any, expected: any, message?: string): string {
  const prefix = message ? `${message}: ` : '';
  return `${prefix}Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`;
}

/**
 * Deep clone an object (for test fixtures)
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two arrays have the same elements (order-independent)
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns True if arrays have same elements
 */
export function haveSameElements<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  const set1 = new Set(arr1);
  const set2 = new Set(arr2);

  return arr1.every((item) => set2.has(item)) && arr2.every((item) => set1.has(item));
}

/**
 * Generate random UUID (for test data)
 * @returns Random UUID
 */
export function generateTestUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create mock timestamp with offset
 * @param offsetMs - Offset from now in milliseconds
 * @returns Date object
 */
export function createMockTimestamp(offsetMs = 0): Date {
  return new Date(Date.now() + offsetMs);
}

/**
 * Validate vector format
 * @param vector - Vector to validate
 * @param expectedDim - Expected dimension
 * @returns True if valid
 */
export function isValidVector(vector: number[], expectedDim = 1536): boolean {
  if (!Array.isArray(vector)) {
    return false;
  }

  if (vector.length !== expectedDim) {
    return false;
  }

  return vector.every((val) => typeof val === 'number' && !isNaN(val));
}

/**
 * Assert vector similarity is above threshold
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @param minSimilarity - Minimum similarity threshold
 * @throws Error if similarity is below threshold
 */
export function assertVectorSimilarity(
  vec1: number[],
  vec2: number[],
  minSimilarity: number
): void {
  const similarity = cosineSimilarity(vec1, vec2);

  if (similarity < minSimilarity) {
    throw new Error(
      `Vector similarity ${similarity.toFixed(3)} is below threshold ${minSimilarity.toFixed(3)}`
    );
  }
}
