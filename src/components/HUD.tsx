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

interface PowerUpItemConfig {
  type: BallType;
  name: string;
  activeBg: string;
  activeBorder: string;
  activeRing: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const POWER_UP_CONFIGS: PowerUpItemConfig[] = [
  {
    type: 'double',
    name: 'Bola Doble',
    activeBg: 'bg-amber-500/90',
    activeBorder: 'border-amber-300',
    activeRing: 'ring-yellow-300',
    badgeBg: 'bg-amber-950',
    badgeText: 'text-amber-200',
    badgeBorder: 'border-amber-600',
  },
  {
    type: 'triple',
    name: 'Bola Triple',
    activeBg: 'bg-sky-500/90',
    activeBorder: 'border-sky-300',
    activeRing: 'ring-sky-300',
    badgeBg: 'bg-sky-950',
    badgeText: 'text-sky-200',
    badgeBorder: 'border-sky-600',
  },
  {
    type: 'fast',
    name: 'Bola Veloz',
    activeBg: 'bg-orange-500/90',
    activeBorder: 'border-orange-300',
    activeRing: 'ring-orange-300',
    badgeBg: 'bg-orange-950',
    badgeText: 'text-orange-200',
    badgeBorder: 'border-orange-600',
  },
  {
    type: 'explosive',
    name: 'Bola Bomba',
    activeBg: 'bg-red-600/90',
    activeBorder: 'border-red-300',
    activeRing: 'ring-red-400',
    badgeBg: 'bg-red-950',
    badgeText: 'text-red-200',
    badgeBorder: 'border-red-600',
  },
  {
    type: 'shield',
    name: 'Bola Escudo',
    activeBg: 'bg-purple-600/90',
    activeBorder: 'border-purple-300',
    activeRing: 'ring-purple-400',
    badgeBg: 'bg-purple-950',
    badgeText: 'text-purple-200',
    badgeBorder: 'border-purple-600',
  },
];

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
    playerName,
  } = state;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 select-none z-20 w-full h-full max-w-full overflow-hidden">
      {/* Sleek, Non-Overflowing Top Header Bar */}
      <div className="flex items-center justify-between gap-1 pointer-events-auto w-full max-w-full">
        {/* Level, Player & Score Badge */}
        <div className="wood-panel px-1.5 py-0.5 rounded-lg flex items-center gap-1 border-amber-600/80 shadow-md shrink min-w-0 max-w-[40%]">
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
        <div className="wood-panel px-1.5 py-0.5 rounded-lg flex flex-col items-center flex-1 min-w-0 max-w-[105px] border-amber-600/80 shadow-md">
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
        <div className="flex items-center gap-1 shrink-0">
          <div className="wood-panel px-2 py-0.5 rounded-lg flex items-center gap-1.5 border-amber-600/80 shadow-md bg-stone-950/80" title="Bolas restantes">
            <SpriteIcon name="ball" className="w-4 h-4" />
            <div className="flex flex-col">
              <span className="text-[7px] uppercase font-black text-amber-400/80 leading-none">BOLAS</span>
              <span className="text-xs font-carnival text-amber-100 whitespace-nowrap font-extrabold leading-tight">{ballsLeft}</span>
            </div>
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

      {/* Bottom Power-Ups Bar (ALWAYS VISIBLE: ACTIVE / INACTIVE SLOTS) */}
      <div className="pointer-events-auto flex items-center justify-center pb-1 w-full max-w-full">
        <div className="wood-panel px-2 py-1 rounded-2xl flex items-center justify-center gap-1 sm:gap-1.5 border-amber-700/80 shadow-2xl backdrop-blur-md max-w-full">
          {POWER_UP_CONFIGS.map((cfg) => {
            const count = inventory[cfg.type as keyof typeof inventory] || 0;
            const isAvailable = count > 0;
            const isSelected = activePowerUp === cfg.type;

            if (isAvailable) {
              return (
                <button
                  key={cfg.type}
                  onClick={() => onSelectPowerUp(cfg.type)}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                    isSelected
                      ? `${cfg.activeBg} border-white shadow-lg scale-105 ring-2 ${cfg.activeRing}`
                      : 'bg-stone-900/90 border-amber-700/80 hover:bg-stone-800'
                  }`}
                  title={`${cfg.name} (${count} disponible${count > 1 ? 's' : ''})`}
                >
                  <SpriteIcon name={cfg.type} className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow" />
                  <span className={`absolute -top-1 -right-1 text-[8px] sm:text-[9px] font-black ${cfg.badgeBg} ${cfg.badgeText} px-1 rounded-full border ${cfg.badgeBorder} shadow`}>
                    {count}
                  </span>
                </button>
              );
            }

            // Inactive / Dimmed Slot (Requirement 7)
            return (
              <div
                key={cfg.type}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border border-stone-800/80 bg-stone-950/60 opacity-35 grayscale select-none"
                title={`${cfg.name} (Inactivo - Encuéntralo en las cajas)`}
              >
                <SpriteIcon name={cfg.type} className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
                <span className="absolute -top-1 -right-1 text-[7px] sm:text-[8px] font-black bg-stone-900 text-stone-500 px-1 rounded-full border border-stone-800">
                  0
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
