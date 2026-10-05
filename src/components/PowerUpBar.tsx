import React from 'react';
import { BallType, PowerUpInventory } from '../types/game';
import { SpriteIcon } from './SpriteIcon';

interface PowerUpBarProps {
  inventory: PowerUpInventory;
  activePowerUp: BallType | null;
  onSelectPowerUp: (type: BallType) => void;
}

interface SlotConfig {
  type: BallType;
  name: string;
  activeBg: string;
  activeBorder: string;
  activeRing: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const POWER_UP_SLOTS: SlotConfig[] = [
  {
    type: 'double',
    name: 'Bola Doble',
    activeBg: 'bg-amber-500/95',
    activeBorder: 'border-yellow-300',
    activeRing: 'ring-yellow-400 shadow-yellow-500/50',
    badgeBg: 'bg-amber-950',
    badgeText: 'text-amber-200',
    badgeBorder: 'border-amber-600',
  },
  {
    type: 'triple',
    name: 'Bola Triple',
    activeBg: 'bg-sky-500/95',
    activeBorder: 'border-sky-300',
    activeRing: 'ring-sky-400 shadow-sky-500/50',
    badgeBg: 'bg-sky-950',
    badgeText: 'text-sky-200',
    badgeBorder: 'border-sky-600',
  },
  {
    type: 'fast',
    name: 'Bola Veloz',
    activeBg: 'bg-orange-500/95',
    activeBorder: 'border-orange-300',
    activeRing: 'ring-orange-400 shadow-orange-500/50',
    badgeBg: 'bg-orange-950',
    badgeText: 'text-orange-200',
    badgeBorder: 'border-orange-600',
  },
  {
    type: 'explosive',
    name: 'Bola Bomba',
    activeBg: 'bg-red-600/95',
    activeBorder: 'border-red-300',
    activeRing: 'ring-red-400 shadow-red-500/50',
    badgeBg: 'bg-red-950',
    badgeText: 'text-red-200',
    badgeBorder: 'border-red-600',
  },
  {
    type: 'shield',
    name: 'Bola Escudo',
    activeBg: 'bg-purple-600/95',
    activeBorder: 'border-purple-300',
    activeRing: 'ring-purple-400 shadow-purple-500/50',
    badgeBg: 'bg-purple-950',
    badgeText: 'text-purple-200',
    badgeBorder: 'border-purple-600',
  },
];

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  inventory,
  activePowerUp,
  onSelectPowerUp,
}) => {
  return (
    <div className="w-full h-full flex items-center justify-between px-1 select-none pointer-events-auto">
      {POWER_UP_SLOTS.map((slot) => {
        const count = inventory[slot.type as keyof PowerUpInventory] || 0;
        const isAvailable = count > 0;
        const isSelected = activePowerUp === slot.type;

        return (
          <div key={slot.type} className="w-1/5 h-full flex items-center justify-center p-0.5">
            {isAvailable ? (
              <button
                onClick={() => onSelectPowerUp(slot.type)}
                className={`relative w-full max-w-[48px] h-10 sm:h-11 rounded-xl flex items-center justify-center border-2 transition-all active:scale-95 shadow-lg ${
                  isSelected
                    ? `${slot.activeBg} ${slot.activeBorder} ring-2 ${slot.activeRing} scale-105`
                    : 'bg-stone-900 border-amber-700/80 hover:bg-stone-800'
                }`}
                title={`${slot.name} (${count} disponible${count > 1 ? 's' : ''})`}
              >
                <SpriteIcon name={slot.type} className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow" />
                <span
                  className={`absolute -top-1.5 -right-1 text-[9px] font-black ${slot.badgeBg} ${slot.badgeText} px-1 rounded-full border ${slot.badgeBorder} shadow-md`}
                >
                  {count}
                </span>
              </button>
            ) : (
              // Inactive / Dimmed slot (Requirements 2, 11)
              <div
                className="relative w-full max-w-[48px] h-10 sm:h-11 rounded-xl flex items-center justify-center border border-stone-800/80 bg-stone-950/70 opacity-35 grayscale select-none cursor-not-allowed"
                title={`${slot.name} (Inactivo - Encuéntralo en las cajas)`}
              >
                <SpriteIcon name={slot.type} className="w-5 h-5 sm:w-6 sm:h-6 opacity-40" />
                <span className="absolute -top-1.5 -right-1 text-[8px] font-black bg-stone-900 text-stone-600 px-1 rounded-full border border-stone-800">
                  0
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
