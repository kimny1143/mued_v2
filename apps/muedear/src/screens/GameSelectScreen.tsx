/**
 * GameSelectScreen
 * Game selection grid with 5 games
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameCard } from '../components/GameCard';
import { GAMES, GameId } from '../types/game';
import { useGameStore } from '../stores/gameStore';
import { colors, spacing, fontSize, fontWeight } from '../constants/theme';

interface GameSelectScreenProps {
  onSelectGame: (gameId: GameId) => void;
  onBack: () => void;
}

export function GameSelectScreen({ onSelectGame, onBack }: GameSelectScreenProps) {
  const playLimit = useGameStore((state) => state.playLimit);
  const remainingPlays = playLimit.maxGames + playLimit.bonusGames - playLimit.gamesPlayed;

  const handleSelectGame = (gameId: GameId) => {
    if (remainingPlays <= 0) {
      // Show reward ad prompt
      console.log('No plays remaining, show ad prompt');
      return;
    }
    onSelectGame(gameId);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Game</Text>
        <View style={styles.playsIndicator}>
          <Ionicons name="game-controller" size={16} color={colors.primary} />
          <Text style={styles.playsText}>{remainingPlays}</Text>
        </View>
      </View>

      {/* Game Categories */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* EQ Games */}
        <Text style={styles.categoryTitle}>EQ Training</Text>
        {GAMES.filter((g) => g.category === 'eq').map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPress={() => handleSelectGame(game.id)}
          />
        ))}

        {/* Dynamics Games */}
        <Text style={styles.categoryTitle}>Dynamics Training</Text>
        {GAMES.filter((g) => g.category === 'dynamics').map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPress={() => handleSelectGame(game.id)}
          />
        ))}

        {/* Space Games */}
        <Text style={styles.categoryTitle}>Spatial Training</Text>
        {GAMES.filter((g) => g.category === 'space').map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPress={() => handleSelectGame(game.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },
  playsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: 4,
  },
  playsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  categoryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});
