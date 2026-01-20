/**
 * AdService - MUEDear Rewarded Ad Management
 *
 * Handles loading and showing rewarded video ads via Google AdMob.
 * Users can watch ads to earn bonus game plays.
 */

import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { logger } from '../utils/logger';

// Environment-based Ad Unit IDs
// Production IDs are loaded from environment variables (.env.local)
// In development (__DEV__), always use test IDs
const getAdUnitIds = () => ({
  REWARDED_TEST: TestIds.REWARDED,
  REWARDED_IOS: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS || TestIds.REWARDED,
  REWARDED_ANDROID: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID || TestIds.REWARDED,
});

const IS_DEVELOPMENT = __DEV__;

type AdLoadState = 'idle' | 'loading' | 'loaded' | 'showing' | 'error';

interface AdServiceState {
  loadState: AdLoadState;
  error: string | null;
}

class AdService {
  private rewardedAd: RewardedAd | null = null;
  private state: AdServiceState = {
    loadState: 'idle',
    error: null,
  };
  private onRewardCallback: (() => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  /**
   * Get the appropriate ad unit ID based on platform and environment
   */
  private getAdUnitId(): string {
    const adUnitIds = getAdUnitIds();

    // Always use test ads in development
    if (IS_DEVELOPMENT) {
      return adUnitIds.REWARDED_TEST;
    }

    // In production, use platform-specific IDs from environment variables
    return Platform.select({
      ios: adUnitIds.REWARDED_IOS,
      android: adUnitIds.REWARDED_ANDROID,
      default: adUnitIds.REWARDED_TEST,
    }) || adUnitIds.REWARDED_TEST;
  }

  /**
   * Load a rewarded ad
   */
  async loadAd(): Promise<boolean> {
    if (this.state.loadState === 'loading' || this.state.loadState === 'loaded') {
      logger.log('[AdService] Ad already loading or loaded');
      return this.state.loadState === 'loaded';
    }

    this.state.loadState = 'loading';
    this.state.error = null;

    return new Promise((resolve) => {
      try {
        const adUnitId = this.getAdUnitId();
        this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
          keywords: ['music', 'audio', 'education', 'game'],
        });

        // Set up event listeners
        const unsubscribeLoaded = this.rewardedAd.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            logger.log('[AdService] Rewarded ad loaded');
            this.state.loadState = 'loaded';
            unsubscribeLoaded();
            resolve(true);
          }
        );

        const unsubscribeError = this.rewardedAd.addAdEventListener(
          AdEventType.ERROR,
          (error) => {
            logger.error('[AdService] Ad load error:', error);
            this.state.loadState = 'error';
            this.state.error = error.message;
            unsubscribeError();
            resolve(false);
          }
        );

        // Start loading
        this.rewardedAd.load();
        logger.log('[AdService] Started loading rewarded ad');
      } catch (error) {
        logger.error('[AdService] Failed to create ad request:', error);
        this.state.loadState = 'error';
        this.state.error = error instanceof Error ? error.message : 'Unknown error';
        resolve(false);
      }
    });
  }

  /**
   * Show the loaded rewarded ad
   */
  async showAd(
    onReward: () => void,
    onClose?: () => void,
    onError?: (error: string) => void
  ): Promise<boolean> {
    if (this.state.loadState !== 'loaded' || !this.rewardedAd) {
      logger.log('[AdService] No ad loaded to show');
      onError?.('No ad loaded');
      return false;
    }

    this.onRewardCallback = onReward;
    this.onCloseCallback = onClose || null;
    this.onErrorCallback = onError || null;

    return new Promise((resolve) => {
      try {
        // Set up reward listener
        const unsubscribeEarned = this.rewardedAd!.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward) => {
            logger.log('[AdService] User earned reward:', reward);
            this.onRewardCallback?.();
            unsubscribeEarned();
          }
        );

        // Set up close listener
        const unsubscribeClosed = this.rewardedAd!.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            logger.log('[AdService] Ad closed');
            this.state.loadState = 'idle';
            this.onCloseCallback?.();
            unsubscribeClosed();
            resolve(true);

            // Pre-load next ad
            this.loadAd();
          }
        );

        // Set up error listener
        const unsubscribeError = this.rewardedAd!.addAdEventListener(
          AdEventType.ERROR,
          (error) => {
            logger.error('[AdService] Ad show error:', error);
            this.state.loadState = 'error';
            this.onErrorCallback?.(error.message);
            unsubscribeError();
            resolve(false);
          }
        );

        // Show the ad
        this.state.loadState = 'showing';
        this.rewardedAd!.show();
        logger.log('[AdService] Showing rewarded ad');
      } catch (error) {
        logger.error('[AdService] Failed to show ad:', error);
        this.state.loadState = 'error';
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.state.error = errorMsg;
        this.onErrorCallback?.(errorMsg);
        resolve(false);
      }
    });
  }

  /**
   * Check if an ad is loaded and ready to show
   */
  isAdReady(): boolean {
    return this.state.loadState === 'loaded';
  }

  /**
   * Check if an ad is currently loading
   */
  isLoading(): boolean {
    return this.state.loadState === 'loading';
  }

  /**
   * Get the current state
   */
  getState(): AdServiceState {
    return { ...this.state };
  }

  /**
   * Reset the service state
   */
  reset(): void {
    this.rewardedAd = null;
    this.state = {
      loadState: 'idle',
      error: null,
    };
    this.onRewardCallback = null;
    this.onCloseCallback = null;
    this.onErrorCallback = null;
  }
}

// Export singleton instance
export const adService = new AdService();
