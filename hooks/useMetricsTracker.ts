/**
 * useMetricsTracker Hook
 *
 * プレイヤーでの学習メトリクストラッキング
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LoopEvent, PracticeSession } from '@/lib/metrics/learning-tracker';
import { useApiClient, getErrorMessage } from '@/lib/api-client';
import { logger } from '@/lib/utils/logger';

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
  const apiClient = useApiClient();

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

    logger.debug('[MetricsTracker] Tracking started');
  }, []);

  /**
   * トラッキング停止とセッション保存
   */
  const stopTracking = useCallback(async () => {
    if (!sessionStartTimeRef.current) {
      logger.warn('[MetricsTracker] No active session to stop');
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

    logger.debug('[MetricsTracker] Session ended:', {
      duration: `${duration}s`,
      sectionsCompleted: session.sectionsCompleted,
      loopEvents: session.loopEvents.length,
    });

    // サーバーに保存
    try {
      await apiClient.post('/api/metrics/save-session', session);
      logger.debug('[MetricsTracker] Session saved successfully');
    } catch (error) {
      logger.error('[MetricsTracker] Error saving session', getErrorMessage(error));
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
  }, [apiClient, materialId, userId, instrument, targetTempo, sectionsTotal, state]);

  /**
   * セクション完了を記録
   */
  const markSectionCompleted = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sectionsCompleted: Math.min(prev.sectionsCompleted + 1, sectionsTotal),
    }));

    logger.debug('[MetricsTracker] Section completed');
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

      logger.debug('[MetricsTracker] Loop event recorded:', { startBar, endBar, tempo });
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

          logger.debug('[MetricsTracker] Auto-saving session...');

          try {
            await apiClient.post('/api/metrics/save-session', partialSession);
          } catch (error) {
            logger.error('[MetricsTracker] Auto-save failed', getErrorMessage(error));
          }
        }
      },
      5 * 60 * 1000
    ); // 5分

    return () => clearInterval(intervalId);
  }, [
    apiClient,
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
