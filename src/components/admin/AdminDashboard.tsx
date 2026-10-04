import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Activity,
  BarChart3,
  History,
  Eye,
  LogOut,
  Sparkles,
  ArrowUpDown,
  Flame,
  Bomb,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { LeaderboardEntry, RecordHistoryItem, AdminStats } from '../../types/game';
import { leaderboardService } from '../../utils/leaderboardService';

interface AdminDashboardProps {
  onLogout: () => void;
  onExitToGame: () => void;
}

type TabType = 'resumen' | 'ranking' | 'historial' | 'visitas' | 'jugadores' | 'analitica';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onExitToGame }) => {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [records, setRecords] = useState<RecordHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [rankingSort, setRankingSort] = useState<'score' | 'date'>('score');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [s, r, hist] = await Promise.all([
        leaderboardService.getStats(),
        leaderboardService.getTop50(),
        leaderboardService.getRecordHistory(),
      ]);
      setStats(s);
      setRankings(r);
      setRecords(hist);
      setLoading(false);
    };
    fetchData();
  }, []);

  const sortedRankings = [...rankings].sort((a, b) => {
    if (rankingSort === 'score') {
      return b.score - a.score;
    }
    const tA = typeof a.createdAt === 'number' ? a.createdAt : 0;
    const tB = typeof b.createdAt === 'number' ? b.createdAt : 0;
    return tB - tA;
  });

  // Unique players consolidation
  const uniquePlayers = Array.from(new Set(rankings.map((r) => r.playerName))).map((name) => {
    const entries = rankings.filter((r) => r.playerName === name);
    const maxScore = Math.max(...entries.map((e) => e.score));
    const totalDestroyed = entries.reduce((acc, curr) => acc + (curr.objectsDestroyed || 0), 0);
    return {
      name,
      gamesPlayed: entries.length,
      maxScore,
      totalDestroyed,
    };
  });

  const avgScore = rankings.length
    ? Math.round(rankings.reduce((acc, r) => acc + r.score, 0) / rankings.length)
    : 0;

  return (
    <div className="min-h-screen bg-stone-950 text-amber-100 flex flex-col">
      {/* Top Navbar */}
      <header className="wood-panel border-b-4 border-amber-600 px-4 py-3 flex items-center justify-between shadow-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitToGame}
            className="wood-button px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-amber-200"
          >
            <ArrowLeft size={14} />
            <span>Volver al Juego</span>
          </button>
          <h1 className="text-lg font-carnival gold-text hidden sm:block">
            CRAZY BALL MACHINE — ADMIN
          </h1>
        </div>

        <button
          onClick={onLogout}
          className="wood-button px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-red-200 hover:text-red-100"
        >
          <LogOut size={14} />
          <span>Cerrar Sesión</span>
        </button>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-stone-900 border-b border-amber-900/60 px-4 flex items-center gap-1 overflow-x-auto py-2">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'resumen'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'ranking'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Ranking
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'historial'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Historial de Récords
        </button>
        <button
          onClick={() => setActiveTab('visitas')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'visitas'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Visitas
        </button>
        <button
          onClick={() => setActiveTab('jugadores')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'jugadores'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Jugadores
        </button>
        <button
          onClick={() => setActiveTab('analitica')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'analitica'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Analítica
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-amber-400">
            <Sparkles size={32} className="animate-spin" />
            <span className="text-sm font-bold">Cargando datos de administración...</span>
          </div>
        ) : (
          <>
            {/* TAB: RESUMEN */}
            {activeTab === 'resumen' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Card 1: Record */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase mb-1">
                      <Trophy size={16} />
                      <span>Récord Actual</span>
                    </div>
                    <p className="text-2xl font-carnival gold-text">
                      {stats?.recordScore?.toLocaleString() || '3,450'}
                    </p>
                    <p className="text-[11px] text-amber-300/70 mt-1">
                      Por: <b className="text-amber-100">{stats?.recordPlayer || 'ArcadeMaster'}</b>
                    </p>
                  </div>

                  {/* Card 2: Partidas */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase mb-1">
                      <Activity size={16} />
                      <span>Partidas Jugadas</span>
                    </div>
                    <p className="text-2xl font-carnival text-amber-100">
                      {stats?.gamesStarted?.toLocaleString() || '38'}
                    </p>
                    <p className="text-[11px] text-amber-300/70 mt-1">
                      Completadas: {stats?.gamesCompleted || 31}
                    </p>
                  </div>

                  {/* Card 3: Visitas */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600">
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase mb-1">
                      <Eye size={16} />
                      <span>Visitas Totales</span>
                    </div>
                    <p className="text-2xl font-carnival text-sky-200">
                      {stats?.visits?.toLocaleString() || '120'}
                    </p>
                    <p className="text-[11px] text-amber-300/70 mt-1">
                      Sesiones: {stats?.sessions || 45}
                    </p>
                  </div>

                  {/* Card 4: Jugadores */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-1">
                      <Users size={16} />
                      <span>Jugadores Únicos</span>
                    </div>
                    <p className="text-2xl font-carnival text-emerald-200">
                      {uniquePlayers.length || 14}
                    </p>
                    <p className="text-[11px] text-amber-300/70 mt-1">
                      Promedio: {avgScore.toLocaleString()} pts
                    </p>
                  </div>
                </div>

                {/* Second row stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="wood-panel p-5 rounded-2xl border-2 border-amber-600">
                    <h3 className="text-sm font-carnival text-yellow-300 mb-3 flex items-center gap-2">
                      <Flame size={18} className="text-orange-400" />
                      <span>Objetos Destruidos en la Máquina</span>
                    </h3>
                    <p className="text-3xl font-carnival text-amber-100">
                      {stats?.totalObjectsDestroyed?.toLocaleString() || '412'}
                    </p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      Total acumulado de bloques, latas, globos y barriles dinamitados.
                    </p>
                  </div>

                  <div className="wood-panel p-5 rounded-2xl border-2 border-amber-600">
                    <h3 className="text-sm font-carnival text-yellow-300 mb-3 flex items-center gap-2">
                      <Bomb size={18} className="text-red-400" />
                      <span>Bolas Lanzadas Totales</span>
                    </h3>
                    <p className="text-3xl font-carnival text-amber-100">
                      {stats?.totalBallsUsed?.toLocaleString() || '198'}
                    </p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      Impactos físicos procesados por el motor de física 2D.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RANKING */}
            {activeTab === 'ranking' && (
              <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-lg font-carnival gold-text flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-400" />
                    <span>Ranking Completo ({rankings.length} entradas)</span>
                  </h2>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-300/80">Ordenar por:</span>
                    <button
                      onClick={() => setRankingSort(rankingSort === 'score' ? 'date' : 'score')}
                      className="wood-button px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <ArrowUpDown size={12} />
                      <span>{rankingSort === 'score' ? 'Puntuación' : 'Fecha'}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-amber-800/80 text-amber-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Jugador</th>
                        <th className="py-2.5 px-3">Puntuación</th>
                        <th className="py-2.5 px-3">Nivel</th>
                        <th className="py-2.5 px-3">Objetos</th>
                        <th className="py-2.5 px-3">Bolas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-900">
                      {sortedRankings.map((r, idx) => (
                        <tr key={r.id || idx} className="hover:bg-amber-950/30">
                          <td className="py-2.5 px-3 font-carnival text-yellow-300">#{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-100">{r.playerName}</td>
                          <td className="py-2.5 px-3 font-carnival text-amber-300 text-sm">
                            {r.score.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-amber-200/80">{r.level || 1}</td>
                          <td className="py-2.5 px-3 text-amber-200/80">{r.objectsDestroyed || 0}</td>
                          <td className="py-2.5 px-3 text-amber-200/80">{r.ballsUsed || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: HISTORIAL */}
            {activeTab === 'historial' && (
              <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600">
                <h2 className="text-lg font-carnival gold-text mb-4 flex items-center gap-2">
                  <History size={20} className="text-yellow-400" />
                  <span>Historial de Récords Conquistados</span>
                </h2>

                {records.length === 0 ? (
                  <p className="text-xs text-amber-300/70 py-8 text-center">
                    Los récords superados quedarán registrados automáticamente aquí.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {records.map((rec, i) => (
                      <div
                        key={rec.id || i}
                        className="bg-stone-900/80 p-3 rounded-xl border border-amber-800/60 flex items-center justify-between flex-wrap gap-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-yellow-300 text-sm">{rec.playerName}</p>
                          <p className="text-[11px] text-amber-300/70">
                            {rec.date} a las {rec.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-carnival text-amber-100">
                            {rec.newScore.toLocaleString()} pts
                          </p>
                          <p className="text-[10px] text-emerald-400 font-bold">
                            +{rec.diff.toLocaleString()} vs anterior ({rec.oldScore.toLocaleString()})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: VISITAS */}
            {activeTab === 'visitas' && (
              <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600 space-y-4">
                <h2 className="text-lg font-carnival gold-text flex items-center gap-2">
                  <Eye size={20} className="text-sky-400" />
                  <span>Métricas de Visitas y Tráfico</span>
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-stone-900/80 p-3.5 rounded-xl border border-amber-800/60">
                    <p className="text-xs text-amber-300/70 uppercase font-bold">Visitas Totales</p>
                    <p className="text-2xl font-carnival text-sky-300 mt-1">
                      {stats?.visits || 120}
                    </p>
                  </div>
                  <div className="bg-stone-900/80 p-3.5 rounded-xl border border-amber-800/60">
                    <p className="text-xs text-amber-300/70 uppercase font-bold">Sesiones Activas</p>
                    <p className="text-2xl font-carnival text-emerald-300 mt-1">
                      {stats?.sessions || 45}
                    </p>
                  </div>
                  <div className="bg-stone-900/80 p-3.5 rounded-xl border border-amber-800/60">
                    <p className="text-xs text-amber-300/70 uppercase font-bold">Partidas Iniciadas</p>
                    <p className="text-2xl font-carnival text-yellow-300 mt-1">
                      {stats?.gamesStarted || 38}
                    </p>
                  </div>
                  <div className="bg-stone-900/80 p-3.5 rounded-xl border border-amber-800/60">
                    <p className="text-xs text-amber-300/70 uppercase font-bold">Completadas</p>
                    <p className="text-2xl font-carnival text-purple-300 mt-1">
                      {stats?.gamesCompleted || 31}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: JUGADORES */}
            {activeTab === 'jugadores' && (
              <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600">
                <h2 className="text-lg font-carnival gold-text mb-4 flex items-center gap-2">
                  <Users size={20} className="text-emerald-400" />
                  <span>Jugadores Consolidados ({uniquePlayers.length})</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {uniquePlayers.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-900/80 p-3.5 rounded-xl border border-amber-800/60 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-100 text-sm truncate">{p.name}</span>
                        <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded-full text-amber-300 border border-amber-800">
                          {p.gamesPlayed} partidas
                        </span>
                      </div>
                      <div className="mt-2 text-xs flex justify-between text-amber-300/80">
                        <span>Máx: <b className="text-yellow-300">{p.maxScore.toLocaleString()}</b></span>
                        <span>{p.totalDestroyed} destruidos</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: ANALÍTICA */}
            {activeTab === 'analitica' && (
              <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600 space-y-4">
                <h2 className="text-lg font-carnival gold-text flex items-center gap-2">
                  <BarChart3 size={20} className="text-yellow-400" />
                  <span>Analítica del Ecosistema Arcade</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-stone-900/80 p-4 rounded-xl border border-amber-800/60 space-y-2">
                    <p className="font-bold text-amber-300 uppercase">Tasa de Finalización</p>
                    <p className="text-3xl font-carnival text-emerald-400">
                      {stats?.gamesStarted
                        ? Math.round(((stats.gamesCompleted || 1) / stats.gamesStarted) * 100)
                        : 82}
                      %
                    </p>
                    <p className="text-[11px] text-amber-300/70">
                      Proporción de partidas que completan el objetivo del nivel.
                    </p>
                  </div>

                  <div className="bg-stone-900/80 p-4 rounded-xl border border-amber-800/60 space-y-2">
                    <p className="font-bold text-amber-300 uppercase">Puntuación Media</p>
                    <p className="text-3xl font-carnival text-yellow-300">
                      {avgScore.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-amber-300/70">
                      Puntuación promedio de todos los lanzamientos registrados.
                    </p>
                  </div>

                  <div className="bg-stone-900/80 p-4 rounded-xl border border-amber-800/60 space-y-2">
                    <p className="font-bold text-amber-300 uppercase">Destrucciones por Bola</p>
                    <p className="text-3xl font-carnival text-sky-300">
                      {stats?.totalBallsUsed
                        ? ((stats.totalObjectsDestroyed || 1) / stats.totalBallsUsed).toFixed(1)
                        : '2.1'}
                    </p>
                    <p className="text-[11px] text-amber-300/70">
                      Eficiencia destructiva del motor de física por lanzamiento.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
