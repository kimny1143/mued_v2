/**
 * Unit tests for Performance Measurement Utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  PerformanceMeasurement,
  measurePerformance,
  benchmark,
  ThroughputMeasurement,
} from './test-performance';

describe('PerformanceMeasurement', () => {
  describe('measure', () => {
    it('should measure async function latency', async () => {
      const perf = new PerformanceMeasurement();

      const { result, latency } = await perf.measure(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'test result';
      });

      expect(result).toBe('test result');
      expect(latency).toBeGreaterThan(90);
      expect(latency).toBeLessThan(150);
    });

    it('should accumulate multiple measurements', async () => {
      const perf = new PerformanceMeasurement();

      for (let i = 0; i < 5; i++) {
        await perf.measure(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      const metrics = perf.getMetrics();
      expect(metrics.count).toBe(5);
      expect(metrics.latency).toBeGreaterThan(0);
    });
  });

  describe('measureSync', () => {
    it('should measure synchronous function latency', () => {
      const perf = new PerformanceMeasurement();

      const { result, latency } = perf.measureSync(() => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(49995000);
      expect(latency).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    it('should calculate correct percentiles', async () => {
      const perf = new PerformanceMeasurement();

      // Add known measurements
      const measurements = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      for (const ms of measurements) {
        await perf.measure(async () => {
          await new Promise(resolve => setTimeout(resolve, ms));
        });
      }

      const metrics = perf.getMetrics();

      expect(metrics.count).toBe(10);
      expect(metrics.min).toBeGreaterThan(0);
      expect(metrics.max).toBeGreaterThan(metrics.min);
      expect(metrics.p50).toBeGreaterThan(metrics.min);
      expect(metrics.p50).toBeLessThan(metrics.max);
      expect(metrics.p95).toBeGreaterThan(metrics.p50);
      expect(metrics.p99).toBeGreaterThan(metrics.p95);
    });

    it('should handle empty measurements', () => {
      const perf = new PerformanceMeasurement();
      const metrics = perf.getMetrics();

      expect(metrics.count).toBe(0);
      expect(metrics.latency).toBe(0);
      expect(metrics.p50).toBe(0);
      expect(metrics.p95).toBe(0);
      expect(metrics.p99).toBe(0);
    });

    it('should calculate standard deviation', async () => {
      const perf = new PerformanceMeasurement();

      // Add measurements with known variance
      for (let i = 0; i < 10; i++) {
        await perf.measure(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      const metrics = perf.getMetrics();
      expect(metrics.stdDev).toBeGreaterThan(0);
    });
  });

  describe('getPercentile', () => {
    it('should return correct percentile values', async () => {
      const perf = new PerformanceMeasurement();

      // Manually add measurements (simulating latencies 1-100ms)
      for (let i = 1; i <= 100; i++) {
        (perf as any).measurements.push(i);
      }

      expect(perf.getPercentile(0)).toBe(1);
      expect(perf.getPercentile(50)).toBeGreaterThan(40);
      expect(perf.getPercentile(50)).toBeLessThan(60);
      expect(perf.getPercentile(100)).toBe(100);
    });
  });

  describe('assertLatency', () => {
    it('should pass when latency meets threshold', async () => {
      const perf = new PerformanceMeasurement();

      for (let i = 0; i < 10; i++) {
        await perf.measure(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      expect(() => perf.assertLatency(100, 95)).not.toThrow();
    });

    it('should throw when latency exceeds threshold', async () => {
      const perf = new PerformanceMeasurement();

      for (let i = 0; i < 10; i++) {
        await perf.measure(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      expect(() => perf.assertLatency(50, 95)).toThrow(/exceeds/);
    });
  });

  describe('reset', () => {
    it('should clear all measurements', async () => {
      const perf = new PerformanceMeasurement();

      for (let i = 0; i < 5; i++) {
        await perf.measure(async () => Promise.resolve());
      }

      expect(perf.getMetrics().count).toBe(5);

      perf.reset();
      expect(perf.getMetrics().count).toBe(0);
    });
  });
});

describe('measurePerformance', () => {
  it('should measure performance with specified iterations', async () => {
    const metrics = await measurePerformance(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      },
      5
    );

    expect(metrics.count).toBe(5);
    expect(metrics.latency).toBeGreaterThan(0);
  });

  it('should handle single iteration', async () => {
    const metrics = await measurePerformance(
      async () => Promise.resolve('test'),
      1
    );

    expect(metrics.count).toBe(1);
  });
});

describe('benchmark', () => {
  it('should compare multiple functions', async () => {
    const results = await benchmark(
      {
        fast: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        slow: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        },
      },
      5
    );

    expect(results.fast).toBeDefined();
    expect(results.slow).toBeDefined();
    expect(results.fast.latency).toBeLessThan(results.slow.latency);
  });
});

describe('ThroughputMeasurement', () => {
  describe('start and stop', () => {
    it('should measure operations per second', async () => {
      const throughput = new ThroughputMeasurement();

      throughput.start();

      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
        throughput.record();
      }

      const opsPerSecond = throughput.stop();

      expect(opsPerSecond).toBeGreaterThan(0);
      expect(opsPerSecond).toBeLessThan(100); // Should be less than 100 ops/sec
    });

    it('should throw if stop called before start', () => {
      const throughput = new ThroughputMeasurement();
      expect(() => throughput.stop()).toThrow(/start/);
    });
  });

  describe('getCurrentThroughput', () => {
    it('should return current throughput without stopping', async () => {
      const throughput = new ThroughputMeasurement();

      throughput.start();
      throughput.record();
      throughput.record();

      await new Promise(resolve => setTimeout(resolve, 100));

      const current = throughput.getCurrentThroughput();
      expect(current).toBeGreaterThan(0);

      // Should still be able to record more
      throughput.record();
    });

    it('should throw if called before start', () => {
      const throughput = new ThroughputMeasurement();
      expect(() => throughput.getCurrentThroughput()).toThrow(/start/);
    });
  });

  describe('reset', () => {
    it('should reset all counters', async () => {
      const throughput = new ThroughputMeasurement();

      throughput.start();
      throughput.record();
      throughput.record();

      throughput.reset();

      throughput.start();
      throughput.record();

      const opsPerSecond = throughput.stop();
      expect(opsPerSecond).toBeGreaterThan(0);
    });
  });
});
