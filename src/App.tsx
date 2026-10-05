import React, { useState, useEffect, useMemo } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameSnapshot } from './types/game';
import { GameCanvas } from './components/GameCanvas';
import { TopHUD } from './components/TopHUD';
import { PowerUpBar } from './components/PowerUpBar';
import { MainMenu } from './components/MainMenu';
import { ContactModal } from './components/ContactModal';
import { PauseModal } from './components/modals/PauseModal';
import { HowToPlayModal } from './components/modals/HowToPlayModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { GameOverModal } from './components/modals/GameOverModal';
import { PlayerNameModal } from './components/modals/PlayerNameModal';
import { NextLevelModal } from './components/modals/NextLevelModal';
import { AdminPortal } from './components/admin/AdminPortal';
import { spriteManager } from './game/SpriteManager';
import { soundManager } from './audio/soundManager';
import { storage } from './utils/storage';
import { leaderboardService } from './utils/leaderboardService';

export const App: React.FC = () => {
  // Check if current URL is /admin or #admin
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path.endsWith('/admin') ||
      path.endsWith('/admin/') ||
      hash === '#admin' ||
      search.includes('admin=true')
    );
  });

  // Game state snapshot from engine
  const [gameState, setGameState] = useState<GameSnapshot>({
    phase: 'MENU',
    levelNumber: 1,
    score: 0,
    ballsLeft: 5,
    goalProgress: 0,
    goalTarget: 6,
    goalDescription: 'Destruye las 6 cajas de la máquina',
    combo: 0,
    selectedChannelIndex: 2,
    activePowerUp: null,
    inventory: { double: 0, triple: 0, fast: 0, explosive: 0, shield: 0 },
    objectsDestroyedCount: 0,
    totalBallsUsed: 0,
    isSoundMuted: soundManager.getIsMuted(),
    playerName: storage.getPlayerName() || '',
  });

  // Modal open states
  const [showPlayerNameModal, setShowPlayerNameModal] = useState<boolean>(false);
  const [showContact, setShowContact] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // Highscore local cache
  const [highScore, setHighScore] = useState<number>(() => storage.getHighScore());

  // GameEngine instance
  const engine = useMemo(() => {
    return new GameEngine((snapshot) => {
      setGameState(snapshot);
      const currentHigh = storage.getHighScore();
      if (currentHigh > highScore) {
        setHighScore(currentHigh);
      }
    });
  }, []);

  // Preload sprites and record visitor session
  useEffect(() => {
    spriteManager.loadAll();
    leaderboardService.recordVisit();

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      setIsAdminRoute(path.endsWith('/admin') || hash === '#admin');
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
      engine.destroy();
    };
  }, [engine]);

  // If in admin mode, render admin portal without running game canvas
  if (isAdminRoute) {
    return (
      <AdminPortal
        onExit={() => {
          window.history.pushState({}, '', window.location.pathname.replace(/\/admin\/?$/, '') || './');
          setIsAdminRoute(false);
        }}
      />
    );
  }

  const isPaused = gameState.phase === 'PAUSED';
  const isMenu = gameState.phase === 'MENU';
  const isGameOver = gameState.phase === 'GAME_OVER';
  const isPlaying = !isMenu && !isGameOver;

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setGameState((prev) => ({ ...prev, isSoundMuted: muted }));
  };

  const handleStartGameWithName = (name: string) => {
    setShowPlayerNameModal(false);
    engine.startNewGame(1, name);
  };

  return (
    <div className="w-screen h-screen bg-stone-950 flex items-center justify-center overflow-hidden touch-none select-none overscroll-none p-0 m-0">
      {/* 9:16 Vertical Game Container */}
      <div className="relative w-full h-full max-h-screen aspect-[9/16] max-w-[calc(100vh*(9/16))] bg-stone-900 shadow-2xl overflow-hidden flex flex-col justify-start items-center border-x-0 md:border-x-4 border-amber-800">
        
        {/* Canvas & In-Game Viewport Area: 90% during gameplay, 100% full height in Menu / Game Over */}
        <div className={`relative w-full ${isPlaying ? 'h-[90%]' : 'h-full'} overflow-hidden bg-neutral-950 flex items-center justify-center transition-[height] duration-200`}>
          {/* Canvas Viewport */}
          <GameCanvas engine={engine} isPlaying={isPlaying} />

          {/* In-Game Top Header HUD */}
          {!isMenu && (
            <TopHUD
              state={gameState}
              onPause={() => engine.pauseGame()}
              onToggleSound={handleToggleSound}
            />
          )}

          {/* Main Menu Overlay (Occupies 100% height when in MENU) */}
          {isMenu && (
            <MainMenu
              onPlay={() => setShowPlayerNameModal(true)}
              onOpenLeaderboard={() => setShowLeaderboard(true)}
              onOpenHowToPlay={() => setShowHowToPlay(true)}
              onOpenContact={() => setShowContact(true)}
              isSoundMuted={gameState.isSoundMuted}
              onToggleSound={handleToggleSound}
              highScore={highScore}
            />
          )}
        </div>

        {/* Bottom 10%: Fixed Power-Up Bar - ONLY during active gameplay */}
        {isPlaying && (
          <div className="w-full h-[10%] bg-stone-950 border-t-2 border-amber-800/90 shadow-2xl z-20 flex items-center justify-center px-1 animate-fade-in">
            <PowerUpBar
              inventory={gameState.inventory}
              activePowerUp={gameState.activePowerUp}
              onSelectPowerUp={(type) => engine.selectPowerUp(type)}
            />
          </div>
        )}

        {/* Player Name Modal (Requirement 5, 6: Before starting a new game) */}
        <PlayerNameModal
          isOpen={showPlayerNameModal}
          onSubmit={handleStartGameWithName}
        />

        {/* Level Complete Modal (Requirement 7, 8: Compact transition) */}
        <NextLevelModal
          isOpen={gameState.phase === 'LEVEL_COMPLETE'}
          state={gameState}
          onContinue={() => engine.nextLevel()}
        />

        {/* Pause Modal */}
        <PauseModal
          isOpen={isPaused}
          onResume={() => engine.resumeGame()}
          onRestart={() => engine.restartCurrentLevel()}
          onMenu={() => engine.returnToMenu()}
          isMuted={gameState.isSoundMuted}
          onToggleSound={handleToggleSound}
        />

        {/* Game Over Modal */}
        <GameOverModal
          isOpen={gameState.phase === 'GAME_OVER'}
          state={gameState}
          onRestart={() => setShowPlayerNameModal(true)}
          onMenu={() => engine.returnToMenu()}
        />

        {/* How To Play Modal */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        {/* Leaderboard Top 50 Modal */}
        <LeaderboardModal
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
        />

        {/* Contact Modal */}
        <ContactModal
          isOpen={showContact}
          onClose={() => setShowContact(false)}
        />
      </div>
    </div>
  );
};

export default App;
