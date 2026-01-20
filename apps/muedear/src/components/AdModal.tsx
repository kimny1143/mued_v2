/**
 * AdModal
 * Modal prompting users to watch a rewarded ad for bonus plays
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adService } from '../services/adService';
import { useGameStore } from '../stores/gameStore';
import { AD_CONFIG } from '../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface AdModalProps {
  visible: boolean;
  onClose: () => void;
  onAdWatched?: () => void;
}

export function AdModal({ visible, onClose, onAdWatched }: AdModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdReady, setIsAdReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { canWatchAd, recordAdWatch, getRemainingAdWatches } = useGameStore();

  const remainingWatches = getRemainingAdWatches();
  const canWatch = canWatchAd();

  // Load ad when modal becomes visible
  useEffect(() => {
    if (visible && !adService.isAdReady() && !adService.isLoading()) {
      loadAd();
    }
  }, [visible]);

  const loadAd = async () => {
    setIsLoading(true);
    setError(null);

    const loaded = await adService.loadAd();
    setIsAdReady(loaded);
    setIsLoading(false);

    if (!loaded) {
      setError('Failed to load ad. Please try again.');
    }
  };

  const handleWatchAd = async () => {
    if (!canWatch) {
      setError("You've reached today's ad limit. Try again tomorrow!");
      return;
    }

    if (!adService.isAdReady()) {
      setError('Ad is not ready yet. Please wait...');
      await loadAd();
      return;
    }

    setIsLoading(true);

    const shown = await adService.showAd(
      // onReward
      () => {
        recordAdWatch();
        onAdWatched?.();
      },
      // onClose
      () => {
        setIsLoading(false);
        onClose();
      },
      // onError
      (errorMsg) => {
        setError(errorMsg);
        setIsLoading(false);
      }
    );

    if (!shown) {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="play-circle" size={48} color={colors.primary} />
            <Text style={styles.title}>Need More Plays?</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Watch a short video to earn{' '}
              <Text style={styles.highlight}>+{AD_CONFIG.PLAYS_PER_AD} plays</Text>
            </Text>

            {canWatch ? (
              <Text style={styles.remainingText}>
                {remainingWatches} ad{remainingWatches !== 1 ? 's' : ''} remaining today
              </Text>
            ) : (
              <View style={styles.limitReachedContainer}>
                <Ionicons name="time" size={20} color={colors.warning} />
                <Text style={styles.limitReachedText}>
                  Daily limit reached. Come back tomorrow!
                </Text>
              </View>
            )}

            {/* "Go make some music" message */}
            {!canWatch && (
              <Text style={styles.makeMusic}>
                Time to practice what you've learned!
              </Text>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {canWatch && (
              <TouchableOpacity
                style={[styles.watchButton, isLoading && styles.buttonDisabled]}
                onPress={handleWatchAd}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textDark} size="small" />
                ) : (
                  <>
                    <Ionicons name="videocam" size={20} color={colors.textDark} />
                    <Text style={styles.watchButtonText}>Watch Ad</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.cancelButton, !canWatch && styles.cancelButtonFull]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>
                {canWatch ? 'Not Now' : 'Got It'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  content: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  highlight: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  remainingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  limitReachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  limitReachedText: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  makeMusic: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  actions: {
    gap: spacing.md,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  watchButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonFull: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
});
