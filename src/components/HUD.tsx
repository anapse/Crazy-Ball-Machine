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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 select-none z-20 overflow-hidden w-full h-full max-w-full">
      {/* Sleek Top Header Bar */}
      <div className="flex items-center justify-between gap-1.5 pointer-events-auto w-full max-w-full">
        {/* Level & Score Combined Badge */}
        <div className="wood-panel px-2.5 py-1 rounded-xl flex items-center gap-2 border-amber-600/80 shadow-lg shrink-0">
          <span className="text-[10px] uppercase font-black text-amber-300 bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-700/60 whitespace-nowrap">
            NIVEL {levelNumber}
          </span>
          <span className="text-sm font-carnival gold-text font-bold whitespace-nowrap tracking-wide">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Goal / Objective Progress Badge */}
        <div className="wood-panel px-2.5 py-1 rounded-xl flex flex-col items-center min-w-[95px] max-w-[140px] flex-1 border-amber-600/80 shadow-lg">
          <div className="flex items-center justify-between w-full text-[10px] font-bold text-amber-100 leading-tight">
            <span className="text-amber-200">CAJAS</span>
            <span className="text-yellow-300 font-carnival text-xs font-black ml-1 whitespace-nowrap">
              {goalProgress}/{goalTarget}
            </span>
          </div>
          <div className="w-full bg-stone-950 h-1.5 rounded-full mt-1 overflow-hidden border border-amber-900/60">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (goalProgress / goalTarget) * 100)}%` }}
            />
          </div>
        </div>

        {/* Balls Left & Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="wood-panel px-2 py-1 rounded-xl flex items-center gap-1.5 border-amber-600/80 shadow-lg">
            <SpriteIcon name="ball" className="w-5 h-5" />
            <span className="text-xs font-carnival text-amber-200 whitespace-nowrap font-extrabold">x{ballsLeft}</span>
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

      {/* Bottom Power-Ups Bar with Official Sprite Icons */}
      {hasPowerups && (
        <div className="pointer-events-auto flex items-center justify-center gap-1.5 pb-1 w-full max-w-full overflow-x-auto">
          <div className="wood-panel px-2 py-1 rounded-2xl flex items-center gap-1.5 border-amber-700/80 shadow-2xl backdrop-blur-md">
            {inventory.double > 0 && (
              <button
                onClick={() => onSelectPowerUp('double')}
                className={`relative px-2 py-1 rounded-xl flex items-center gap-1 text-[11px] font-extrabold border transition-all ${
                  activePowerUp === 'double'
                    ? 'bg-amber-500 text-stone-950 border-white shadow-lg scale-105 ring-2 ring-yellow-300'
                    : 'bg-stone-900/80 text-amber-200 border-amber-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="double" className="w-5 h-5" />
                <span>x2</span>
                <span className="text-[9px] bg-amber-950 px-1 rounded-full border border-amber-700">
                  {inventory.double}
                </span>
              </button>
            )}

            {inventory.triple > 0 && (
              <button
                onClick={() => onSelectPowerUp('triple')}
                className={`relative px-2 py-1 rounded-xl flex items-center gap-1 text-[11px] font-extrabold border transition-all ${
                  activePowerUp === 'triple'
                    ? 'bg-sky-500 text-stone-950 border-white shadow-lg scale-105 ring-2 ring-sky-300'
                    : 'bg-stone-900/80 text-sky-200 border-sky-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="triple" className="w-5 h-5" />
                <span>x3</span>
                <span className="text-[9px] bg-sky-950 px-1 rounded-full border border-sky-700">
                  {inventory.triple}
                </span>
              </button>
            )}

            {inventory.fast > 0 && (
              <button
                onClick={() => onSelectPowerUp('fast')}
                className={`relative px-2 py-1 rounded-xl flex items-center gap-1 text-[11px] font-extrabold border transition-all ${
                  activePowerUp === 'fast'
                    ? 'bg-orange-500 text-stone-950 border-white shadow-lg scale-105 ring-2 ring-orange-300'
                    : 'bg-stone-900/80 text-orange-200 border-orange-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="fast" className="w-5 h-5" />
                <span>VELOZ</span>
                <span className="text-[9px] bg-orange-950 px-1 rounded-full border border-orange-700">
                  {inventory.fast}
                </span>
              </button>
            )}

            {inventory.explosive > 0 && (
              <button
                onClick={() => onSelectPowerUp('explosive')}
                className={`relative px-2 py-1 rounded-xl flex items-center gap-1 text-[11px] font-extrabold border transition-all ${
                  activePowerUp === 'explosive'
                    ? 'bg-red-600 text-white border-white shadow-lg scale-105 ring-2 ring-red-400'
                    : 'bg-stone-900/80 text-red-200 border-red-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="explosive" className="w-5 h-5" />
                <span>BOMBA</span>
                <span className="text-[9px] bg-red-950 px-1 rounded-full border border-red-700">
                  {inventory.explosive}
                </span>
              </button>
            )}

            {inventory.shield > 0 && (
              <button
                onClick={() => onSelectPowerUp('shield')}
                className={`relative px-2 py-1 rounded-xl flex items-center gap-1 text-[11px] font-extrabold border transition-all ${
                  activePowerUp === 'shield'
                    ? 'bg-purple-600 text-white border-white shadow-lg scale-105 ring-2 ring-purple-400'
                    : 'bg-stone-900/80 text-purple-200 border-purple-700 hover:bg-stone-800'
                }`}
              >
                <SpriteIcon name="shield" className="w-5 h-5" />
                <span>ESCUDO</span>
                <span className="text-[9px] bg-purple-950 px-1 rounded-full border border-purple-700">
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
