/**
 * RewardAdPrompt Component
 * Modal prompting user to watch ad for more plays
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Hoo } from './Hoo';
import { Button } from './ui/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../constants/theme';

interface RewardAdPromptProps {
  visible: boolean;
  onWatchAd: () => void;
  onClose: () => void;
}

export function RewardAdPrompt({ visible, onWatchAd, onClose }: RewardAdPromptProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Hoo */}
          <Hoo variant="icon" size="small" />

          {/* Title */}
          <Text style={styles.title}>Out of Plays!</Text>
          <Text style={styles.subtitle}>
            You've used all your free plays for today
          </Text>

          {/* Hoo's message */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              "Hey there! Want to keep training? Watch a quick video and I'll give you 3 more plays!"
            </Text>
            <Text style={styles.signature}>- Hoo</Text>
          </View>

          {/* Reward info */}
          <View style={styles.rewardInfo}>
            <Ionicons name="play-circle" size={24} color={colors.primary} />
            <Text style={styles.rewardText}>
              Watch ad to get <Text style={styles.rewardHighlight}>+3 plays</Text>
            </Text>
          </View>

          {/* Actions */}
          <Button
            title="Watch Ad"
            onPress={onWatchAd}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.watchButton}
          />

          <TouchableOpacity onPress={onClose} style={styles.laterButton}>
            <Text style={styles.laterText}>Maybe Later</Text>
          </TouchableOpacity>

          {/* Timer hint */}
          <Text style={styles.timerHint}>
            Free plays reset in 12 hours
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  messageBox: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    width: '100%',
  },
  messageText: {
    fontSize: fontSize.base,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  signature: {
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  rewardText: {
    fontSize: fontSize.base,
    color: colors.textLight,
  },
  rewardHighlight: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  watchButton: {
    marginTop: spacing.xl,
  },
  laterButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  laterText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  timerHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
