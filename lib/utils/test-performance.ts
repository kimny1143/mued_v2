/**
 * Performance Measurement Utility for RAG and AI Testing
 *
 * Provides tools to measure and assert on latency, percentiles, and throughput.
 *
 * @example
 * ```typescript
 * const perf = new PerformanceMeasurement();
 *
 * for (let i = 0; i < 100; i++) {
 *   await perf.measure(() => ragService.search('query'));
 * }
 *
 * const metrics = perf.getMetrics();
 * expect(metrics.p95).toBeLessThan(500);
 * perf.assertLatency(500, 95); // Assert P95 < 500ms
 * ```
 */

export interface PerformanceMetrics {
  /** Mean latency in milliseconds */
  latency: number;
  /** 50th percentile (median) latency in milliseconds */
  p50: number;
  /** 95th percentile latency in milliseconds */
  p95: number;
  /** 99th percentile latency in milliseconds */
  p99: number;
  /** Minimum latency in milliseconds */
  min: number;
  /** Maximum latency in milliseconds */
  max: number;
  /** Total number of measurements */
  count: number;
  /** Standard deviation */
  stdDev: number;
}

export interface MeasurementResult<T> {
  /** The result returned by the measured function */
  result: T;
  /** Latency in milliseconds */
  latency: number;
}

/**
 * Calculates percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  if (p <= 0) return sortedArray[0];
  if (p >= 100) return sortedArray[sortedArray.length - 1];

  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) {
    return sortedArray[lower];
  }

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Calculates mean of array
 */
function mean(array: number[]): number {
  if (array.length === 0) return 0;
  return array.reduce((a, b) => a + b, 0) / array.length;
}

/**
 * Calculates standard deviation
 */
