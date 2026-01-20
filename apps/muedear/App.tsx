/**
 * MUEDear - Train Your Golden Ears
 * Audio training game app
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { GameSelectScreen } from './src/screens/GameSelectScreen';
import { MuFreQScreen } from './src/screens/games/MuFreQScreen';
import { MuCompScreen } from './src/screens/games/MuCompScreen';
import { MuRushScreen } from './src/screens/games/MuRushScreen';
import { MuVerbScreen } from './src/screens/games/MuVerbScreen';
import { MuWidthScreen } from './src/screens/games/MuWidthScreen';
import { ResultScreen } from './src/screens/ResultScreen';

// Components
import { RewardAdPrompt } from './src/components/RewardAdPrompt';

// Store
import { useGameStore, useGameStoreHydrated } from './src/stores/gameStore';
import { GameId } from './src/types/game';
import { colors } from './src/constants/theme';

// Screen types
type Screen = 'home' | 'gameSelect' | 'game' | 'result';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showAdPrompt, setShowAdPrompt] = useState(false);

  const {
    currentGame,
    startGame,
    reset,
    canPlay,
    addBonusGames,
    checkDailyReset,
  } = useGameStore();

  const hasHydrated = useGameStoreHydrated();

  // Check for daily reset on app start
  useEffect(() => {
    if (hasHydrated) {
      checkDailyReset();
    }
  }, [hasHydrated, checkDailyReset]);

  const handleStartTraining = () => {
    setCurrentScreen('gameSelect');
  };

  const handleSelectGame = (gameId: GameId) => {
    if (!canPlay()) {
      setShowAdPrompt(true);
      return;
    }

    // Start the game
    startGame(gameId);
    setCurrentScreen('game');
  };

  const handleGameComplete = () => {
    setCurrentScreen('result');
  };

  const handlePlayAgain = () => {
    if (!canPlay()) {
      setShowAdPrompt(true);
      return;
    }

    reset();
    setCurrentScreen('gameSelect');
  };

  const handleBackToMenu = () => {
    reset();
    setCurrentScreen('home');
  };

  const handleWatchAd = () => {
    // Simulate watching ad
    console.log('[App] Ad watched');
    addBonusGames(3);
    setShowAdPrompt(false);
  };

  // Show loading screen while hydrating from storage
  if (!hasHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Render the appropriate game screen based on currentGame
  const renderGameScreen = () => {
    const gameProps = {
      onComplete: handleGameComplete,
      onBack: () => {
        reset();
        setCurrentScreen('gameSelect');
      },
    };

    switch (currentGame) {
      case 'mufreq':
        return <MuFreQScreen {...gameProps} />;
      case 'mucomp':
        return <MuCompScreen {...gameProps} />;
      case 'murush':
        return <MuRushScreen {...gameProps} />;
      case 'muverb':
        return <MuVerbScreen {...gameProps} />;
      case 'muwidth':
        return <MuWidthScreen {...gameProps} />;
      default:
        return <MuFreQScreen {...gameProps} />;
    }
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onStartTraining={handleStartTraining} />;

      case 'gameSelect':
        return (
          <GameSelectScreen
            onSelectGame={handleSelectGame}
            onBack={handleBackToMenu}
          />
        );

      case 'game':
        return renderGameScreen();

      case 'result':
        return (
          <ResultScreen
            onPlayAgain={handlePlayAgain}
            onBackToMenu={handleBackToMenu}
          />
        );

      default:
        return <HomeScreen onStartTraining={handleStartTraining} />;
    }
  };

  return (
    <>
      <StatusBar style="light" />
      {renderScreen()}
      <RewardAdPrompt
        visible={showAdPrompt}
        onWatchAd={handleWatchAd}
        onClose={() => setShowAdPrompt(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
