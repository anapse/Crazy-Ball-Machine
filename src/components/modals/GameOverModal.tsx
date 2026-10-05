import React, { useState, useEffect } from 'react';
import { Trophy, RotateCcw, Home, Check } from 'lucide-react';
import { GameSnapshot } from '../../types/game';
import { leaderboardService } from '../../utils/leaderboardService';

interface GameOverModalProps {
  isOpen: boolean;
  state: GameSnapshot;
  onRestart: () => void;
  onMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  state,
  onRestart,
  onMenu,
}) => {
  const [isTop50Eligible, setIsTop50Eligible] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && state.score > 0) {
      const checkAndAutoSubmit = async () => {
        const eligible = await leaderboardService.isTop50Eligible(state.score);
        setIsTop50Eligible(eligible);
        if (eligible && state.playerName) {
          await leaderboardService.submitScore({
            playerName: state.playerName,
            score: state.score,
            ballsUsed: state.totalBallsUsed,
            objectsDestroyed: state.objectsDestroyedCount,
            level: state.levelNumber,
            maxCombo: state.combo,
          });
          setHasSubmitted(true);
        }
      };
      checkAndAutoSubmit();
    }
  }, [isOpen, state.score, state.playerName, state.totalBallsUsed, state.objectsDestroyedCount, state.levelNumber, state.combo]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      <div className="relative w-full max-w-[85%] sm:max-w-xs wood-panel p-5 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 flex flex-col items-center text-center">
        {/* Header Icon */}
        <div className="text-3xl mb-1">⚙️</div>
        <h2 className="text-2xl font-carnival text-red-400 mb-0.5 tracking-wide">
          FIN DE PARTIDA
        </h2>
        <p className="text-xs text-amber-300/80 mb-2 font-semibold truncate max-w-full">
          Jugador: <span className="text-amber-100 font-bold">{state.playerName || 'Jugador'}</span>
        </p>

        {/* Score Summary Box */}
        <div className="w-full bg-stone-950/80 p-3 rounded-2xl border border-amber-900/80 mb-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-amber-300/80 font-bold uppercase text-[10px]">PUNTUACIÓN:</span>
            <span className="text-lg font-carnival text-yellow-300">
              {state.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-amber-950/80 pt-1">
            <span className="text-amber-300/80 text-[10px]">OBJETIVO:</span>
            <span className="font-bold text-amber-100 text-[11px]">
              {state.goalProgress} / {state.goalTarget}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-amber-300/80 text-[10px]">BOLAS USADAS:</span>
            <span className="font-bold text-amber-100 text-[11px]">{state.totalBallsUsed}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-amber-300/80 text-[10px]">OBJETOS DESTRUIDOS:</span>
            <span className="font-bold text-amber-100 text-[11px]">{state.objectsDestroyedCount}</span>
          </div>
        </div>

        {/* Top 50 Badge if eligible */}
        {isTop50Eligible && hasSubmitted && (
          <div className="w-full mb-3 bg-gradient-to-r from-amber-900/60 to-yellow-900/40 p-2 rounded-xl border border-yellow-500/60 shadow flex items-center justify-center gap-1.5 text-xs font-bold text-yellow-300">
            <Trophy size={14} className="text-yellow-400" />
            <Check size={14} className="text-emerald-400" />
            <span>¡Puntuación registrada en el Top 50!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={onRestart}
            className="wood-button py-3 rounded-xl flex items-center justify-center gap-2 font-carnival text-yellow-300 text-base shadow-lg active:scale-95"
          >
            <RotateCcw size={16} />
            <span>REINTENTAR</span>
          </button>

          <button
            onClick={onMenu}
            className="wood-button py-2 rounded-xl flex items-center justify-center gap-2 font-carnival text-amber-200 text-xs shadow-md active:scale-95"
          >
            <Home size={14} />
            <span>MENÚ PRINCIPAL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
