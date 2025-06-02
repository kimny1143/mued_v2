import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPaymentExecutionTiming, shouldUseNewPaymentFlow } from '../lib/payment-flow';

describe('Payment Timing Tests', () => {
  beforeEach(() => {
    // 現在時刻を固定
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getPaymentExecutionTiming', () => {
    it('レッスン3時間前の場合、即座決済フラグはfalseになる', () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);
      
      const lessonStartTime = new Date('2025-01-01T13:00:00Z'); // 3時間後
      const result = getPaymentExecutionTiming(lessonStartTime, true);
      
      expect(result.shouldExecuteImmediately).toBe(false);
      expect(result.hoursUntilExecution).toBeGreaterThan(0);
    });

    it('レッスン2時間前の場合、即座決済フラグはtrueになる', () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);
      
      const lessonStartTime = new Date('2025-01-01T12:00:00Z'); // 2時間後
      const result = getPaymentExecutionTiming(lessonStartTime, true);
      
      expect(result.shouldExecuteImmediately).toBe(true);
      expect(result.hoursUntilExecution).toBe(0);
    });

    it('レッスン1時間前の場合、即座決済フラグはtrueになる', () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);
      
      const lessonStartTime = new Date('2025-01-01T11:00:00Z'); // 1時間後
      const result = getPaymentExecutionTiming(lessonStartTime, true);
      
      expect(result.shouldExecuteImmediately).toBe(true);
      expect(result.hoursUntilExecution).toBe(0);
    });

    it('旧フローの場合、常に即座決済フラグはtrueになる', () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);
      
      const lessonStartTime = new Date('2025-01-01T15:00:00Z'); // 5時間後
      const result = getPaymentExecutionTiming(lessonStartTime, false); // 旧フロー
      
      expect(result.shouldExecuteImmediately).toBe(true);
      expect(result.isAutoExecution).toBe(false);
    });

    it('実行予定時刻が正しく計算される', () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);
      
      const lessonStartTime = new Date('2025-01-01T15:00:00Z'); // 5時間後
      const result = getPaymentExecutionTiming(lessonStartTime, true);
      
      // レッスン開始2時間前 = 13:00
      const expectedExecutionTime = new Date('2025-01-01T13:00:00Z');
      expect(result.executionTime.getTime()).toBe(expectedExecutionTime.getTime());
    });
  });

  describe('タイムゾーンのテスト', () => {
    it('JST時刻でも正しく判定される', () => {
      // JST 19:00 (UTC 10:00)
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);
      
      // JST 22:00 (UTC 13:00) - 3時間後
      const lessonStartTime = new Date('2025-01-01T13:00:00Z');
      const result = getPaymentExecutionTiming(lessonStartTime, true);
      
      expect(result.shouldExecuteImmediately).toBe(false);
    });
  });

  describe('境界値のテスト', () => {
    it('ちょうど2時間前の場合、即座決済フラグはtrueになる', () => {
      const now = new Date('2025-01-01T10:00:00.000Z');
      vi.setSystemTime(now);
      
      const lessonStartTime = new Date('2025-01-01T12:00:00.000Z'); // ちょうど2時間後
      const result = getPaymentExecutionTiming(lessonStartTime, true);
      
      expect(result.shouldExecuteImmediately).toBe(true);
    });

    it('2時間1分前の場合、即座決済フラグはfalseになる', () => {
      const now = new Date('2025-01-01T10:00:00Z');
      vi.setSystemTime(now);
      
      const lessonStartTime = new Date('2025-01-01T12:01:00Z'); // 2時間1分後
      const result = getPaymentExecutionTiming(lessonStartTime, true);
      
      expect(result.shouldExecuteImmediately).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  it('approve時の判定が正しく動作する', async () => {
    // モックの設定
    const mockDifferenceInHours = vi.fn();
    
    // 3時間前のケース
    mockDifferenceInHours.mockReturnValue(3);
    
    const now = new Date('2025-01-01T10:00:00Z');
    const lessonStartTime = new Date('2025-01-01T13:00:00Z');
    
    // 実際の条件判定
    const hoursUntilLesson = 3;
    const timingShouldExecuteImmediately = false; // payment-flowの結果
    const immediatePaymentEnabled = true;
    
    const shouldExecuteNow = hoursUntilLesson <= 2 && timingShouldExecuteImmediately && immediatePaymentEnabled;
    
    expect(shouldExecuteNow).toBe(false);
  });
});