/**
 * Unit Tests: useMetricsTracker Hook
 *
 * Testing the metrics tracking hook for practice sessions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMetricsTracker } from '@/hooks/useMetricsTracker';

// Mock api-client module — the hook uses apiClient.post() not raw fetch
const mockPost = vi.fn();
vi.mock('@/lib/api-client', () => ({
  useApiClient: () => ({ post: mockPost }),
  getErrorMessage: (err: unknown) =>
    err instanceof Error ? err.message : String(err),
}));

describe('useMetricsTracker', () => {
  const mockOptions = {
    materialId: 'test-material-id',
    userId: 'test-user-id',
    instrument: 'piano',
    targetTempo: 120,
    sectionsTotal: 8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPost.mockResolvedValue({ success: true, data: {}, status: 200 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Session Lifecycle', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      expect(result.current.isTracking).toBe(false);
      expect(result.current.sectionsCompleted).toBe(0);
      expect(result.current.loopEventsCount).toBe(0);
      expect(result.current.currentTempo).toBe(0);
    });

    it('should start tracking session', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(true);
      expect(result.current.sectionsCompleted).toBe(0);
    });

    it('should stop tracking and save session', async () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(true);

      await act(async () => {
        await result.current.stopTracking();
      });

      expect(result.current.isTracking).toBe(false);
      expect(mockPost).toHaveBeenCalledWith(
        '/api/metrics/save-session',
        expect.objectContaining({
          materialId: mockOptions.materialId,
          userId: mockOptions.userId,
        })
      );
    });

    it('should handle stop without active session', async () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      await act(async () => {
        await result.current.stopTracking();
      });

      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('Metrics Recording', () => {
    it('should mark section as completed', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
        result.current.markSectionCompleted();
      });

      expect(result.current.sectionsCompleted).toBe(1);

      act(() => {
        result.current.markSectionCompleted();
        result.current.markSectionCompleted();
      });

      expect(result.current.sectionsCompleted).toBe(3);
    });

    it('should not exceed total sections', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
        for (let i = 0; i < 10; i++) {
          result.current.markSectionCompleted();
        }
      });

      expect(result.current.sectionsCompleted).toBe(mockOptions.sectionsTotal);
    });

    it('should record loop events', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
        result.current.recordLoopEvent(1, 4, 100);
      });

      expect(result.current.loopEventsCount).toBe(1);

      act(() => {
        result.current.recordLoopEvent(5, 8, 110);
        result.current.recordLoopEvent(1, 2, 120);
      });

      expect(result.current.loopEventsCount).toBe(3);
    });

    it('should update current tempo', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
        result.current.updateTempo(100);
      });

      expect(result.current.currentTempo).toBe(100);

      act(() => {
        result.current.updateTempo(130);
      });

      expect(result.current.currentTempo).toBe(130);
    });
  });

  describe('Auto-save Feature', () => {
    it('should auto-save every 5 minutes', async () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      expect(mockPost).not.toHaveBeenCalled();

      // advanceTimersByTimeAsync flushes both timers and microtasks (promises)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(mockPost).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should stop auto-save when tracking stops', async () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      await act(async () => {
        await result.current.stopTracking();
      });

      // Clear calls from stopTracking save
      vi.clearAllMocks();

      // Fast-forward 5 minutes after stopping
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('Unload Event Handling', () => {
    it('should save on beforeunload event', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalled();
    });

    it('should not prevent unload when not tracking', () => {
      const { result: _result } = renderHook(() => useMetricsTracker(mockOptions));

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API save failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      await act(async () => {
        await result.current.stopTracking();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[MetricsTracker] Error saving session',
        'Network error'
      );

      expect(result.current.isTracking).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle auto-save failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[MetricsTracker] Auto-save failed',
        'Network error'
      );

      expect(result.current.isTracking).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Session Data Integrity', () => {
    it('should send complete session data', async () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
        result.current.markSectionCompleted();
        result.current.markSectionCompleted();
        result.current.recordLoopEvent(1, 4, 100);
        result.current.recordLoopEvent(5, 8, 110);
        result.current.updateTempo(115);
      });

      // Advance time to create duration
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      await act(async () => {
        await result.current.stopTracking();
      });

      expect(mockPost).toHaveBeenCalled();

      // Find the stopTracking call (not the auto-save cleanup call)
      const saveCall = mockPost.mock.calls.find(
        (call: unknown[]) => call[0] === '/api/metrics/save-session'
      );
      expect(saveCall).toBeDefined();
      const body = saveCall![1];

      expect(body).toMatchObject({
        materialId: mockOptions.materialId,
        userId: mockOptions.userId,
        instrument: mockOptions.instrument,
        sectionsCompleted: 2,
        sectionsTotal: mockOptions.sectionsTotal,
        targetTempo: mockOptions.targetTempo,
        achievedTempo: 115,
        duration: 60,
      });

      expect(body.loopEvents).toHaveLength(2);
      expect(body.loopEvents[0]).toMatchObject({
        startBar: 1,
        endBar: 4,
        tempo: 100,
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should clean up on unmount when tracking', async () => {
      const { result, unmount } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(true);

      await act(async () => {
        unmount();
      });

      expect(mockPost).toHaveBeenCalled();
    });

    it('should not save on unmount when not tracking', () => {
      const { unmount } = renderHook(() => useMetricsTracker(mockOptions));

      unmount();

      expect(mockPost).not.toHaveBeenCalled();
    });
  });
});
