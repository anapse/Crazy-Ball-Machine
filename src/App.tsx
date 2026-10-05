import React, { useState, useEffect, useMemo } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameSnapshot } from './types/game';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { ContactModal } from './components/ContactModal';
import { PauseModal } from './components/modals/PauseModal';
import { HowToPlayModal } from './components/modals/HowToPlayModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { GameOverModal } from './components/modals/GameOverModal';
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
    goalTarget: 12,
    goalDescription: 'Destruye 12 objetos',
    combo: 0,
    selectedChannelIndex: 2,
    activePowerUp: null,
    inventory: { double: 0, triple: 0, fast: 0, explosive: 0, shield: 0 },
    objectsDestroyedCount: 0,
    totalBallsUsed: 0,
    isSoundMuted: soundManager.getIsMuted(),
  });

  // Modal open states
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
  const isGameOverOrVictory =
    gameState.phase === 'GAME_OVER' || gameState.phase === 'LEVEL_COMPLETE';
  const isMenu = gameState.phase === 'MENU';

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setGameState((prev) => ({ ...prev, isSoundMuted: muted }));
  };

  return (
    <div className="w-screen h-screen bg-stone-950 flex items-center justify-center overflow-hidden touch-none select-none overscroll-none p-0 m-0">
      {/* 9:16 Vertical Game Container */}
      <div className="relative w-full h-full max-h-screen aspect-[9/16] max-w-[calc(100vh*(9/16))] bg-stone-900 shadow-2xl overflow-hidden flex flex-col justify-center items-center border-x-0 md:border-x-4 border-amber-800">
        {/* Full Canvas Game Viewport */}
        <GameCanvas engine={engine} />

        {/* In-Game React HUD */}
        {!isMenu && (
          <HUD
            state={gameState}
            onPause={() => engine.pauseGame()}
            onSelectPowerUp={(type) => engine.selectPowerUp(type)}
            onToggleSound={handleToggleSound}
          />
        )}

        {/* Main Menu */}
        {isMenu && (
          <MainMenu
            onPlay={() => engine.startNewGame(1)}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            onOpenContact={() => setShowContact(true)}
            isSoundMuted={gameState.isSoundMuted}
            onToggleSound={handleToggleSound}
            highScore={highScore}
          />
        )}

        {/* Pause Modal */}
        <PauseModal
          isOpen={isPaused}
          onResume={() => engine.resumeGame()}
          onRestart={() => engine.restartCurrentLevel()}
          onMenu={() => engine.returnToMenu()}
          isMuted={gameState.isSoundMuted}
          onToggleSound={handleToggleSound}
        />

        {/* Game Over / Victory Modal */}
        <GameOverModal
          isOpen={isGameOverOrVictory}
          state={gameState}
          onRestart={() => engine.restartCurrentLevel()}
          onNextLevel={() => engine.nextLevel()}
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

