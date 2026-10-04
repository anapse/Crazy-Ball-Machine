import React from 'react';
import { GameSnapshot, BallType } from '../types/game';
import { Pause, Volume2, VolumeX, Flame, Zap, Shield, Sparkles } from 'lucide-react';

interface HUDProps {
  state: GameSnapshot;
  onPause: () => void;
  onSelectPowerUp: (type: BallType) => void;
  onToggleSound: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  state,
  onPause,
  onSelectPowerUp,
  onToggleSound,
}) => {
  const {
    score,
    ballsLeft,
    goalProgress,
    goalTarget,
    levelNumber,
    activePowerUp,
    inventory,
    isSoundMuted,
  } = state;

  const hasPowerups =
    inventory.double > 0 ||
    inventory.triple > 0 ||
    inventory.fast > 0 ||
    inventory.explosive > 0 ||
    inventory.shield > 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 select-none z-20 overflow-hidden w-full h-full max-w-full">
      {/* Top Header Bar - Fully responsive, zero clipping */}
      <div className="flex items-center justify-between gap-1 pointer-events-auto w-full max-w-full">
        {/* Level & Score Combined Badge */}
        <div className="wood-panel px-2 py-1 rounded-xl flex items-center gap-1.5 border-amber-600/80 shadow-md shrink-0">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-300 bg-amber-950/90 px-1 py-0.5 rounded border border-amber-700/60 whitespace-nowrap">
            LVL {levelNumber}
          </span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] uppercase text-amber-200/70 font-bold">PTS</span>
            <span className="text-xs sm:text-sm font-carnival gold-text font-bold whitespace-nowrap">
              {score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Goal / Objective Progress Badge */}
        <div className="wood-panel px-2 py-1 rounded-xl flex flex-col items-center min-w-[90px] max-w-[130px] flex-1 border-amber-600/80 shadow-md">
          <div className="flex items-center justify-between w-full text-[9px] font-bold text-amber-100 leading-tight">
            <span className="truncate">OBJ</span>
            <span className="text-yellow-300 font-carnival text-xs ml-1 whitespace-nowrap">
              {goalProgress}/{goalTarget}
            </span>
          </div>
          <div className="w-full bg-stone-900 h-1.5 rounded-full mt-0.5 overflow-hidden border border-amber-900/60">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
              style={{ width: `${Math.min(100, (goalProgress / goalTarget) * 100)}%` }}
            />
          </div>
        </div>

        {/* Balls Left & Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="wood-panel px-1.5 py-1 rounded-xl flex items-center gap-1 border-amber-600/80 shadow-md">
            <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-slate-200 via-slate-400 to-slate-800 border border-slate-300 shadow-sm shrink-0" />
            <span className="text-xs font-carnival text-amber-200 whitespace-nowrap font-bold">x{ballsLeft}</span>
          </div>

          <button
            onClick={onToggleSound}
            className="w-7 h-7 rounded-lg wood-button flex items-center justify-center text-amber-100 active:scale-95 shadow shrink-0"
            title={isSoundMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isSoundMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          <button
            onClick={onPause}
            className="w-7 h-7 rounded-lg wood-button flex items-center justify-center text-amber-100 active:scale-95 shadow shrink-0"
            title="Pausa"
          >
            <Pause size={13} />
          </button>
        </div>
      </div>

      {/* Bottom Power-Ups Bar (Compact strip) */}
      {hasPowerups && (
        <div className="pointer-events-auto flex items-center justify-center gap-1 pb-1 w-full max-w-full overflow-x-auto">
          <div className="wood-panel px-1.5 py-1 rounded-2xl flex items-center gap-1 border-amber-700/80 shadow-xl backdrop-blur-sm">
            {inventory.double > 0 && (
              <button
                onClick={() => onSelectPowerUp('double')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-bold border transition-all ${
                  activePowerUp === 'double'
                    ? 'bg-amber-500 text-stone-950 border-white shadow scale-105 ring-2 ring-yellow-300'
                    : 'bg-stone-900/80 text-amber-200 border-amber-700'
                }`}
              >
                <Sparkles size={11} />
                <span>x2</span>
                <span className="text-[8px] bg-amber-900/80 px-1 rounded-full">
                  {inventory.double}
                </span>
              </button>
            )}

            {inventory.triple > 0 && (
              <button
                onClick={() => onSelectPowerUp('triple')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-bold border transition-all ${
                  activePowerUp === 'triple'
                    ? 'bg-sky-500 text-stone-950 border-white shadow scale-105 ring-2 ring-sky-300'
                    : 'bg-stone-900/80 text-sky-200 border-sky-700'
                }`}
              >
                <Sparkles size={11} />
                <span>x3</span>
                <span className="text-[8px] bg-sky-900/80 px-1 rounded-full">
                  {inventory.triple}
                </span>
              </button>
            )}

            {inventory.fast > 0 && (
              <button
                onClick={() => onSelectPowerUp('fast')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-bold border transition-all ${
                  activePowerUp === 'fast'
                    ? 'bg-orange-500 text-stone-950 border-white shadow scale-105 ring-2 ring-orange-300'
                    : 'bg-stone-900/80 text-orange-200 border-orange-700'
                }`}
              >
                <Zap size={11} />
                <span>VELOZ</span>
                <span className="text-[8px] bg-orange-900/80 px-1 rounded-full">
                  {inventory.fast}
                </span>
              </button>
            )}

            {inventory.explosive > 0 && (
              <button
                onClick={() => onSelectPowerUp('explosive')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-bold border transition-all ${
                  activePowerUp === 'explosive'
                    ? 'bg-red-600 text-white border-white shadow scale-105 ring-2 ring-red-400'
                    : 'bg-stone-900/80 text-red-200 border-red-700'
                }`}
              >
                <Flame size={11} />
                <span>BOMBA</span>
                <span className="text-[8px] bg-red-900/80 px-1 rounded-full">
                  {inventory.explosive}
                </span>
              </button>
            )}

            {inventory.shield > 0 && (
              <button
                onClick={() => onSelectPowerUp('shield')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-bold border transition-all ${
                  activePowerUp === 'shield'
                    ? 'bg-purple-600 text-white border-white shadow scale-105 ring-2 ring-purple-400'
                    : 'bg-stone-900/80 text-purple-200 border-purple-700'
                }`}
              >
                <Shield size={11} />
                <span>ESCUDO</span>
                <span className="text-[8px] bg-purple-900/80 px-1 rounded-full">
                  {inventory.shield}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
