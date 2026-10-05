import React from 'react';
import { GameSnapshot, BallType } from '../types/game';
import { Pause, Volume2, VolumeX } from 'lucide-react';
import { SpriteIcon } from './SpriteIcon';

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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 select-none z-20 w-full h-full max-w-full">
      {/* Sleek, Non-Overflowing Top Header Bar */}
      <div className="flex items-center justify-between gap-1 pointer-events-auto w-full max-w-full">
        {/* Level & Score Badge */}
        <div className="wood-panel px-1.5 py-0.5 rounded-lg flex items-center gap-1 border-amber-600/80 shadow-md shrink min-w-0">
          <span className="text-[9px] uppercase font-black text-amber-300 bg-amber-950 px-1 py-0.2 rounded border border-amber-700/60 whitespace-nowrap">
            N{levelNumber}
          </span>
          <span className="text-xs font-carnival gold-text font-bold whitespace-nowrap tracking-tight truncate">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Goal / Objective Progress Badge */}
        <div className="wood-panel px-1.5 py-0.5 rounded-lg flex flex-col items-center flex-1 min-w-0 max-w-[110px] border-amber-600/80 shadow-md">
          <div className="flex items-center justify-between w-full text-[9px] font-bold text-amber-100 leading-tight">
            <span className="text-amber-200 text-[8px] uppercase">CAJAS</span>
            <span className="text-yellow-300 font-carnival text-[11px] font-black ml-0.5 whitespace-nowrap">
              {goalProgress}/{goalTarget}
            </span>
          </div>
          <div className="w-full bg-stone-950 h-1 rounded-full mt-0.5 overflow-hidden border border-amber-900/60">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (goalProgress / goalTarget) * 100)}%` }}
            />
          </div>
        </div>

        {/* Balls Left & Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="wood-panel px-1.5 py-0.5 rounded-lg flex items-center gap-1 border-amber-600/80 shadow-md">
            <SpriteIcon name="ball" className="w-4 h-4" />
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

      {/* Bottom Power-Ups Bar (Compact, Wraps in 2 rows if necessary) */}
      {hasPowerups && (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 pb-1 w-full max-w-full">
          <div className="wood-panel px-1.5 py-0.5 rounded-xl flex flex-wrap items-center justify-center gap-1 border-amber-700/80 shadow-xl backdrop-blur-md max-w-full">
            {inventory.double > 0 && (
              <button
                onClick={() => onSelectPowerUp('double')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-extrabold border transition-all ${
                  activePowerUp === 'double'
                    ? 'bg-amber-500 text-stone-950 border-white shadow scale-105 ring-1 ring-yellow-300'
                    : 'bg-stone-900/80 text-amber-200 border-amber-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="double" className="w-4 h-4" />
                <span>x2</span>
                <span className="text-[8px] bg-amber-950 px-0.5 rounded border border-amber-700">
                  {inventory.double}
                </span>
              </button>
            )}

            {inventory.triple > 0 && (
              <button
                onClick={() => onSelectPowerUp('triple')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-extrabold border transition-all ${
                  activePowerUp === 'triple'
                    ? 'bg-sky-500 text-stone-950 border-white shadow scale-105 ring-1 ring-sky-300'
                    : 'bg-stone-900/80 text-sky-200 border-sky-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="triple" className="w-4 h-4" />
                <span>x3</span>
                <span className="text-[8px] bg-sky-950 px-0.5 rounded border border-sky-700">
                  {inventory.triple}
                </span>
              </button>
            )}

            {inventory.fast > 0 && (
              <button
                onClick={() => onSelectPowerUp('fast')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-extrabold border transition-all ${
                  activePowerUp === 'fast'
                    ? 'bg-orange-500 text-stone-950 border-white shadow scale-105 ring-1 ring-orange-300'
                    : 'bg-stone-900/80 text-orange-200 border-orange-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="fast" className="w-4 h-4" />
                <span>VELOZ</span>
                <span className="text-[8px] bg-orange-950 px-0.5 rounded border border-orange-700">
                  {inventory.fast}
                </span>
              </button>
            )}

            {inventory.explosive > 0 && (
              <button
                onClick={() => onSelectPowerUp('explosive')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-extrabold border transition-all ${
                  activePowerUp === 'explosive'
                    ? 'bg-red-600 text-white border-white shadow scale-105 ring-1 ring-red-400'
                    : 'bg-stone-900/80 text-red-200 border-red-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="explosive" className="w-4 h-4" />
                <span>BOMBA</span>
                <span className="text-[8px] bg-red-950 px-0.5 rounded border border-red-700">
                  {inventory.explosive}
                </span>
              </button>
            )}

            {inventory.shield > 0 && (
              <button
                onClick={() => onSelectPowerUp('shield')}
                className={`relative px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-extrabold border transition-all ${
                  activePowerUp === 'shield'
                    ? 'bg-purple-600 text-white border-white shadow scale-105 ring-1 ring-purple-400'
                    : 'bg-stone-900/80 text-purple-200 border-purple-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="shield" className="w-4 h-4" />
                <span>ESCUDO</span>
                <span className="text-[8px] bg-purple-950 px-0.5 rounded border border-purple-700">
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
