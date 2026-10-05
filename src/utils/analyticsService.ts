import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

export interface AnalyticsSession {
  id?: string;
  sessionId: string;
  playerName: string;
  score: number;
  levelReached: number;
  levelsCompleted: number;
  ballsUsed: number;
  objectsDestroyed: number;
  boxesCollected: number;
  playTime: number; // in seconds
  startedAt: string;
  finishedAt: string;
  result: 'completed' | 'game_over' | 'abandoned';

  // Object interactions
  bricksDestroyed: number;
  globesDestroyed: number;
  targetsHit: number;
  bumpersHit: number;
  gearsHit: number;
  windmillsHit: number;
  trampolinesHit: number;
  arrowsHit: number;
  oilHits: number;
  pipesHit: number;
  bombsExploded: number;

  // Power-up usage
  fastBallsUsed: number;
  multiBallsUsed: number;
  bombBallsUsed: number;
  specialBallsUsed: number;
  doubleBallsUsed: number;
  tripleBallsUsed: number;
  shieldBallsUsed: number;
}

const ANALYTICS_COLLECTION = 'analytics';

export const analyticsService = {
  // Create a brand new active session state for a game
  createNewSession(playerName: string): AnalyticsSession {
    const cleanName = (playerName || 'Jugador').trim().slice(0, 30);
    const nowIso = new Date().toISOString();
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      sessionId,
      playerName: cleanName,
      score: 0,
      levelReached: 1,
      levelsCompleted: 0,
      ballsUsed: 0,
      objectsDestroyed: 0,
      boxesCollected: 0,
      playTime: 0,
      startedAt: nowIso,
      finishedAt: nowIso,
      result: 'abandoned', // default until finished or game over

      bricksDestroyed: 0,
      globesDestroyed: 0,
      targetsHit: 0,
      bumpersHit: 0,
      gearsHit: 0,
      windmillsHit: 0,
      trampolinesHit: 0,
      arrowsHit: 0,
      oilHits: 0,
      pipesHit: 0,
      bombsExploded: 0,

      fastBallsUsed: 0,
      multiBallsUsed: 0,
      bombBallsUsed: 0,
      specialBallsUsed: 0,
      doubleBallsUsed: 0,
      tripleBallsUsed: 0,
      shieldBallsUsed: 0,
    };
  },

  // Persist / update the session doc in Firestore analytics collection
  async saveSession(session: AnalyticsSession): Promise<boolean> {
    try {
      const docRef = doc(db, ANALYTICS_COLLECTION, session.sessionId);
      await setDoc(docRef, { ...session }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Analytics save error to Firestore:', err);
      return false;
    }
  },

  // Fetch all analytics records directly from Firestore
  async getAllAnalytics(maxLimit: number = 300): Promise<AnalyticsSession[]> {
    try {
      const q = query(
        collection(db, ANALYTICS_COLLECTION),
        orderBy('startedAt', 'desc'),
        limit(maxLimit)
      );
      const snap = await getDocs(q);
      const list: AnalyticsSession[] = [];
      snap.forEach((d) => {
        const data = d.data() as AnalyticsSession;
        list.push({
          ...data,
          id: d.id,
        });
      });
      return list;
    } catch (err) {
      console.warn('Analytics fetch error from Firestore:', err);
      return [];
    }
  },
};
