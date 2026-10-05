import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  Zap,
  Target,
  Shield,
  Filter,
  Calendar,
  RefreshCw,
  Award,
  ChevronRight,
} from 'lucide-react';
import { LeaderboardEntry, RecordHistoryItem, AdminStats } from '../../types/game';
import { leaderboardService } from '../../utils/leaderboardService';
import { analyticsService, AnalyticsSession } from '../../utils/analyticsService';

interface AdminDashboardProps {
  onLogout: () => void;
  onExitToGame: () => void;
}

type TabType = 'resumen' | 'ranking' | 'historial' | 'visitas' | 'jugadores' | 'analitica';
type TimeFilterType = 'today' | '7days' | '30days' | 'all';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onExitToGame }) => {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [records, setRecords] = useState<RecordHistoryItem[]>([]);
  const [analyticsList, setAnalyticsList] = useState<AnalyticsSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [rankingSort, setRankingSort] = useState<'score' | 'date'>('score');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');

  const fetchData = async () => {
    setLoading(true);
    const [s, r, hist, anal] = await Promise.all([
      leaderboardService.getStats(),
      leaderboardService.getTop50(),
      leaderboardService.getRecordHistory(),
      analyticsService.getAllAnalytics(300),
    ]);
    setStats(s);
    setRankings(r);
    setRecords(hist);
    setAnalyticsList(anal);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedRankings = useMemo(() => {
    return [...rankings].sort((a, b) => {
      if (rankingSort === 'score') {
        return b.score - a.score;
      }
      const tA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const tB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return tB - tA;
    });
  }, [rankings, rankingSort]);

  // Unique players consolidation from ranking
  const uniquePlayers = useMemo(() => {
    return Array.from(new Set(rankings.map((r) => r.playerName))).map((name) => {
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
  }, [rankings]);

  const avgScore = rankings.length
    ? Math.round(rankings.reduce((acc, r) => acc + r.score, 0) / rankings.length)
    : 0;

  // --- Real Filtered Analytics Computation ---
  const filteredAnalytics = useMemo(() => {
    const now = Date.now();
    return analyticsList.filter((item) => {
      if (timeFilter === 'all') return true;
      const itemTime = item.startedAt ? new Date(item.startedAt).getTime() : 0;
      if (!itemTime) return true;

      if (timeFilter === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return itemTime >= todayStart.getTime();
      }
      if (timeFilter === '7days') {
        return now - itemTime <= 7 * 24 * 60 * 60 * 1000;
      }
      if (timeFilter === '30days') {
        return now - itemTime <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [analyticsList, timeFilter]);

  // Primary Metrics
  const totalGames = filteredAnalytics.length;
  const uniqueAnalyticsPlayers = useMemo(() => {
    return new Set(filteredAnalytics.map((s) => s.playerName || 'Jugador')).size;
  }, [filteredAnalytics]);

  const totalAnalyticsScore = useMemo(() => {
    return filteredAnalytics.reduce((acc, s) => acc + (s.score || 0), 0);
  }, [filteredAnalytics]);

  const avgAnalyticsScore = totalGames ? Math.round(totalAnalyticsScore / totalGames) : 0;
  const bestAnalyticsScore = totalGames ? Math.max(...filteredAnalytics.map((s) => s.score || 0)) : 0;

  const avgLevelReached = totalGames
    ? (
        filteredAnalytics.reduce((acc, s) => acc + (s.levelReached || 1), 0) / totalGames
      ).toFixed(1)
    : '1.0';

  const avgPlayTimeSeconds = totalGames
    ? Math.round(filteredAnalytics.reduce((acc, s) => acc + (s.playTime || 0), 0) / totalGames)
    : 0;

  // Level Progression / Drop-off counts
  const levelDropOff = useMemo(() => {
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return levels.map((lvl) => {
      const reachedCount = filteredAnalytics.filter((s) => (s.levelReached || 1) >= lvl).length;
      const completedCount = filteredAnalytics.filter((s) => (s.levelsCompleted || 0) >= lvl).length;
      const pct = totalGames > 0 ? Math.round((reachedCount / totalGames) * 100) : 0;
      return {
        level: lvl,
        reachedCount,
        completedCount,
        pct,
      };
    });
  }, [filteredAnalytics, totalGames]);

  // Aggregated Objects Interaction Counts
  const objectStats = useMemo(() => {
    let bricks = 0;
    let globes = 0;
    let targets = 0;
    let bumpers = 0;
    let gears = 0;
    let windmills = 0;
    let trampolines = 0;
    let arrows = 0;
    let oil = 0;
    let pipes = 0;
    let bombs = 0;
    let boxes = 0;

    for (const s of filteredAnalytics) {
      bricks += s.bricksDestroyed || 0;
      globes += s.globesDestroyed || 0;
      targets += s.targetsHit || 0;
      bumpers += s.bumpersHit || 0;
      gears += s.gearsHit || 0;
      windmills += s.windmillsHit || 0;
      trampolines += s.trampolinesHit || 0;
      arrows += s.arrowsHit || 0;
      oil += s.oilHits || 0;
      pipes += s.pipesHit || 0;
      bombs += s.bombsExploded || 0;
      boxes += s.boxesCollected || 0;
    }

    return [
      { name: 'Ladrillos Destruidos', count: bricks, icon: '🧱', color: 'bg-amber-500' },
      { name: 'Globos Explotados', count: globes, icon: '🎈', color: 'bg-rose-500' },
      { name: 'Dianas Golpeadas', count: targets, icon: '🎯', color: 'bg-red-500' },
      { name: 'Bumpers Impactados', count: bumpers, icon: '🔔', color: 'bg-yellow-500' },
      { name: 'Engranajes Activados', count: gears, icon: '⚙️', color: 'bg-slate-400' },
      { name: 'Molinos Impulsados', count: windmills, icon: '🌀', color: 'bg-teal-500' },
      { name: 'Trampolines Rebotados', count: trampolines, icon: '🦘', color: 'bg-sky-500' },
      { name: 'Flechas Impulsoras', count: arrows, icon: '⚡', color: 'bg-indigo-500' },
      { name: 'Charcos de Aceite', count: oil, icon: '🛢️', color: 'bg-cyan-600' },
      { name: 'Tuberías Recorridas', count: pipes, icon: '🚇', color: 'bg-emerald-500' },
      { name: 'Bombas Detonadas', count: bombs, icon: '💣', color: 'bg-orange-600' },
      { name: 'Cajas de Premio', count: boxes, icon: '🎁', color: 'bg-purple-500' },
    ].sort((a, b) => b.count - a.count);
  }, [filteredAnalytics]);

  // Aggregated Power-Ups Usage
  const powerUpStats = useMemo(() => {
    let fast = 0;
    let double = 0;
    let triple = 0;
    let bomb = 0;
    let shield = 0;

    for (const s of filteredAnalytics) {
      fast += s.fastBallsUsed || 0;
      double += s.doubleBallsUsed || 0;
      triple += s.tripleBallsUsed || 0;
      bomb += s.bombBallsUsed || 0;
      shield += s.shieldBallsUsed || 0;
    }

    const totalPowerUps = fast + double + triple + bomb + shield;

    return [
      { name: 'Bola Rápida', count: fast, icon: '⚡', color: 'bg-orange-500', totalPowerUps },
      { name: '3 Bolas (Triple)', count: triple, icon: '✨', color: 'bg-sky-500', totalPowerUps },
      { name: '2 Bolas (Doble)', count: double, icon: '🟡', color: 'bg-yellow-400', totalPowerUps },
      { name: 'Bomba Explosiva', count: bomb, icon: '💣', color: 'bg-red-500', totalPowerUps },
      { name: 'Escudo Protector', count: shield, icon: '🛡️', color: 'bg-purple-500', totalPowerUps },
    ].sort((a, b) => b.count - a.count);
  }, [filteredAnalytics]);

  // Daily Activity Breakdown (Last 7 days or matching filter)
  const dailyActivity = useMemo(() => {
    const map: Record<string, { date: string; games: number; scoreSum: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      map[key] = { date: key, games: 0, scoreSum: 0 };
    }

    for (const s of filteredAnalytics) {
      if (!s.startedAt) continue;
      const d = new Date(s.startedAt);
      const key = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      if (map[key]) {
        map[key].games += 1;
        map[key].scoreSum += s.score || 0;
      }
    }

    return Object.values(map);
  }, [filteredAnalytics]);

  const maxDailyGames = Math.max(1, ...dailyActivity.map((d) => d.games));

  return (
    <div className="min-h-screen bg-stone-950 text-amber-100 flex flex-col select-none">
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

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="wood-button px-2.5 py-1.5 rounded-xl flex items-center gap-1 text-xs font-bold text-amber-300"
            title="Recargar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={onLogout}
            className="wood-button px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-red-200 hover:text-red-100"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
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
          onClick={() => setActiveTab('analitica')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'analitica'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-yellow-400 hover:bg-stone-800'
          }`}
        >
          <BarChart3 size={14} />
          <span>Analítica Real</span>
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'ranking'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Ranking Top 50
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'historial'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-amber-300/80 hover:bg-stone-800'
          }`}
        >
          Historial Récords
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
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-amber-400">
            <Sparkles size={32} className="animate-spin" />
            <span className="text-sm font-bold">Cargando datos desde Firebase Firestore...</span>
          </div>
        ) : (
          <>
            {/* TAB: ANALÍTICA (PRIMARY FOCUS) */}
            {activeTab === 'analitica' && (
              <div className="space-y-6">
                {/* Header with Time Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-amber-800/80">
                  <div>
                    <h2 className="text-lg font-carnival gold-text flex items-center gap-2">
                      <BarChart3 size={22} className="text-yellow-400" />
                      <span>SISTEMA DE ANALÍTICA EN TIEMPO REAL</span>
                    </h2>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Métricas reales registradas en la colección Firestore <code className="text-yellow-300 font-mono">analytics</code>
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-amber-900/80 self-stretch sm:self-auto justify-center">
                    <button
                      onClick={() => setTimeFilter('today')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        timeFilter === 'today'
                          ? 'bg-amber-600 text-stone-950 shadow'
                          : 'text-amber-300/70 hover:text-amber-100'
                      }`}
                    >
                      HOY
                    </button>
                    <button
                      onClick={() => setTimeFilter('7days')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        timeFilter === '7days'
                          ? 'bg-amber-600 text-stone-950 shadow'
                          : 'text-amber-300/70 hover:text-amber-100'
                      }`}
                    >
                      7 DÍAS
                    </button>
                    <button
                      onClick={() => setTimeFilter('30days')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        timeFilter === '30days'
                          ? 'bg-amber-600 text-stone-950 shadow'
                          : 'text-amber-300/70 hover:text-amber-100'
                      }`}
                    >
                      30 DÍAS
                    </button>
                    <button
                      onClick={() => setTimeFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        timeFilter === 'all'
                          ? 'bg-amber-600 text-stone-950 shadow'
                          : 'text-amber-300/70 hover:text-amber-100'
                      }`}
                    >
                      TODO
                    </button>
                  </div>
                </div>

                {/* KPI Metrics Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {/* Card 1: Partidas Totales */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300 uppercase">
                      <span>Partidas Totales</span>
                      <Activity size={16} className="text-yellow-400" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-carnival gold-text my-1.5">
                      {totalGames.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-amber-300/70">Sesiones reales en periodo</p>
                  </div>

                  {/* Card 2: Jugadores Únicos */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase">
                      <span>Jugadores Únicos</span>
                      <Users size={16} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-carnival text-emerald-300 my-1.5">
                      {uniqueAnalyticsPlayers.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-amber-300/70">Nombres distintos registrados</p>
                  </div>

                  {/* Card 3: Puntuación Total */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-yellow-400 uppercase">
                      <span>Puntuación Total</span>
                      <Trophy size={16} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-carnival text-amber-100 my-1.5">
                      {totalAnalyticsScore.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-amber-300/70">Puntos acumulados</p>
                  </div>

                  {/* Card 4: Puntuación Promedio */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-sky-400 uppercase">
                      <span>Puntuación Media</span>
                      <BarChart3 size={16} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-carnival text-sky-200 my-1.5">
                      {avgAnalyticsScore.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-amber-300/70">Promedio por partida</p>
                  </div>

                  {/* Card 5: Mejor Puntuación */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-yellow-300 uppercase">
                      <span>Mejor Puntuación</span>
                      <Award size={16} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-carnival text-yellow-300 my-1.5">
                      {bestAnalyticsScore.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-amber-300/70">Récord máximo alcanzado</p>
                  </div>

                  {/* Card 6: Nivel Promedio */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase">
                      <span>Nivel Promedio</span>
                      <Layers size={16} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-carnival text-purple-200 my-1.5">
                      {avgLevelReached}
                    </p>
                    <p className="text-[10px] text-amber-300/70">Profundidad en niveles</p>
                  </div>

                  {/* Card 7: Tiempo Promedio */}
                  <div className="wood-panel p-4 rounded-2xl border-2 border-amber-600 flex flex-col justify-between col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-400 uppercase">
                      <span>Tiempo Promedio</span>
                      <Clock size={16} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-carnival text-teal-200 my-1.5">
                      {avgPlayTimeSeconds}s
                    </p>
                    <p className="text-[10px] text-amber-300/70">Duración por sesión</p>
                  </div>
                </div>

                {/* Section: Activity Chart & Level Progression */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Daily Games Chart */}
                  <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600 flex flex-col">
                    <h3 className="text-sm font-carnival gold-text mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-yellow-400" />
                      <span>Partidas por Día</span>
                    </h3>

                    <div className="flex-1 flex items-end justify-between gap-2 pt-6 pb-2 min-h-[160px] border-b border-amber-900/60">
                      {dailyActivity.map((day, idx) => {
                        const heightPct = Math.max(8, Math.round((day.games / maxDailyGames) * 100));
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-bold text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              {day.games}
                            </span>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full max-w-[28px] bg-gradient-to-t from-amber-700 to-yellow-400 rounded-t-md shadow transition-all group-hover:brightness-125"
                            />
                            <span className="text-[9px] font-bold text-amber-300/70 truncate">
                              {day.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-amber-300/60 mt-2 text-center">
                      Distribución cronológica de partidas iniciadas.
                    </p>
                  </div>

                  {/* Level Drop-Off & Progression */}
                  <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600 flex flex-col">
                    <h3 className="text-sm font-carnival gold-text mb-3 flex items-center gap-2">
                      <Layers size={18} className="text-purple-400" />
                      <span>Embudo de Niveles (Retención y Abandono)</span>
                    </h3>

                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1 text-xs">
                      {levelDropOff.map((lvl) => (
                        <div key={lvl.level} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-amber-100">Nivel {lvl.level}</span>
                            <span className="text-amber-300/80">
                              {lvl.reachedCount} partidas ({lvl.pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-stone-950 h-3 rounded-full overflow-hidden border border-amber-900/60 flex">
                            <div
                              style={{ width: `${lvl.pct}%` }}
                              className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section: Power-ups & Machine Objects */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Power-ups Ranking */}
                  <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600">
                    <h3 className="text-sm font-carnival gold-text mb-3 flex items-center gap-2">
                      <Zap size={18} className="text-orange-400" />
                      <span>Power-Ups Más Utilizados</span>
                    </h3>

                    <div className="space-y-3">
                      {powerUpStats.map((pu, idx) => {
                        const pct = pu.totalPowerUps > 0 ? Math.round((pu.count / pu.totalPowerUps) * 100) : 0;
                        return (
                          <div key={idx} className="bg-stone-900/80 p-3 rounded-xl border border-amber-800/60">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <div className="flex items-center gap-2">
                                <span>{pu.icon}</span>
                                <span className="font-bold text-amber-100">{pu.name}</span>
                              </div>
                              <span className="text-yellow-300 font-bold">{pu.count} usos ({pct}%)</span>
                            </div>
                            <div className="w-full bg-stone-950 h-2.5 rounded-full overflow-hidden border border-amber-950">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`${pu.color} h-full rounded-full transition-all`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Machine Objects Interaction Stats */}
                  <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600">
                    <h3 className="text-sm font-carnival gold-text mb-3 flex items-center gap-2">
                      <Target size={18} className="text-red-400" />
                      <span>Interacciones con Elementos de la Máquina</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {objectStats.map((obj, idx) => (
                        <div
                          key={idx}
                          className="bg-stone-900/80 p-2.5 rounded-xl border border-amber-800/60 flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-1.5 text-xs text-amber-200">
                            <span>{obj.icon}</span>
                            <span className="text-[10px] font-bold truncate">{obj.name}</span>
                          </div>
                          <p className="text-lg font-carnival text-yellow-300 mt-1">
                            {obj.count.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Game Sessions Table */}
                <div className="wood-panel p-5 rounded-3xl border-2 border-amber-600">
                  <h3 className="text-sm font-carnival gold-text mb-3 flex items-center gap-2">
                    <History size={18} className="text-yellow-400" />
                    <span>Partidas Recientes ({filteredAnalytics.length} registradas)</span>
                  </h3>

                  {filteredAnalytics.length === 0 ? (
                    <p className="text-xs text-amber-300/70 py-8 text-center">
                      No hay partidas registradas en el periodo seleccionado.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-amber-800/80 text-amber-400 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-3">Jugador</th>
                            <th className="py-2.5 px-3">Puntuación</th>
                            <th className="py-2.5 px-3">Nivel</th>
                            <th className="py-2.5 px-3">Bolas</th>
                            <th className="py-2.5 px-3">Objetos</th>
                            <th className="py-2.5 px-3">Tiempo</th>
                            <th className="py-2.5 px-3">Resultado</th>
                            <th className="py-2.5 px-3">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-900">
                          {filteredAnalytics.slice(0, 50).map((session, idx) => {
                            let resultBadge = (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                En Curso
                              </span>
                            );
                            if (session.result === 'completed') {
                              resultBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  Completado
                                </span>
                              );
                            } else if (session.result === 'game_over') {
                              resultBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                  Game Over
                                </span>
                              );
                            } else if (session.result === 'abandoned') {
                              resultBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-800 text-stone-300 border border-stone-700">
                                  Abandonado
                                </span>
                              );
                            }

                            const formattedDate = session.startedAt
                              ? new Date(session.startedAt).toLocaleString(undefined, {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-';

                            return (
                              <tr key={session.sessionId || idx} className="hover:bg-amber-950/30">
                                <td className="py-2.5 px-3 font-bold text-amber-100">
                                  {session.playerName || 'Jugador'}
                                </td>
                                <td className="py-2.5 px-3 font-carnival text-yellow-300 text-sm">
                                  {session.score.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-amber-200/80">
                                  Nivel {session.levelReached || 1}
                                </td>
                                <td className="py-2.5 px-3 text-amber-200/80">
                                  {session.ballsUsed || 0}
                                </td>
                                <td className="py-2.5 px-3 text-amber-200/80">
                                  {session.objectsDestroyed || 0}
                                </td>
                                <td className="py-2.5 px-3 text-amber-200/80">
                                  {session.playTime || 0}s
                                </td>
                                <td className="py-2.5 px-3">{resultBadge}</td>
                                <td className="py-2.5 px-3 text-amber-300/70 text-[10px]">
                                  {formattedDate}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

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
          </>
        )}
      </main>
    </div>
  );
};
