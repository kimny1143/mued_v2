/**
 * useMetricsTracker Hook
 *
 * プレイヤーでの学習メトリクストラッキング
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LoopEvent, PracticeSession } from '@/lib/metrics/learning-tracker';

export interface UseMetricsTrackerOptions {
  materialId: string;
  userId: string;
  instrument: string;
  targetTempo: number;
  sectionsTotal: number;
}

export interface MetricsTrackerState {
  isTracking: boolean;
  sessionStartTime: Date | null;
  currentTempo: number;
  sectionsCompleted: number;
  loopEvents: LoopEvent[];
}

export function useMetricsTracker(options: UseMetricsTrackerOptions) {
  const { materialId, userId, instrument, targetTempo, sectionsTotal } = options;

  const [state, setState] = useState<MetricsTrackerState>({
    isTracking: false,
    sessionStartTime: null,
    currentTempo: 0,
    sectionsCompleted: 0,
    loopEvents: [],
  });

  const sessionStartTimeRef = useRef<Date | null>(null);

  /**
   * トラッキング開始
   */
  const startTracking = useCallback(() => {
    const now = new Date();
    sessionStartTimeRef.current = now;

    setState((prev) => ({
      ...prev,
      isTracking: true,
      sessionStartTime: now,
      sectionsCompleted: 0,
      loopEvents: [],
    }));

    console.log('[MetricsTracker] Tracking started');
  }, []);

  /**
   * トラッキング停止とセッション保存
   */
  const stopTracking = useCallback(async () => {
    if (!sessionStartTimeRef.current) {
      console.warn('[MetricsTracker] No active session to stop');
      return;
    }

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - sessionStartTimeRef.current.getTime()) / 1000
    );

    const session: PracticeSession = {
      materialId,
      userId,
      instrument,
      startTime: sessionStartTimeRef.current,
      endTime,
      duration,
      sectionsCompleted: state.sectionsCompleted,
      sectionsTotal,
      loopEvents: state.loopEvents,
      targetTempo,
      achievedTempo: state.currentTempo,
    };

    console.log('[MetricsTracker] Session ended:', {
      duration: `${duration}s`,
      sectionsCompleted: session.sectionsCompleted,
      loopEvents: session.loopEvents.length,
    });

    // サーバーに保存
    try {
      const response = await fetch('/api/metrics/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        console.error('[MetricsTracker] Failed to save session:', response.statusText);
      } else {
        console.log('[MetricsTracker] Session saved successfully');
      }
    } catch (error) {
      console.error('[MetricsTracker] Error saving session:', error);
    }

    // ステートをリセット
    setState({
      isTracking: false,
      sessionStartTime: null,
      currentTempo: 0,
      sectionsCompleted: 0,
      loopEvents: [],
    });

    sessionStartTimeRef.current = null;
  }, [materialId, userId, instrument, targetTempo, sectionsTotal, state]);

  /**
   * セクション完了を記録
   */
  const markSectionCompleted = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sectionsCompleted: Math.min(prev.sectionsCompleted + 1, sectionsTotal),
    }));

    console.log('[MetricsTracker] Section completed');
  }, [sectionsTotal]);

  /**
   * ループイベントを記録
   */
  const recordLoopEvent = useCallback(
    (startBar: number, endBar: number, tempo: number) => {
      const event: LoopEvent = {
        startBar,
        endBar,
        timestamp: new Date(),
        tempo,
      };

      setState((prev) => ({
        ...prev,
        loopEvents: [...prev.loopEvents, event],
      }));

      console.log('[MetricsTracker] Loop event recorded:', { startBar, endBar, tempo });
    },
    []
  );

  /**
   * 現在のテンポを更新
   */
  const updateTempo = useCallback((tempo: number) => {
    setState((prev) => ({
      ...prev,
      currentTempo: tempo,
    }));
  }, []);

  /**
   * ページ離脱時に自動保存
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isTracking) {
        stopTracking();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // コンポーネントアンマウント時に自動保存
      if (state.isTracking) {
        stopTracking();
      }
    };
  }, [state.isTracking, stopTracking]);

  /**
   * 一定間隔で自動保存（5分ごと）
   */
  useEffect(() => {
    if (!state.isTracking) return;

    const intervalId = setInterval(
      async () => {
        if (sessionStartTimeRef.current) {
          const now = new Date();
          const duration = Math.floor(
            (now.getTime() - sessionStartTimeRef.current.getTime()) / 1000
          );

          const partialSession: PracticeSession = {
            materialId,
            userId,
            instrument,
            startTime: sessionStartTimeRef.current,
            endTime: now,
            duration,
            sectionsCompleted: state.sectionsCompleted,
            sectionsTotal,
            loopEvents: state.loopEvents,
            targetTempo,
            achievedTempo: state.currentTempo,
          };

          console.log('[MetricsTracker] Auto-saving session...');

          try {
            await fetch('/api/metrics/save-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(partialSession),
            });
          } catch (error) {
            console.error('[MetricsTracker] Auto-save failed:', error);
          }
        }
      },
      5 * 60 * 1000
    ); // 5分

    return () => clearInterval(intervalId);
  }, [
    state.isTracking,
    state.sectionsCompleted,
    state.loopEvents,
    state.currentTempo,
    materialId,
    userId,
    instrument,
    targetTempo,
    sectionsTotal,
  ]);

  return {
    isTracking: state.isTracking,
    sectionsCompleted: state.sectionsCompleted,
    loopEventsCount: state.loopEvents.length,
    currentTempo: state.currentTempo,

    startTracking,
    stopTracking,
    markSectionCompleted,
    recordLoopEvent,
    updateTempo,
  };
}
