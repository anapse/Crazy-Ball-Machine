import { GAME_CONSTANTS } from './constants';
import { Ball } from '../types/game';

export class Camera {
  public y: number = 0;
  public targetY: number = 0;
  private isReturning: boolean = false;
  private maxScrollY: number = GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.VIEWPORT_HEIGHT;

  constructor() {
    this.reset();
  }

  public reset() {
    this.y = 0;
    this.targetY = 0;
    this.isReturning = false;
  }

  public followBalls(balls: Ball[]) {
    this.isReturning = false;
    const activeBalls = balls.filter((b) => b.active);
    if (activeBalls.length === 0) return;

    // Follow the lowest active ball
    let maxYBall = activeBalls[0];
    for (let i = 1; i < activeBalls.length; i++) {
      if (activeBalls[i].y > maxYBall.y) {
        maxYBall = activeBalls[i];
      }
    }

    // Lead the ball slightly below screen center
    const desiredY = maxYBall.y - GAME_CONSTANTS.CAMERA_LEAD_Y;
    this.targetY = Math.max(0, Math.min(desiredY, this.maxScrollY));
  }

  public returnToTop() {
    this.isReturning = true;
    this.targetY = 0;
  }

  public update(dt: number) {
    const factor = this.isReturning
      ? GAME_CONSTANTS.CAMERA_RETURN_SPEED
      : GAME_CONSTANTS.CAMERA_SMOOTH_FACTOR;

    // Frame-rate independent lerp
    const lerpSpeed = 1 - Math.pow(1 - factor, dt * 60);
    this.y += (this.targetY - this.y) * lerpSpeed;

    if (this.isReturning && Math.abs(this.y) < 1) {
      this.y = 0;
    }
  }

  public isAtTop(threshold = 5): boolean {
    return this.y <= threshold;
  }

  public transformY(worldY: number): number {
    return worldY - this.y;
  }

  public isVisible(worldY: number, height = 50): boolean {
    const screenY = this.transformY(worldY);
    return screenY + height >= -100 && screenY <= GAME_CONSTANTS.VIEWPORT_HEIGHT + 100;
  }
}
