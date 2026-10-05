import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { GameSnapshot } from '../../types/game';

interface NextLevelModalProps {
  isOpen: boolean;
  state: GameSnapshot;
  onContinue: () => void;
}

export const NextLevelModal: React.FC<NextLevelModalProps> = ({
  isOpen,
  state,
  onContinue,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    const duration = 3500; // 3.5 seconds
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timer);
          onContinue();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, onContinue]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onContinue}
      className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in pointer-events-auto select-none cursor-pointer"
      title="Continuando automáticamente..."
    >
      <div className="relative w-full max-w-[85%] sm:max-w-xs wood-panel p-5 rounded-3xl border-4 border-amber-500 shadow-2xl text-amber-100 flex flex-col items-center text-center">
        {/* Compact Visual Header */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/50 to-yellow-600/40 border-2 border-yellow-400 flex items-center justify-center mb-2 shadow-lg">
          <Trophy size={24} className="text-yellow-400" />
        </div>

        {/* Level Title */}
        <h2 className="text-2xl font-carnival gold-text mb-1 tracking-wider">
          NIVEL SUPERADO
        </h2>

        {state.playerName && (
          <p className="text-xs text-amber-200/90 mb-3 font-semibold truncate max-w-full">
            {state.playerName}
          </p>
        )}

        {/* Stats Summary */}
        <div className="w-full bg-stone-950/85 px-4 py-3 rounded-2xl border border-amber-800/80 mb-3 flex flex-col items-center justify-center text-xs space-y-1">
          <div className="flex items-center justify-between w-full">
            <span className="text-amber-300/80 font-bold uppercase text-[10px]">
              NIVEL:
            </span>
            <span className="font-carnival text-amber-100 font-bold text-base">
              {state.levelNumber}
            </span>
          </div>

          <div className="flex items-center justify-between w-full border-t border-amber-950/80 pt-1">
            <span className="text-amber-300/80 font-bold uppercase text-[10px]">
              SCORE:
            </span>
            <span className="font-carnival text-yellow-300 font-bold text-lg">
              {state.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between w-full border-t border-amber-950/80 pt-1">
            <span className="text-emerald-400 font-bold uppercase text-[10px]">
              RECOMPENSA:
            </span>
            <span className="font-carnival text-emerald-300 font-bold text-sm flex items-center gap-1">
              +1 BOLA ⚪
            </span>
          </div>
        </div>

        {/* Automatic Progress Countdown Indicator */}
        <div className="w-full flex items-center gap-2 mt-1">
          <Sparkles size={14} className="text-amber-400 animate-pulse shrink-0" />
          <div className="flex-1 bg-stone-950 h-2 rounded-full overflow-hidden border border-amber-900/80">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-75 rounded-full"
              style={{ width: `${Math.max(0, progress)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
