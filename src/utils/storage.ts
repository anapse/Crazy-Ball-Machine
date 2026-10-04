export const storage = {
  getHighScore(): number {
    const v = localStorage.getItem('cbm_high_score');
    return v ? parseInt(v, 10) || 0 : 0;
  },
  setHighScore(score: number) {
    const current = this.getHighScore();
    if (score > current) {
      localStorage.setItem('cbm_high_score', String(score));
    }
  },
  getPlayerName(): string {
    return localStorage.getItem('cbm_player_name') || '';
  },
  setPlayerName(name: string) {
    localStorage.setItem('cbm_player_name', name.trim());
  },
  getRecentScores(): { score: number; date: string }[] {
    const v = localStorage.getItem('cbm_recent_scores');
    return v ? JSON.parse(v) : [];
  },
  saveRecentScore(score: number) {
    const scores = this.getRecentScores();
    scores.unshift({
      score,
      date: new Date().toLocaleDateString(),
    });
    localStorage.setItem('cbm_recent_scores', JSON.stringify(scores.slice(0, 10)));
  },
};