function standardDeviation(array: number[], meanValue?: number): number {
  if (array.length === 0) return 0;
  const avg = meanValue ?? mean(array);
  const squareDiffs = array.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Performance measurement class for tracking latency metrics
 */
export class PerformanceMeasurement {
  private measurements: number[] = [];

  /**
   * Measures the execution time of an async function
   * @param fn The function to measure
   * @returns Object containing the result and latency
   */
  async measure<T>(fn: () => Promise<T>): Promise<MeasurementResult<T>> {
    const start = performance.now();
    const result = await fn();
    const latency = performance.now() - start;

    this.measurements.push(latency);
    return { result, latency };
  }

  /**
   * Measures the execution time of a synchronous function
   * @param fn The function to measure
   * @returns Object containing the result and latency
   */
  measureSync<T>(fn: () => T): MeasurementResult<T> {
    const start = performance.now();
    const result = fn();
    const latency = performance.now() - start;

    this.measurements.push(latency);
    return { result, latency };
  }

  /**
   * Gets all performance metrics
   * @returns PerformanceMetrics object
   */
  getMetrics(): PerformanceMetrics {
    if (this.measurements.length === 0) {
      return {
        latency: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        count: 0,
        stdDev: 0,
      };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const avg = mean(sorted);

    return {
      latency: avg,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: sorted.length,
      stdDev: standardDeviation(sorted, avg),
    };
  }

  /**
   * Gets a specific percentile value
   * @param p Percentile (0-100)
   * @returns Percentile value in milliseconds
   */
  getPercentile(p: number): number {
    if (this.measurements.length === 0) return 0;
    const sorted = [...this.measurements].sort((a, b) => a - b);
    return percentile(sorted, p);
  }

  /**
   * Asserts that a percentile meets a latency requirement
   * @param maxMs Maximum allowed latency in milliseconds
   * @param percentileValue The percentile to check (default: 95)
   * @throws Error if the assertion fails
   */
  assertLatency(maxMs: number, percentileValue: number = 95): void {
    const value = this.getPercentile(percentileValue);
    if (value > maxMs) {
      throw new Error(
        `P${percentileValue} latency ${value.toFixed(2)}ms exceeds ${maxMs}ms`
      );
    }
  }

  /**
   * Asserts that mean latency meets a requirement
   * @param maxMs Maximum allowed mean latency in milliseconds
   * @throws Error if the assertion fails
   */
  assertMeanLatency(maxMs: number): void {
    const metrics = this.getMetrics();
    if (metrics.latency > maxMs) {
      throw new Error(
        `Mean latency ${metrics.latency.toFixed(2)}ms exceeds ${maxMs}ms`
      );
    }
  }

  /**
   * Resets all measurements
   */
  reset(): void {
    this.measurements = [];
  }

  /**
   * Gets the raw measurement data
   * @returns Array of latency measurements in milliseconds
   */
  getRawMeasurements(): number[] {
    return [...this.measurements];
  }

  /**
   * Prints a summary of the performance metrics
   */
  printSummary(): void {
    const metrics = this.getMetrics();
    console.log('\n=== Performance Summary ===');
    console.log(`Samples: ${metrics.count}`);
    console.log(`Mean: ${metrics.latency.toFixed(2)}ms`);
    console.log(`P50: ${metrics.p50.toFixed(2)}ms`);
    console.log(`P95: ${metrics.p95.toFixed(2)}ms`);
    console.log(`P99: ${metrics.p99.toFixed(2)}ms`);
    console.log(`Min: ${metrics.min.toFixed(2)}ms`);
    console.log(`Max: ${metrics.max.toFixed(2)}ms`);
    console.log(`StdDev: ${metrics.stdDev.toFixed(2)}ms`);
    console.log('===========================\n');
  }
}

/**
 * Utility function for quick one-off performance measurements
 * @param fn The function to measure
 * @param iterations Number of iterations (default: 1)
 * @returns Performance metrics
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  iterations: number = 1
): Promise<PerformanceMetrics> {
  const perf = new PerformanceMeasurement();

  for (let i = 0; i < iterations; i++) {
    await perf.measure(fn);
  }

  return perf.getMetrics();
}

/**
 * Benchmarks multiple functions and compares their performance
 * @param benchmarks Map of benchmark name to function
 * @param iterations Number of iterations per benchmark
 * @returns Map of benchmark name to metrics
 */
export async function benchmark<T>(
  benchmarks: Record<string, () => Promise<T>>,
  iterations: number = 100
): Promise<Record<string, PerformanceMetrics>> {
  const results: Record<string, PerformanceMetrics> = {};

  for (const [name, fn] of Object.entries(benchmarks)) {
    const perf = new PerformanceMeasurement();

    for (let i = 0; i < iterations; i++) {
      await perf.measure(fn);
    }

    results[name] = perf.getMetrics();
  }

  return results;
}

/**
 * Utility for measuring throughput (operations per second)
 */
export class ThroughputMeasurement {
  private startTime: number | null = null;
  private endTime: number | null = null;
  private operationCount = 0;

  /**
   * Starts the throughput measurement
   */
  start(): void {
    this.startTime = performance.now();
    this.operationCount = 0;
  }

  /**
   * Records an operation
   */
  record(): void {
    this.operationCount++;
  }

  /**
   * Stops the measurement and returns throughput
   * @returns Operations per second
   */
  stop(): number {
    this.endTime = performance.now();

    if (this.startTime === null || this.endTime === null) {
      throw new Error('Must call start() before stop()');
    }

    const durationSeconds = (this.endTime - this.startTime) / 1000;
    return this.operationCount / durationSeconds;
  }

  /**
   * Gets current throughput without stopping
   * @returns Current operations per second
   */
  getCurrentThroughput(): number {
    if (this.startTime === null) {
      throw new Error('Must call start() first');
    }

    const currentTime = performance.now();
    const durationSeconds = (currentTime - this.startTime) / 1000;
    return this.operationCount / durationSeconds;
  }

  /**
   * Resets the measurement
   */
  reset(): void {
    this.startTime = null;
    this.endTime = null;
    this.operationCount = 0;
  }
}
