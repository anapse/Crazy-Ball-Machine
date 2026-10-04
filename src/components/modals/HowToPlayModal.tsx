import React from 'react';
import { X, HelpCircle, MoveHorizontal, MousePointerClick, Zap, Flame, Sparkles, Shield, Gift } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm wood-panel p-5 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 max-h-[88vh] flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-900/80 border border-amber-500/80 flex items-center justify-center text-amber-300 hover:bg-stone-800 active:scale-95 z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="text-yellow-400" size={24} />
          <h2 className="text-xl font-carnival gold-text">CÓMO JUGAR</h2>
        </div>

        {/* Scrollable instructions */}
        <div className="overflow-y-auto pr-1 space-y-3 text-xs">
          {/* Step 1 */}
          <div className="flex items-start gap-3 bg-stone-950/60 p-2.5 rounded-2xl border border-amber-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300 shrink-0">
              <MoveHorizontal size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-200 text-sm">1. Coloca la Bola</p>
              <p className="text-amber-300/80 text-[11px] leading-tight mt-0.5">
                Arrastra horizontalmente con el dedo o mueve el ratón para elegir uno de los 5 canales superiores.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 bg-stone-950/60 p-2.5 rounded-2xl border border-amber-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300 shrink-0">
              <MousePointerClick size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-200 text-sm">2. Doble Tap / Doble Clic</p>
              <p className="text-amber-300/80 text-[11px] leading-tight mt-0.5">
                Haz doble tap para soltar. La bola cae por la máquina y la física hace el resto. ¡La cámara te acompaña!
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 bg-stone-950/60 p-2.5 rounded-2xl border border-amber-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300 shrink-0">
              <Gift size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-200 text-sm">3. Destrucción Persistente</p>
              <p className="text-amber-300/80 text-[11px] leading-tight mt-0.5">
                Los bloques destruidos abren nuevos caminos para tus siguientes bolas. ¡El laberinto evoluciona!
              </p>
            </div>
          </div>

          {/* Elements guide */}
          <div className="bg-stone-950/60 p-2.5 rounded-2xl border border-amber-800/60">
            <p className="font-bold text-amber-200 text-xs mb-2 uppercase tracking-wide">
              Mecanismos y Físicas
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-100">
                <span className="text-blue-400 font-bold">⚡ Aceite:</span>
                <span>Acelera tu bola</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-100">
                <span className="text-red-400 font-bold">🔴 Muelle:</span>
                <span>Súper rebote</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-100">
                <span className="text-sky-300 font-bold">🌀 Viento:</span>
                <span>Desvía la caída</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-100">
                <span className="text-rose-500 font-bold">💣 Bombas:</span>
                <span>Peligro / Explosión</span>
              </div>
            </div>
          </div>

          {/* Power-ups list */}
          <div className="bg-stone-950/60 p-2.5 rounded-2xl border border-amber-800/60">
            <p className="font-bold text-amber-200 text-xs mb-2 uppercase tracking-wide">
              Bolas Especiales
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400" />
                <span className="text-amber-100"><b>Doble / Triple:</b> Lanza múltiples bolas</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-orange-400" />
                <span className="text-amber-100"><b>Rápida:</b> Gran velocidad inicial</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-red-400" />
                <span className="text-amber-100"><b>Explosiva:</b> Detona y continúa su camino</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-purple-400" />
                <span className="text-amber-100"><b>Escudo:</b> Inmune a peligros</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer button */}
        <button
          onClick={onClose}
          className="mt-4 wood-button py-2.5 rounded-xl font-carnival text-yellow-300 text-sm active:scale-95"
        >
          ¡ENTENDIDO!
        </button>
      </div>
    </div>
  );
};
