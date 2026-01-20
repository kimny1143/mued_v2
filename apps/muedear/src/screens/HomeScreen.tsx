/**
 * HomeScreen
 * Main landing screen with Hoo and start button
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { Hoo } from '../components/Hoo';
import { Button } from '../components/ui/Button';
import { AdModal } from '../components/AdModal';
import { useGameStore } from '../stores/gameStore';
import { AD_CONFIG } from '../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface HomeScreenProps {
  onStartTraining: () => void;
}

export function HomeScreen({ onStartTraining }: HomeScreenProps) {
  const { getRemainingPlays, canWatchAd } = useGameStore();
  const [showAdModal, setShowAdModal] = useState(false);

  const remainingPlays = getRemainingPlays();
  const hasPlays = remainingPlays > 0;
  const canGetMorePlays = canWatchAd();

  // Lock to portrait on this screen
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    // Unlock when leaving this screen
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

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
        {hasPlays ? (
          <Button
            title="Start Training"
            onPress={onStartTraining}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.startButton}
          />
        ) : canGetMorePlays ? (
          <Button
            title={`Watch Ad for +${AD_CONFIG.PLAYS_PER_AD} Plays`}
            onPress={() => setShowAdModal(true)}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.startButton}
          />
        ) : (
          <View style={styles.noPlaysCard}>
            <Ionicons name="time" size={24} color={colors.warning} />
            <Text style={styles.noPlaysText}>Come back tomorrow!</Text>
            <Text style={styles.noPlaysSubtext}>
              Daily limit reached. Time to practice what you've learned!
            </Text>
          </View>
        )}

        {/* Remaining Plays */}
        <View style={styles.playsContainer}>
          <Ionicons
            name={hasPlays ? 'game-controller' : 'alert-circle'}
            size={16}
            color={hasPlays ? colors.textMuted : colors.warning}
          />
          <Text style={[styles.playsText, !hasPlays && styles.playsTextWarning]}>
            {remainingPlays} play{remainingPlays !== 1 ? 's' : ''} remaining today
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Hoo the Owl
        </Text>
      </View>

      {/* Ad Modal */}
      <AdModal
        visible={showAdModal}
        onClose={() => setShowAdModal(false)}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  playsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  playsTextWarning: {
    color: colors.warning,
  },
  noPlaysCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  noPlaysText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.warning,
    marginTop: spacing.md,
  },
  noPlaysSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
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
