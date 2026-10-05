import React from 'react';
import { GameSnapshot } from '../types/game';
import { Pause, Volume2, VolumeX } from 'lucide-react';
import { SpriteIcon } from './SpriteIcon';

interface TopHUDProps {
  state: GameSnapshot;
  onPause: () => void;
  onToggleSound: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  state,
  onPause,
  onToggleSound,
}) => {
  const {
    score,
    ballsLeft,
    goalProgress,
    goalTarget,
    levelNumber,
    isSoundMuted,
    playerName,
  } = state;

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none flex items-center justify-between gap-1 p-1.5 select-none z-20 w-full max-w-full overflow-hidden">
      {/* Level, Player & Score Badge */}
      <div className="wood-panel px-1.5 py-0.5 rounded-lg flex items-center gap-1 border-amber-600/80 shadow-md shrink min-w-0 max-w-[40%] pointer-events-auto">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[8px] uppercase font-black text-amber-300 bg-amber-950 px-1 py-0.2 rounded border border-amber-700/60 whitespace-nowrap">
              N{levelNumber}
            </span>
            {playerName && (
              <span className="text-[9px] font-bold text-amber-200 truncate max-w-[70px]">
                {playerName}
              </span>
            )}
          </div>
          <span className="text-xs font-carnival gold-text font-bold whitespace-nowrap tracking-tight truncate">
            {score.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Goal / Objective Progress Badge */}
      <div className="wood-panel px-1.5 py-0.5 rounded-lg flex flex-col items-center flex-1 min-w-0 max-w-[105px] border-amber-600/80 shadow-md pointer-events-auto">
        <div className="flex items-center justify-between w-full text-[8px] font-bold text-amber-100 leading-tight">
          <span className="text-amber-200 text-[8px] uppercase">CAJAS</span>
          <span className="text-yellow-300 font-carnival text-[10px] font-black ml-0.5 whitespace-nowrap">
            {goalProgress}/{goalTarget}
          </span>
        </div>
        <div className="w-full bg-stone-950 h-1 rounded-full mt-0.5 overflow-hidden border border-amber-900/60">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, (goalProgress / (goalTarget || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Balls Left & Controls */}
      <div className="flex items-center gap-0.5 shrink-0 pointer-events-auto">
        <div className="wood-panel px-1.5 py-0.5 rounded-lg flex items-center gap-1 border-amber-600/80 shadow-md">
          <SpriteIcon name="ball" className="w-3.5 h-3.5" />
          <span className="text-[11px] font-carnival text-amber-200 whitespace-nowrap font-extrabold">x{ballsLeft}</span>
        </div>

        <button
          onClick={onToggleSound}
          className="w-6 h-6 rounded-md wood-button flex items-center justify-center text-amber-100 active:scale-95 shadow shrink-0"
          title={isSoundMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isSoundMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
        </button>

        <button
          onClick={onPause}
          className="w-6 h-6 rounded-md wood-button flex items-center justify-center text-amber-100 active:scale-95 shadow shrink-0"
          title="Pausa"
        >
          <Pause size={11} />
        </button>
      </div>
    </div>
  );
};
