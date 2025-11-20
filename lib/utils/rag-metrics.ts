/**
 * RAG Quality Metrics Calculator
 *
 * Implements standard information retrieval metrics for evaluating
 * Retrieval-Augmented Generation (RAG) search quality.
 *
 * Key Metrics:
 * - Recall@K: Proportion of relevant results in top K
 * - Precision@K: Proportion of retrieved results that are relevant
 * - MRR (Mean Reciprocal Rank): Quality of first relevant result
 * - NDCG@K (Normalized Discounted Cumulative Gain): Ranking quality
 *
 * @example
 * ```typescript
 * const results = ['doc1', 'doc3', 'doc5'];
 * const groundTruth = ['doc1', 'doc2', 'doc3'];
 *
 * const recall = calculateRecallAtK(results, groundTruth, 5);
 * const mrr = calculateMRR(results, groundTruth);
 * const precision = calculatePrecisionAtK(results, groundTruth, 3);
 * ```
 */

export interface RAGMetrics {
  /** Recall@K: Fraction of relevant documents retrieved in top K */
  recallAtK: number;
  /** Precision@K: Fraction of retrieved documents that are relevant */
  precisionAtK: number;
  /** Mean Reciprocal Rank: 1 / rank of first relevant result */
  mrr: number;
  /** F1 Score: Harmonic mean of precision and recall */
  f1Score: number;
  /** Number of hits (relevant results found) */
  hits: number;
  /** Total relevant documents available */
  totalRelevant: number;
  /** Total documents retrieved */
  totalRetrieved: number;
}

export interface NDCGMetrics {
  /** NDCG@K: Normalized Discounted Cumulative Gain at K */
  ndcgAtK: number;
  /** DCG@K: Discounted Cumulative Gain at K */
  dcgAtK: number;
  /** IDCG@K: Ideal Discounted Cumulative Gain at K */
  idcgAtK: number;
}

export interface RAGEvaluationResult {
  /** Query that was evaluated */
  query: string;
  /** Retrieved document IDs */
  retrievedIds: string[];
  /** Ground truth relevant document IDs */
  relevantIds: string[];
  /** Calculated metrics */
  metrics: RAGMetrics;
  /** NDCG metrics (if relevance scores provided) */
  ndcg?: NDCGMetrics;
}

/**
 * Calculates Recall@K
 *
 * Recall@K = (Number of relevant items in top K) / (Total number of relevant items)
 *
 * @param results Retrieved document IDs (in order)
 * @param groundTruth Relevant document IDs
 * @param k Number of top results to consider (default: 5)
 * @returns Recall score between 0 and 1
 */
export function calculateRecallAtK(
  results: string[],
  groundTruth: string[],
  k: number = 5
): number {
  if (groundTruth.length === 0) return 0;

  const topK = results.slice(0, k);
  const relevantSet = new Set(groundTruth);
  const hits = topK.filter(r => relevantSet.has(r)).length;

  return hits / groundTruth.length;
}

/**
 * Calculates Precision@K
 *
 * Precision@K = (Number of relevant items in top K) / K
 *
 * @param results Retrieved document IDs (in order)
 * @param groundTruth Relevant document IDs
 * @param k Number of top results to consider (default: 5)
 * @returns Precision score between 0 and 1
 */
export function calculatePrecisionAtK(
  results: string[],
  groundTruth: string[],
  k: number = 5
): number {
  if (k === 0) return 0;

  const topK = results.slice(0, k);
  const relevantSet = new Set(groundTruth);
  const hits = topK.filter(r => relevantSet.has(r)).length;

  return hits / Math.min(k, topK.length);
}

/**
 * Calculates Mean Reciprocal Rank (MRR)
 *
 * MRR = 1 / rank of first relevant result
 * Returns 0 if no relevant results found
 *
 * @param results Retrieved document IDs (in order)
 * @param groundTruth Relevant document IDs
 * @returns MRR score between 0 and 1
 */
