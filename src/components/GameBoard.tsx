import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Block } from './Block';
import { GameControls } from './GameControls';
import { TopBar } from './TopBar';
import { GameState, GameSettings } from '../types/game';
import { calculateOdds, calculateMultiplier, calculatePotentialPayout } from '../utils/gameCalculations';
import { playGameSound } from '../utils/audio';

const GAME_SETTINGS: GameSettings = {
  gridSize: 25,
  maxMines: 15,
  baseMultiplier: 1.2,
  riskFactor: 0.1,
};

const initialGameState = (settings: GameSettings, mineCount: number): GameState => ({
  blocks: Array(settings.gridSize)
    .fill(false)
    .map(() => Math.random() >= mineCount / settings.gridSize),
  revealed: Array(settings.gridSize).fill(false),
  gameOver: false,
  score: 0,
  stake: 1.0,
  multiplier: settings.baseMultiplier,
  potentialPayout: settings.baseMultiplier,
  mineCount,
  balance: 0,
  isPlaying: false,
});

export function GameBoard() {
  const [gameState, setGameState] = useState<GameState>(() => 
    initialGameState(GAME_SETTINGS, 5)
  );

  const revealedCount = gameState.revealed.filter(Boolean).length;
  const currentOdds = calculateOdds(
    GAME_SETTINGS.gridSize,
    gameState.mineCount,
    revealedCount
  );

  const handleDeposit = useCallback((amount: number) => {
    setGameState(prev => ({
      ...prev,
      balance: prev.balance + amount,
    }));
  }, []);

  const handleStakeChange = useCallback((newStake: number) => {
    if (newStake <= gameState.balance) {
      setGameState(prev => ({
        ...prev,
        stake: newStake,
        potentialPayout: calculatePotentialPayout(newStake, prev.multiplier),
      }));
    }
  }, [gameState.balance]);

  const handleMineCountChange = useCallback((newMineCount: number) => {
    if (!gameState.revealed.some(Boolean)) {
      setGameState(prev => ({
        ...initialGameState(GAME_SETTINGS, newMineCount),
        stake: prev.stake,
        balance: prev.balance,
      }));
    }
  }, [gameState.revealed]);

  const handleBlockClick = useCallback((index: number) => {
    if (gameState.revealed[index] || gameState.gameOver) return;

    // Check if this is the first click
    const isFirstClick = !gameState.revealed.some(Boolean);
    if (isFirstClick) {
      if (gameState.stake > gameState.balance) return;
      setGameState(prev => ({
        ...prev,
        balance: prev.balance - prev.stake,
        isPlaying: true,
      }));
    }

    const newRevealed = [...gameState.revealed];
    newRevealed[index] = true;

    if (gameState.blocks[index]) {
      // Found a gem
      playGameSound('gem');
      const newScore = gameState.score + 1;
      const newMultiplier = calculateMultiplier(
        GAME_SETTINGS.baseMultiplier,
        GAME_SETTINGS.riskFactor,
        newScore
      );

      setGameState(prev => ({
        ...prev,
        revealed: newRevealed,
        score: newScore,
        multiplier: newMultiplier,
        potentialPayout: calculatePotentialPayout(prev.stake, newMultiplier),
      }));
    } else {
      // Found a ruby - game over
      playGameSound('ruby');
      setGameState(prev => ({
        ...prev,
        revealed: newRevealed,
        gameOver: true,
        isPlaying: false,
      }));
    }
  }, [gameState]);

  const handleCashout = useCallback(() => {
    setGameState(prev => ({
      ...initialGameState(GAME_SETTINGS, prev.mineCount),
      balance: prev.balance + (prev.stake * prev.multiplier),
    }));
    playGameSound('gem');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <TopBar
        balance={gameState.balance}
        onDeposit={handleDeposit}
        isPlaying={gameState.isPlaying}
        onCashout={handleCashout}
      />
      
      <div className="pt-24 flex items-center justify-center p-8">
        <div className="flex gap-8 items-center max-w-7xl">
          <GameControls
            stake={gameState.stake}
            onStakeChange={handleStakeChange}
            potentialPayout={gameState.potentialPayout}
            disabled={gameState.gameOver || revealedCount > 0}
            odds={currentOdds}
            multiplier={gameState.multiplier}
            mineCount={gameState.mineCount}
            onMineCountChange={handleMineCountChange}
            maxMines={GAME_SETTINGS.maxMines}
            isPlaying={gameState.isPlaying}
            onCashout={handleCashout}
          />

          <div className="flex flex-col items-center">
            <div className="grid grid-cols-5 gap-4 mb-8">
              {gameState.blocks.map((isGem, index) => (
                <Block
                  key={index}
                  revealed={gameState.revealed[index]}
                  isGem={isGem}
                  onClick={() => handleBlockClick(index)}
                  disabled={gameState.gameOver}
                />
              ))}
            </div>

            {gameState.gameOver && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold text-red-500"
              >
                Game Over!
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}