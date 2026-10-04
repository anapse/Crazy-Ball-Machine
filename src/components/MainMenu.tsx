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
  highScore,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-5 select-none bg-stone-950/80 backdrop-blur-sm z-30">
      {/* Top action bar: Contact on Top-Left, Sound on Top-Right */}
      <div className="flex items-center justify-between w-full">
        <button
          onClick={onOpenContact}
          className="wood-button px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-100 shadow-md active:scale-95"
          title="Contáctanos"
        >
          <Mail size={16} className="text-amber-300" />
          <span>CONTÁCTANOS</span>
        </button>

        <button
          onClick={onToggleSound}
          className="wood-button w-10 h-10 rounded-xl flex items-center justify-center text-amber-100 shadow-md active:scale-95"
          title={isSoundMuted ? 'Activar sonido' : 'Silenciar sonido'}
        >
          {isSoundMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* Center Carnival Title & Pinball Contraption Banner */}
      <div className="flex flex-col items-center text-center my-auto">
        {/* Machine Badge */}
        <div className="inline-block px-4 py-1 rounded-full bg-amber-950/90 border border-amber-600/80 text-[11px] font-extrabold uppercase tracking-widest text-amber-300 shadow-lg mb-2">
          🎡 MÁQUINA DE FÍSICA Y FERIA 🎪
        </div>

        {/* Vintage Title */}
        <div className="wood-panel px-6 py-4 rounded-3xl border-4 border-amber-500 shadow-2xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-red-600 text-[10px] font-bold tracking-widest text-white rounded-full border border-red-300 shadow">
            ANAPSE ARCADE
          </div>
          <h1 className="text-4xl md:text-5xl font-carnival gold-text leading-tight drop-shadow-lg">
            CRAZY BALL
          </h1>
          <h2 className="text-2xl md:text-3xl font-carnival text-red-500 tracking-wider -mt-1 drop-shadow">
            MACHINE
          </h2>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse delay-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse delay-150" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse delay-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse delay-300" />
          </div>
        </div>

        {/* Highscore display if any */}
        {highScore > 0 && (
          <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-200 text-xs font-bold shadow-md">
            <Trophy size={14} className="text-yellow-400" />
            <span>RÉCORD PERSONAL:</span>
            <span className="text-yellow-300 font-carnival">{highScore.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Main Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-[280px] mx-auto pb-4">
        {/* Play Button */}
        <button
          onClick={() => {
            soundManager.playRelease();
            onPlay();
          }}
          className="wood-button py-4 rounded-2xl flex items-center justify-center gap-3 text-xl font-carnival text-yellow-300 shadow-xl active:scale-95 group"
        >
          <Play size={26} className="fill-yellow-300 text-yellow-300 group-hover:scale-110 transition-transform" />
          <span>JUGAR</span>
        </button>

        {/* Top 50 Button */}
        <button
          onClick={onOpenLeaderboard}
          className="wood-button py-3 rounded-2xl flex items-center justify-center gap-2.5 text-base font-carnival text-amber-100 shadow-lg active:scale-95"
        >
          <Trophy size={20} className="text-yellow-400" />
          <span>TOP 50</span>
        </button>

        {/* How to play Button */}
        <button
          onClick={onOpenHowToPlay}
          className="wood-button py-3 rounded-2xl flex items-center justify-center gap-2 text-base font-carnival text-amber-200 shadow-lg active:scale-95"
        >
          <HelpCircle size={20} className="text-amber-300" />
          <span>CÓMO JUGAR</span>
        </button>
      </div>
    </div>
  );
};
