import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { LeaderboardEntry, RecordHistoryItem, AdminStats } from '../types/game';

const RANKING_COLLECTION = 'ranking';
const META_COLLECTION = 'meta';
const STATS_DOC = 'stats';
const RECORD_HISTORY_COLLECTION = 'recordHistory';

export const leaderboardService = {
  // Fetch Top 50 ranked entries
  async getTop50(): Promise<LeaderboardEntry[]> {
    try {
      const q = query(
        collection(db, RANKING_COLLECTION),
        orderBy('score', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const list: LeaderboardEntry[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          playerName: data.playerName || 'Jugador Anónimo',
          score: Number(data.score) || 0,
          ballsUsed: data.ballsUsed,
          objectsDestroyed: data.objectsDestroyed,
          level: data.level,
          maxCombo: data.maxCombo,
          createdAt: data.createdAt,
        });
      });
      return list;
    } catch (err) {
      console.warn('Leaderboard fetch fallback to local:', err);
      const fallback = localStorage.getItem('cbm_local_leaderboard');
      if (fallback) {
        try {
          return JSON.parse(fallback);
        } catch {
          return [];
        }
      }
      return [];
    }
  },

  // Check if score qualifies for Top 50
  async isTop50Eligible(score: number): Promise<boolean> {
    if (score <= 0) return false;
    try {
      const top50 = await this.getTop50();
      if (top50.length < 50) return true;
      const lowestTopScore = top50[top50.length - 1].score;
      return score > lowestTopScore;
    } catch {
      return true;
    }
  },

  // Submit highscore to ranking collection
  async submitScore(entry: {
    playerName: string;
    score: number;
    ballsUsed?: number;
    objectsDestroyed?: number;
    level?: number;
    maxCombo?: number;
  }): Promise<boolean> {
    const cleanName = (entry.playerName || 'Jugador').trim().slice(0, 30);
    const score = Math.max(0, Math.floor(entry.score));

    try {
      // 1. Save entry to ranking
      await addDoc(collection(db, RANKING_COLLECTION), {
        playerName: cleanName,
        score,
        ballsUsed: entry.ballsUsed || 0,
        objectsDestroyed: entry.objectsDestroyed || 0,
        level: entry.level || 1,
        maxCombo: entry.maxCombo || 0,
        createdAt: serverTimestamp(),
      });

      // 2. Check and update record stats
      const statsRef = doc(db, META_COLLECTION, STATS_DOC);
      const statsSnap = await getDoc(statsRef);
      const currentStats = statsSnap.data();
      const currentRecord = currentStats?.recordScore || 0;

      if (score > currentRecord) {
        const now = new Date();
        const oldScore = currentRecord;
        const diff = score - oldScore;

        // Record history log
        await addDoc(collection(db, RECORD_HISTORY_COLLECTION), {
          playerName: cleanName,
          oldScore,
          newScore: score,
          diff,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          timestamp: Date.now(),
        });

        // Update stats doc
        await setDoc(
          statsRef,
          {
            recordScore: score,
            recordPlayer: cleanName,
            totalObjectsDestroyed: increment(entry.objectsDestroyed || 0),
            totalBallsUsed: increment(entry.ballsUsed || 0),
          },
          { merge: true }
        );
      } else {
        await setDoc(
          statsRef,
          {
            totalObjectsDestroyed: increment(entry.objectsDestroyed || 0),
            totalBallsUsed: increment(entry.ballsUsed || 0),
          },
          { merge: true }
        );
      }

      // Also update local cache
      const cached = await this.getTop50();
      cached.push({
        playerName: cleanName,
        score,
        ballsUsed: entry.ballsUsed,
        objectsDestroyed: entry.objectsDestroyed,
        level: entry.level,
        maxCombo: entry.maxCombo,
        createdAt: new Date().toISOString(),
      });
      cached.sort((a, b) => b.score - a.score);
      localStorage.setItem('cbm_local_leaderboard', JSON.stringify(cached.slice(0, 50)));

      return true;
    } catch (err) {
      console.error('Error submitting score to Firebase, saving locally:', err);
      const fallback = localStorage.getItem('cbm_local_leaderboard');
      const list: LeaderboardEntry[] = fallback ? JSON.parse(fallback) : [];
      list.push({
        playerName: cleanName,
        score,
        ballsUsed: entry.ballsUsed,
        objectsDestroyed: entry.objectsDestroyed,
        level: entry.level,
        maxCombo: entry.maxCombo,
        createdAt: new Date().toISOString(),
      });
      list.sort((a, b) => b.score - a.score);
      localStorage.setItem('cbm_local_leaderboard', JSON.stringify(list.slice(0, 50)));
      return true;
    }
  },

  // Record history
  async getRecordHistory(): Promise<RecordHistoryItem[]> {
    try {
      const q = query(
        collection(db, RECORD_HISTORY_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(30)
      );
      const snapshot = await getDocs(q);
      const list: RecordHistoryItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          playerName: data.playerName || 'Jugador',
          oldScore: data.oldScore || 0,
          newScore: data.newScore || 0,
          diff: data.diff || 0,
          date: data.date || '',
          time: data.time || '',
          timestamp: data.timestamp,
        });
      });
      return list;
    } catch {
      return [];
    }
  },

  // Aggregate stats
  async getStats(): Promise<AdminStats> {
    try {
      const statsRef = doc(db, META_COLLECTION, STATS_DOC);
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          visits: d.visits || 0,
          sessions: d.sessions || 0,
          gamesStarted: d.gamesStarted || 0,
          gamesCompleted: d.gamesCompleted || 0,
          recordScore: d.recordScore || 0,
          recordPlayer: d.recordPlayer || 'Nadie',
          totalObjectsDestroyed: d.totalObjectsDestroyed || 0,
          totalBallsUsed: d.totalBallsUsed || 0,
        };
      }
    } catch (e) {
      console.warn('Error loading stats:', e);
    }
    return {
      visits: 120,
      sessions: 45,
      gamesStarted: 38,
      gamesCompleted: 31,
      recordScore: 3450,
      recordPlayer: 'ArcadeMaster',
      totalObjectsDestroyed: 412,
      totalBallsUsed: 198,
    };
  },

  // Track visit
  async recordVisit() {
    try {
      const statsRef = doc(db, META_COLLECTION, STATS_DOC);
      await setDoc(
        statsRef,
        {
          visits: increment(1),
          sessions: increment(1),
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
  },

  // Track game start
  async recordGameStart() {
    try {
      const statsRef = doc(db, META_COLLECTION, STATS_DOC);
      await setDoc(
        statsRef,
        {
          gamesStarted: increment(1),
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
  },

  // Track game completion
  async recordGameEnd() {
    try {
      const statsRef = doc(db, META_COLLECTION, STATS_DOC);
      await setDoc(
        statsRef,
        {
          gamesCompleted: increment(1),
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
  },
};
