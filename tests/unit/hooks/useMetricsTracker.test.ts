/**
 * Unit Tests: useMetricsTracker Hook
 *
 * Testing the metrics tracking hook for practice sessions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMetricsTracker } from '@/hooks/useMetricsTracker';

// Mock fetch globally
global.fetch = vi.fn();

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
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
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

      act(() => {
        result.current.stopTracking();
      });

      await waitFor(() => {
        expect(result.current.isTracking).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metrics/save-session',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('materialId'),
        })
      );
    });

    it('should handle stop without active session', async () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      // Stop without starting
      act(() => {
        result.current.stopTracking();
      });

      expect(global.fetch).not.toHaveBeenCalled();
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
        // Try to complete more than total
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

      expect(global.fetch).not.toHaveBeenCalled();

      // Fast-forward 5 minutes
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward another 5 minutes
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should stop auto-save when tracking stops', async () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      act(() => {
        result.current.stopTracking();
      });

      // Clear fetch calls from stop
      vi.clearAllMocks();

      // Fast-forward 5 minutes after stopping
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      // Should not have called fetch for auto-save
      expect(global.fetch).not.toHaveBeenCalled();
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
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should not prevent unload when not tracking', () => {
      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API save failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      act(() => {
        result.current.stopTracking();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[MetricsTracker] Error saving session:',
          expect.any(Error)
        );
      });

      // Hook should still reset state despite error
      expect(result.current.isTracking).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle auto-save failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMetricsTracker(mockOptions));

      act(() => {
        result.current.startTracking();
      });

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[MetricsTracker] Auto-save failed:',
          expect.any(Error)
        );
      });

      // Should continue tracking despite auto-save failure
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
        vi.advanceTimersByTime(60 * 1000); // 1 minute
      });

      act(() => {
        result.current.stopTracking();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

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

      unmount();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should not save on unmount when not tracking', () => {
      const { unmount } = renderHook(() => useMetricsTracker(mockOptions));

      unmount();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});