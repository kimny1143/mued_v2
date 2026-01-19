/**
 * HomeScreen
 * Main landing screen with Hoo and start button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Hoo } from '../components/Hoo';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../stores/gameStore';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

interface HomeScreenProps {
  onStartTraining: () => void;
}

export function HomeScreen({ onStartTraining }: HomeScreenProps) {
  const playLimit = useGameStore((state) => state.playLimit);
  const remainingPlays = playLimit.maxGames + playLimit.bonusGames - playLimit.gamesPlayed;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>MUEDear</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Hoo Mascot */}
        <Hoo variant="studio" size="large" />

        {/* Title */}
        <Text style={styles.title}>Train Your{'\n'}Golden Ears</Text>
        <Text style={styles.subtitle}>
          Develop professional listening skills with fun audio games
        </Text>

        {/* Start Button */}
        <Button
          title="Start Training"
          onPress={onStartTraining}
          variant="primary"
          size="lg"
          fullWidth
          style={styles.startButton}
        />

        {/* Remaining Plays */}
        <View style={styles.playsContainer}>
          <Text style={styles.playsText}>
            {remainingPlays} plays remaining today
          </Text>
          {remainingPlays === 0 && (
            <Text style={styles.watchAdText}>
              Watch an ad for more plays
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Hoo the Owl
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  brandText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  startButton: {
    marginTop: spacing.lg,
  },
  playsContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  playsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  watchAdText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  footer: {
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