export function calculateMRR(
  results: string[],
  groundTruth: string[]
): number {
  const relevantSet = new Set(groundTruth);

  for (let i = 0; i < results.length; i++) {
    if (relevantSet.has(results[i])) {
      return 1 / (i + 1);
    }
  }

  return 0;
}

/**
 * Calculates F1 Score
 *
 * F1 = 2 * (Precision * Recall) / (Precision + Recall)
 *
 * @param precision Precision score
 * @param recall Recall score
 * @returns F1 score between 0 and 1
 */
export function calculateF1Score(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Calculates comprehensive RAG metrics for a single query
 *
 * @param results Retrieved document IDs (in order)
 * @param groundTruth Relevant document IDs
 * @param k Number of top results to consider (default: 5)
 * @returns Complete RAG metrics object
 */
export function calculateRAGMetrics(
  results: string[],
  groundTruth: string[],
  k: number = 5
): RAGMetrics {
  const topK = results.slice(0, k);
  const relevantSet = new Set(groundTruth);
  const hits = topK.filter(r => relevantSet.has(r)).length;

  const recall = calculateRecallAtK(results, groundTruth, k);
  const precision = calculatePrecisionAtK(results, groundTruth, k);
  const mrr = calculateMRR(results, groundTruth);
  const f1Score = calculateF1Score(precision, recall);

  return {
    recallAtK: recall,
    precisionAtK: precision,
    mrr,
    f1Score,
    hits,
    totalRelevant: groundTruth.length,
    totalRetrieved: Math.min(k, results.length),
  };
}

/**
 * Calculates Discounted Cumulative Gain (DCG)
 *
 * DCG@K = Σ (relevance_i / log2(i + 1)) for i in [1, K]
 *
 * @param relevanceScores Relevance scores for each position (0-5 scale)
 * @param k Number of top results to consider
 * @returns DCG score
 */
export function calculateDCG(relevanceScores: number[], k?: number): number {
  const limit = k ?? relevanceScores.length;
  let dcg = 0;

  for (let i = 0; i < Math.min(limit, relevanceScores.length); i++) {
    const relevance = relevanceScores[i];
    const position = i + 1;
    dcg += relevance / Math.log2(position + 1);
  }

  return dcg;
}

/**
 * Calculates Normalized Discounted Cumulative Gain (NDCG)
 *
 * NDCG@K = DCG@K / IDCG@K
 * where IDCG is the ideal DCG (relevance scores sorted descending)
 *
 * @param relevanceScores Relevance scores for retrieved results (in order)
 * @param k Number of top results to consider
 * @returns NDCG metrics object
 */
export function calculateNDCG(
  relevanceScores: number[],
  k?: number
): NDCGMetrics {
  const limit = k ?? relevanceScores.length;

  const dcgAtK = calculateDCG(relevanceScores, limit);

  // Calculate ideal DCG (sorted descending)
  const sortedScores = [...relevanceScores].sort((a, b) => b - a);
  const idcgAtK = calculateDCG(sortedScores, limit);

  const ndcgAtK = idcgAtK === 0 ? 0 : dcgAtK / idcgAtK;

  return {
    ndcgAtK,
    dcgAtK,
    idcgAtK,
  };
}

/**
 * Evaluates RAG performance across multiple queries
 *
 * @param evaluations Array of query evaluation results
 * @returns Aggregated metrics
 */
export function aggregateRAGMetrics(
  evaluations: RAGEvaluationResult[]
): RAGMetrics & { queryCount: number } {
  if (evaluations.length === 0) {
    return {
      recallAtK: 0,
      precisionAtK: 0,
      mrr: 0,
      f1Score: 0,
      hits: 0,
      totalRelevant: 0,
      totalRetrieved: 0,
      queryCount: 0,
    };
  }

  const sum = evaluations.reduce(
    (acc, result) => ({
      recallAtK: acc.recallAtK + result.metrics.recallAtK,
      precisionAtK: acc.precisionAtK + result.metrics.precisionAtK,
      mrr: acc.mrr + result.metrics.mrr,
      f1Score: acc.f1Score + result.metrics.f1Score,
      hits: acc.hits + result.metrics.hits,
      totalRelevant: acc.totalRelevant + result.metrics.totalRelevant,
      totalRetrieved: acc.totalRetrieved + result.metrics.totalRetrieved,
    }),
    {
      recallAtK: 0,
      precisionAtK: 0,
      mrr: 0,
      f1Score: 0,
      hits: 0,
      totalRelevant: 0,
      totalRetrieved: 0,
    }
  );

  const count = evaluations.length;

  return {
    recallAtK: sum.recallAtK / count,
    precisionAtK: sum.precisionAtK / count,
    mrr: sum.mrr / count,
    f1Score: sum.f1Score / count,
    hits: sum.hits,
    totalRelevant: sum.totalRelevant,
    totalRetrieved: sum.totalRetrieved,
    queryCount: count,
  };
}

/**
 * Evaluates a single query with comprehensive metrics
 *
 * @param query The query string
 * @param retrievedIds Retrieved document IDs
 * @param relevantIds Ground truth relevant document IDs
 * @param k Number of top results to consider
 * @param relevanceScores Optional relevance scores for NDCG calculation
 * @returns Complete evaluation result
 */
export function evaluateRAGQuery(
  query: string,
  retrievedIds: string[],
  relevantIds: string[],
  k: number = 5,
  relevanceScores?: number[]
): RAGEvaluationResult {
  const metrics = calculateRAGMetrics(retrievedIds, relevantIds, k);

  const result: RAGEvaluationResult = {
    query,
    retrievedIds: retrievedIds.slice(0, k),
    relevantIds,
    metrics,
  };

  if (relevanceScores) {
    result.ndcg = calculateNDCG(relevanceScores, k);
  }

  return result;
}

/**
 * Prints a formatted report of RAG metrics
 */
export function printRAGMetricsReport(
  metrics: RAGMetrics,
  title?: string
): void {
  if (title) {
    console.log(`\n=== ${title} ===`);
  } else {
    console.log('\n=== RAG Metrics Report ===');
  }

  console.log(`Recall@K: ${(metrics.recallAtK * 100).toFixed(2)}%`);
  console.log(`Precision@K: ${(metrics.precisionAtK * 100).toFixed(2)}%`);
  console.log(`MRR: ${metrics.mrr.toFixed(4)}`);
  console.log(`F1 Score: ${(metrics.f1Score * 100).toFixed(2)}%`);
  console.log(`Hits: ${metrics.hits}/${metrics.totalRelevant}`);
  console.log(`Retrieved: ${metrics.totalRetrieved}`);
  console.log('===========================\n');
}

/**
 * Helper to create ground truth test data
 */
export interface GroundTruthEntry {
  query: string;
  relevantIds: string[];
  relevanceScores?: number[];
}

/**
 * Validates that RAG metrics meet minimum thresholds
 */
export function assertRAGQuality(
  metrics: RAGMetrics,
  thresholds: {
    minRecall?: number;
    minPrecision?: number;
    minMRR?: number;
    minF1?: number;
  }
): void {
  const errors: string[] = [];

  if (thresholds.minRecall !== undefined && metrics.recallAtK < thresholds.minRecall) {
    errors.push(
      `Recall@K ${metrics.recallAtK.toFixed(4)} is below threshold ${thresholds.minRecall}`
    );
  }

  if (thresholds.minPrecision !== undefined && metrics.precisionAtK < thresholds.minPrecision) {
    errors.push(
      `Precision@K ${metrics.precisionAtK.toFixed(4)} is below threshold ${thresholds.minPrecision}`
    );
  }

  if (thresholds.minMRR !== undefined && metrics.mrr < thresholds.minMRR) {
    errors.push(
      `MRR ${metrics.mrr.toFixed(4)} is below threshold ${thresholds.minMRR}`
    );
  }

  if (thresholds.minF1 !== undefined && metrics.f1Score < thresholds.minF1) {
    errors.push(
      `F1 Score ${metrics.f1Score.toFixed(4)} is below threshold ${thresholds.minF1}`
    );
  }

  if (errors.length > 0) {
    throw new Error(`RAG quality check failed:\n${errors.join('\n')}`);
  }
}
