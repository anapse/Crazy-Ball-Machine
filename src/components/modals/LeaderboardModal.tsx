import React, { useEffect, useState } from 'react';
import { X, Trophy, Medal, RefreshCw, Sparkles } from 'lucide-react';
import { LeaderboardEntry } from '../../types/game';
import { leaderboardService } from '../../utils/leaderboardService';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await leaderboardService.getTop50();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      <div className="relative w-full max-w-[88%] sm:max-w-xs wood-panel p-4 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-stone-900/80 border border-amber-500/80 flex items-center justify-center text-amber-300 hover:bg-stone-800 active:scale-95 z-10"
        >
          <X size={15} />
        </button>

        {/* Title and Refresh */}
        <div className="flex items-center justify-between mb-2 pr-6">
          <div className="flex items-center gap-1.5">
            <Trophy className="text-yellow-400" size={20} />
            <h2 className="text-lg font-carnival gold-text">TOP 50 MUNDIAL</h2>
          </div>
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="w-6 h-6 rounded-lg bg-stone-900/80 border border-amber-800 flex items-center justify-center text-amber-300 hover:bg-stone-800 disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-[10px] text-amber-300/80 mb-2">
          Récords oficiales registrados en Crazy Ball Machine.
        </p>

        {/* Ranking List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 text-xs">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-amber-300">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-[11px] font-bold">Cargando Top 50...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center text-amber-300/80 gap-1.5">
              <Sparkles size={24} className="text-yellow-400" />
              <p className="text-xs font-bold">¡Aún no hay puntuaciones!</p>
              <p className="text-[10px] text-amber-300/60">
                Sé el primer maestro del arcade en registrar tu récord.
              </p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              let badgeColor = 'bg-stone-950/80 border-amber-900/60 text-amber-300';
              let trophyIcon = null;

              if (rank === 1) {
                badgeColor = 'bg-gradient-to-r from-amber-600/40 to-yellow-600/20 border-yellow-400 text-yellow-300';
                trophyIcon = <Trophy size={14} className="text-yellow-400 shrink-0" />;
              } else if (rank === 2) {
                badgeColor = 'bg-gradient-to-r from-slate-600/40 to-slate-400/20 border-slate-300 text-slate-200';
                trophyIcon = <Medal size={14} className="text-slate-300 shrink-0" />;
              } else if (rank === 3) {
                badgeColor = 'bg-gradient-to-r from-amber-800/40 to-amber-600/20 border-amber-600 text-amber-300';
                trophyIcon = <Medal size={14} className="text-amber-500 shrink-0" />;
              }

              return (
                <div
                  key={entry.id || idx}
                  className={`flex items-center justify-between p-2 rounded-xl border ${badgeColor} transition-all`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-5 text-center text-[11px] font-carnival text-amber-200">
                      #{rank}
                    </span>
                    {trophyIcon}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-100 truncate">
                        {entry.playerName}
                      </p>
                      {entry.level && (
                        <p className="text-[9px] text-amber-300/70">
                          N{entry.level} • {entry.objectsDestroyed || 0} obj
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-carnival text-yellow-300 font-bold">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="text-[8px] block text-amber-300/60 uppercase">pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="mt-3 wood-button py-2 rounded-xl font-carnival text-yellow-300 text-xs active:scale-95"
        >
          CERRAR
        </button>
      </div>
    </div>
  );
};
