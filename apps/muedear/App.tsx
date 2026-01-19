/**
 * MUEDear - Train Your Golden Ears
 * Audio training game app
 */

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { GameSelectScreen } from './src/screens/GameSelectScreen';
import { MuFreQScreen } from './src/screens/games/MuFreQScreen';
import { ResultScreen } from './src/screens/ResultScreen';

// Components
import { RewardAdPrompt } from './src/components/RewardAdPrompt';

// Store
import { useGameStore } from './src/stores/gameStore';
import { GameId } from './src/types/game';

// Screen types
type Screen = 'home' | 'gameSelect' | 'game' | 'result';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showAdPrompt, setShowAdPrompt] = useState(false);

  const { startGame, reset, canPlay, addBonusGames } = useGameStore();

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
        return (
          <MuFreQScreen
            onComplete={handleGameComplete}
            onBack={() => {
              reset();
              setCurrentScreen('gameSelect');
            }}
          />
        );

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
