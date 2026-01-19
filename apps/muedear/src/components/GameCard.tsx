/**
 * GameCard Component
 * Card for game selection screen
 */

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameInfo } from '../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../constants/theme';

interface GameCardProps {
  game: GameInfo;
  onPress: () => void;
}

// Map game icons to Ionicons
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  Activity: 'pulse',
  Gauge: 'speedometer',
  Zap: 'flash',
  Waves: 'water',
  ArrowLeftRight: 'swap-horizontal',
};

export function GameCard({ game, onPress }: GameCardProps) {
  const iconName = ICON_MAP[game.icon] || 'game-controller';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        game.isLocked && styles.cardLocked,
      ]}
      onPress={onPress}
      disabled={game.isLocked}
      activeOpacity={0.8}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: game.color }]}>
        <Ionicons
          name={iconName}
          size={28}
          color={colors.textDark}
        />
        {game.isLocked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.textLight} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.name, game.isLocked && styles.textLocked]}>
          {game.name}
        </Text>
        <Text style={[styles.description, game.isLocked && styles.textLocked]}>
          {game.description}
        </Text>

        {/* Difficulty */}
        <View style={styles.difficultyContainer}>
          {[1, 2, 3].map((level) => (
            <View
              key={level}
              style={[
                styles.difficultyDot,
                level <= game.difficulty && { backgroundColor: game.color },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Arrow */}
      <Ionicons
        name="chevron-forward"
        size={24}
        color={game.isLocked ? colors.textMuted : colors.textLight}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardLocked: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.textMuted,
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  textLocked: {
    color: colors.textMuted,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
});
