import React, { useState, useEffect } from 'react';
import { Trophy, Star, RotateCcw, Home, ArrowRight, Check, Send } from 'lucide-react';
import { GameSnapshot } from '../../types/game';
import { storage } from '../../utils/storage';
import { leaderboardService } from '../../utils/leaderboardService';

interface GameOverModalProps {
  isOpen: boolean;
  state: GameSnapshot;
  onRestart: () => void;
  onNextLevel: () => void;
  onMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  state,
  onRestart,
  onNextLevel,
  onMenu,
}) => {
  const isVictory = state.phase === 'LEVEL_COMPLETE';
  const [playerName, setPlayerName] = useState<string>(storage.getPlayerName() || '');
  const [isTop50Eligible, setIsTop50Eligible] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setHasSubmitted(false);
      setSubmitting(false);
      const checkEligibility = async () => {
        const eligible = await leaderboardService.isTop50Eligible(state.score);
        setIsTop50Eligible(eligible);
      };
      checkEligibility();
    }
  }, [isOpen, state.score]);

  if (!isOpen) return null;

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || submitting || hasSubmitted) return;

    setSubmitting(true);
    storage.setPlayerName(playerName.trim());

    await leaderboardService.submitScore({
      playerName: playerName.trim(),
      score: state.score,
      ballsUsed: state.totalBallsUsed,
      objectsDestroyed: state.objectsDestroyedCount,
      level: state.levelNumber,
      maxCombo: state.combo,
    });

    setSubmitting(false);
    setHasSubmitted(true);
  };

  // Calculate stars
  let stars = 1;
  if (state.goalProgress >= state.goalTarget) {
    if (state.ballsLeft >= 3) stars = 3;
    else if (state.ballsLeft >= 1) stars = 2;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm wood-panel p-6 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 flex flex-col items-center text-center">
        {/* Header Badge */}
        {isVictory ? (
          <>
            <div className="text-4xl mb-1">🎉</div>
            <h2 className="text-2xl font-carnival gold-text mb-1">¡NIVEL COMPLETADO!</h2>
            {/* Stars */}
            <div className="flex items-center gap-2 my-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  size={32}
                  className={
                    s <= stars
                      ? 'text-yellow-400 fill-yellow-400 drop-shadow-md scale-110'
                      : 'text-stone-700 fill-stone-800'
                  }
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl mb-1">⚙️</div>
            <h2 className="text-2xl font-carnival text-red-400 mb-2">GAME OVER</h2>
          </>
        )}

        {/* Score Summary Box */}
        <div className="w-full bg-stone-950/70 p-3.5 rounded-2xl border border-amber-900/80 my-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-amber-300/80 font-bold uppercase">PUNTUACIÓN:</span>
            <span className="text-xl font-carnival text-yellow-300">
              {state.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-amber-950 pt-1.5">
            <span className="text-amber-300/80">OBJETIVO:</span>
            <span className="font-bold text-amber-100">
              {state.goalProgress} / {state.goalTarget}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-amber-300/80">BOLAS UTILIZADAS:</span>
            <span className="font-bold text-amber-100">{state.totalBallsUsed}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-amber-300/80">OBJETOS DESTRUIDOS:</span>
            <span className="font-bold text-amber-100">{state.objectsDestroyedCount}</span>
          </div>
        </div>

        {/* Top 50 Submission Form */}
        {isTop50Eligible && state.score > 0 && (
          <div className="w-full mb-3 bg-gradient-to-r from-amber-900/50 to-yellow-900/30 p-3 rounded-2xl border border-yellow-500/60 shadow-lg">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-yellow-300 mb-1.5">
              <Trophy size={16} />
              <span>¡ENTRASTE AL TOP 50!</span>
            </div>

            {hasSubmitted ? (
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-400 py-1">
                <Check size={16} />
                <span>¡Puntuación guardada con éxito!</span>
              </div>
            ) : (
              <form onSubmit={handleSaveScore} className="flex gap-1.5 mt-1">
                <input
                  type="text"
                  maxLength={25}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Tu Nombre o Apodo"
                  required
                  className="flex-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-amber-500/80 text-amber-100 text-xs focus:outline-none focus:border-yellow-300"
                />
                <button
                  type="submit"
                  disabled={submitting || !playerName.trim()}
                  className="wood-button px-3 py-1.5 rounded-xl font-carnival text-yellow-300 text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <Send size={12} />
                  <span>{submitting ? '...' : 'GUARDAR'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full mt-1">
          {isVictory ? (
            <button
              onClick={onNextLevel}
              className="wood-button py-3.5 rounded-2xl flex items-center justify-center gap-2 font-carnival text-yellow-300 text-lg shadow-lg active:scale-95"
            >
              <span>SIGUIENTE NIVEL</span>
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              onClick={onRestart}
              className="wood-button py-3.5 rounded-2xl flex items-center justify-center gap-2 font-carnival text-yellow-300 text-lg shadow-lg active:scale-95"
            >
              <RotateCcw size={18} />
              <span>REINTENTAR</span>
            </button>
          )}

          <button
            onClick={onMenu}
            className="wood-button py-2.5 rounded-2xl flex items-center justify-center gap-2 font-carnival text-amber-200 text-sm shadow-md active:scale-95"
          >
            <Home size={16} />
            <span>MENÚ PRINCIPAL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
