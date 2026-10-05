import React, { useState, useEffect, useRef } from 'react';
import { User, Play } from 'lucide-react';
import { storage } from '../../utils/storage';
import { soundManager } from '../../audio/soundManager';

interface PlayerNameModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
}

export const PlayerNameModal: React.FC<PlayerNameModalProps> = ({
  isOpen,
  onSubmit,
}) => {
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = storage.getPlayerName() || '';
      setName(saved);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) {
      setError('Escribe al menos 2 letras');
      return;
    }
    soundManager.playWoodBounce(0.8);
    onSubmit(clean);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      <div className="relative w-full max-w-[85%] sm:max-w-xs wood-panel p-5 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 flex flex-col items-center text-center">
        {/* Top Decorative Icon */}
        <div className="w-11 h-11 rounded-2xl bg-amber-600/30 border-2 border-amber-400 flex items-center justify-center mb-2 shadow-inner">
          <User className="text-yellow-400" size={22} />
        </div>

        {/* Header */}
        <h2 className="text-2xl font-carnival gold-text tracking-wider mb-1">
          TU NOMBRE
        </h2>
        <p className="text-[11px] text-amber-300/80 mb-3.5 leading-tight">
          Ingresa tu nombre antes de comenzar a jugar
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="w-full relative">
            <input
              ref={inputRef}
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Escribe tu nombre..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/95 border-2 border-amber-500/90 text-amber-100 text-center font-bold text-base focus:outline-none focus:border-yellow-400 placeholder:text-stone-500 shadow-inner"
            />
            {error && (
              <p className="text-[10px] text-rose-400 font-bold mt-1 animate-pulse">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={name.trim().length < 2}
            className="w-full wood-button py-3 rounded-xl flex items-center justify-center gap-2 font-carnival text-yellow-300 text-lg shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            <Play size={18} className="fill-yellow-300 text-yellow-300" />
            <span>JUGAR</span>
          </button>
        </form>
      </div>
    </div>
  );
};
