import React from 'react';
import { X, HelpCircle, MoveHorizontal, MousePointerClick, Zap, Flame, Sparkles, Shield, Gift } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      <div className="relative w-full max-w-[88%] sm:max-w-xs wood-panel p-4 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 max-h-[85vh] flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-stone-900/80 border border-amber-500/80 flex items-center justify-center text-amber-300 hover:bg-stone-800 active:scale-95 z-10"
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <HelpCircle className="text-yellow-400" size={20} />
          <h2 className="text-lg font-carnival gold-text">CÓMO JUGAR</h2>
        </div>

        {/* Scrollable instructions */}
        <div className="overflow-y-auto pr-1 space-y-2.5 text-xs">
          {/* Step 1 */}
          <div className="flex items-start gap-2 bg-stone-950/70 p-2 rounded-xl border border-amber-800/60">
            <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300 shrink-0">
              <MoveHorizontal size={15} />
            </div>
            <div>
              <p className="font-bold text-amber-200 text-xs">1. Elige el Canal</p>
              <p className="text-amber-300/80 text-[10px] leading-tight mt-0.5">
                Arrastra o toca para seleccionar entre los 5 canales de lanzamiento superiores.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-2 bg-stone-950/70 p-2 rounded-xl border border-amber-800/60">
            <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300 shrink-0">
              <MousePointerClick size={15} />
            </div>
            <div>
              <p className="font-bold text-amber-200 text-xs">2. Lanza la Bola</p>
              <p className="text-amber-300/80 text-[10px] leading-tight mt-0.5">
                Doble tap / doble clic para soltar la bola. La física real y los rebotes dinámicos guían el descenso.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-2 bg-stone-950/70 p-2 rounded-xl border border-amber-800/60">
            <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300 shrink-0">
              <Gift size={15} />
            </div>
            <div>
              <p className="font-bold text-amber-200 text-xs">3. Cajas y Power-Ups</p>
              <p className="text-amber-300/80 text-[10px] leading-tight mt-0.5">
                Rompe las cajas inferiores para conseguir bolas y power-ups que se conservan entre niveles.
              </p>
            </div>
          </div>

          {/* Elements guide */}
          <div className="bg-stone-950/70 p-2 rounded-xl border border-amber-800/60">
            <p className="font-bold text-amber-200 text-[11px] mb-1.5 uppercase tracking-wide">
              Mecanismos del Pinball
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1 text-amber-100">
                <span className="text-yellow-400 font-bold">🎯 Dianas:</span>
                <span>Puntos pinball</span>
              </div>
              <div className="flex items-center gap-1 text-amber-100">
                <span className="text-cyan-400 font-bold">🎈 Globos:</span>
                <span>Explotan al golpe</span>
              </div>
              <div className="flex items-center gap-1 text-amber-100">
                <span className="text-orange-400 font-bold">➔ Flechas:</span>
                <span>Aceleran con fuerza</span>
              </div>
              <div className="flex items-center gap-1 text-amber-100">
                <span className="text-rose-400 font-bold">💣 Bombas:</span>
                <span>Explosión en cadena</span>
              </div>
            </div>
          </div>

          {/* Power-ups list */}
          <div className="bg-stone-950/70 p-2 rounded-xl border border-amber-800/60">
            <p className="font-bold text-amber-200 text-[11px] mb-1.5 uppercase tracking-wide">
              Bolas Especiales
            </p>
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-yellow-400" />
                <span className="text-amber-100"><b>Doble / Triple:</b> Múltiples bolas simultáneas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="text-orange-400" />
                <span className="text-amber-100"><b>Rápida:</b> Alta velocidad y penetración</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame size={12} className="text-red-400" />
                <span className="text-amber-100"><b>Bomba:</b> Detona al primer impacto sólido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={12} className="text-purple-400" />
                <span className="text-amber-100"><b>Escudo:</b> Inmune a explosivos y peligros</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer button */}
        <button
          onClick={onClose}
          className="mt-3 wood-button py-2 rounded-xl font-carnival text-yellow-300 text-xs active:scale-95"
        >
          ¡ENTENDIDO!
        </button>
      </div>
    </div>
  );
};
