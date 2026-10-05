import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onMenu,
  isMuted,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      <div className="w-full max-w-[85%] sm:max-w-xs wood-panel p-5 rounded-3xl border-4 border-amber-600 shadow-2xl flex flex-col items-center text-center">
        <h2 className="text-2xl font-carnival gold-text mb-4">PAUSA</h2>

        <div className="flex flex-col gap-2.5 w-full">
          {/* Continuar */}
          <button
            onClick={onResume}
            className="wood-button py-3 rounded-2xl flex items-center justify-center gap-2.5 font-carnival text-yellow-300 text-base shadow-lg active:scale-95"
          >
            <Play size={18} className="fill-yellow-300" />
            <span>CONTINUAR</span>
          </button>

          {/* Reiniciar */}
          <button
            onClick={onRestart}
            className="wood-button py-2.5 rounded-2xl flex items-center justify-center gap-2 font-carnival text-amber-100 text-sm shadow-md active:scale-95"
          >
            <RotateCcw size={16} />
            <span>REINICIAR</span>
          </button>

          {/* Sonido */}
          <button
            onClick={onToggleSound}
            className="wood-button py-2 rounded-2xl flex items-center justify-center gap-2 font-carnival text-amber-200 text-xs shadow-md active:scale-95"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isMuted ? 'ACTIVAR SONIDO' : 'SILENCIAR'}</span>
          </button>

          {/* Menú Principal */}
          <button
            onClick={onMenu}
            className="wood-button py-2 rounded-2xl flex items-center justify-center gap-2 font-carnival text-amber-300 text-xs shadow-md active:scale-95 mt-0.5"
          >
            <Home size={15} />
            <span>MENÚ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
