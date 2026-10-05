import React from 'react';
import { Play, Trophy, HelpCircle, Mail, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface MainMenuProps {
  onPlay: () => void;
  onOpenLeaderboard: () => void;
  onOpenHowToPlay: () => void;
  onOpenContact: () => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
  highScore: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onPlay,
  onOpenLeaderboard,
  onOpenHowToPlay,
  onOpenContact,
  isSoundMuted,
  onToggleSound,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-4 select-none bg-transparent z-30">
      {/* Top action bar: Contact on Top-Left, Sound on Top-Right */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={onOpenContact}
          className="wood-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold text-amber-100 shadow-md active:scale-95"
          title="Contáctanos"
        >
          <Mail size={14} className="text-amber-300" />
          <span>CONTÁCTANOS</span>
        </button>

        <button
          onClick={onToggleSound}
          className="wood-button w-8 h-8 rounded-lg flex items-center justify-center text-amber-100 shadow-md active:scale-95"
          title={isSoundMuted ? 'Activar sonido' : 'Silenciar sonido'}
        >
          {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Center Logo */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="my-1 relative flex justify-center">
          <img
            src="assets/sprites/logo.png"
            alt="Crazy Ball Machine"
            className="w-64 max-w-full h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-transform hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Compact Main Action Buttons */}
      <div className="flex flex-col gap-2 w-full max-w-[210px] mx-auto pb-3">
        {/* Play Button */}
        <button
          onClick={() => {
            soundManager.playRelease();
            onPlay();
          }}
          className="wood-button py-2.5 rounded-xl flex items-center justify-center gap-2 text-base font-carnival text-yellow-300 shadow-lg active:scale-95 group"
        >
          <Play size={20} className="fill-yellow-300 text-yellow-300 group-hover:scale-110 transition-transform" />
          <span>JUGAR</span>
        </button>

        {/* Top 50 Button */}
        <button
          onClick={onOpenLeaderboard}
          className="wood-button py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-carnival text-amber-100 shadow-md active:scale-95"
        >
          <Trophy size={16} className="text-yellow-400" />
          <span>TOP 50</span>
        </button>

        {/* How to play Button */}
        <button
          onClick={onOpenHowToPlay}
          className="wood-button py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-carnival text-amber-200 shadow-md active:scale-95"
        >
          <HelpCircle size={16} className="text-amber-300" />
          <span>CÓMO JUGAR</span>
        </button>
      </div>
    </div>
  );
};
