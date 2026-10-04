import {
  Ball,
  MachineObject,
  Particle,
  FloatingText,
  BreakableBlock,
  Ramp,
  PipeChute,
  MovingBar,
  LeverObstacle,
  Trampoline,
  Fan,
  OilSlick,
  BombHazard,
  Balloon,
  Gear,
  Magnet,
  TargetCan,
  PrizeBox,
} from '../types/game';
import { GAME_CONSTANTS, BLOCK_COLOR_POINTS, BLOCK_COLOR_STYLES } from './constants';
import { soundManager } from '../audio/soundManager';

export interface PhysicsEvent {
  type:
    | 'OBJECT_DESTROYED'
    | 'BALL_LOST'
    | 'BOX_OPENED'
    | 'POWERUP_COLLECTED'
    | 'TARGET_HIT'
    | 'COMBO_UP';
  points: number;
  boxReward?: string;
  x?: number;
  y?: number;
  text?: string;
}

export class PhysicsEngine {
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  private textIdCounter = 0;

  public update(
    dt: number,
    balls: Ball[],
    objects: MachineObject[],
    onEvent: (ev: PhysicsEvent) => void
  ) {
    // 1. Update dynamic obstacle positions and pivot rotations
    this.updateObstaclePositions(dt, objects);

    // 2. Physics substepping
    const substeps = 5;
    const subDt = Math.min(dt, 0.05) / substeps;

    for (let s = 0; s < substeps; s++) {
      for (const ball of balls) {
        if (!ball.active) continue;

        // Apply Gravity
        ball.vy += GAME_CONSTANTS.GRAVITY * subDt;

        // Apply Terminal Velocity
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > GAME_CONSTANTS.TERMINAL_VELOCITY) {
          const ratio = GAME_CONSTANTS.TERMINAL_VELOCITY / speed;
          ball.vx *= ratio;
          ball.vy *= ratio;
        }

        // Move ball
        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;

        // Boundary collisions (Machine left & right walls)
        const minX = ball.radius + 12;
        const maxX = GAME_CONSTANTS.WORLD_WIDTH - ball.radius - 12;

        if (ball.x < minX) {
          ball.x = minX;
          ball.vx = Math.abs(ball.vx) * GAME_CONSTANTS.RESTITUTION;
          soundManager.playWoodBounce(0.5);
        } else if (ball.x > maxX) {
          ball.x = maxX;
          ball.vx = -Math.abs(ball.vx) * GAME_CONSTANTS.RESTITUTION;
          soundManager.playWoodBounce(0.5);
        }

        // Trail recording
        if (s === 0) {
          ball.trail.unshift({ x: ball.x, y: ball.y, alpha: 0.6 });
          if (ball.trail.length > 8) ball.trail.pop();
        }

        // Interacting with machine objects
        for (const obj of objects) {
          if (obj.destroyed) continue;

          switch (obj.type) {
            case 'ramp':
              this.handleRampCollision(ball, obj);
              break;

            case 'pipe':
              this.handlePipeCollision(ball, obj as PipeChute);
              break;

            case 'moving_bar':
              this.handleMovingBarCollision(ball, obj);
              break;

            case 'lever':
              this.handleLeverCollision(ball, obj);
              break;

            case 'breakable_block':
              this.handleBlockCollision(ball, obj, onEvent, objects);
              break;

            case 'trampoline':
              this.handleTrampolineCollision(ball, obj);
              break;

            case 'fan':
              this.handleFanForce(ball, obj, subDt);
              break;

            case 'oil':
              this.handleOilCollision(ball, obj);
              break;

            case 'bomb':
              this.handleBombCollision(ball, obj, onEvent, objects);
              break;

            case 'balloon':
              this.handleBalloonCollision(ball, obj, onEvent);
              break;

            case 'gear':
              this.handleGearCollision(ball, obj, subDt);
              break;

            case 'magnet':
              this.handleMagnetForce(ball, obj, subDt);
              break;

            case 'target':
              this.handleTargetCollision(ball, obj, onEvent);
              break;

            case 'box':
              this.handleBoxCollision(ball, obj, onEvent);
              break;
          }
        }

        // Single loss exit hole at bottom
        const holeDist = Math.hypot(ball.x - GAME_CONSTANTS.LOSS_HOLE_X, ball.y - GAME_CONSTANTS.LOSS_HOLE_Y);
        if (holeDist < GAME_CONSTANTS.LOSS_HOLE_RADIUS + ball.radius) {
          ball.active = false;
          soundManager.playBallLost();
          this.createSparks(ball.x, ball.y, '#f43f5e', 10);
          this.addFloatingText('PÉRDIDA 🕳️', ball.x, ball.y - 15, '#f43f5e');
          onEvent({ type: 'BALL_LOST', points: 0 });
        }

        // Lost below world bounds
        if (ball.y > GAME_CONSTANTS.WORLD_HEIGHT + 60) {
          ball.active = false;
          onEvent({ type: 'BALL_LOST', points: 0 });
        }
      }
    }

    // 3. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 4. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 35 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 0.8);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // --- Dynamic Obstacle Motion & Pivots ---
  private updateObstaclePositions(dt: number, objects: MachineObject[]) {
    const time = Date.now() * 0.001;

    for (const obj of objects) {
      if (obj.destroyed) continue;

      // Handle hit reaction timer decay
      if (obj.hitTimer && obj.hitTimer > 0) {
        obj.hitTimer -= dt;
      }

      const motion = obj.motionType || 'static';

      switch (motion) {
        case 'continuous_spin': {
          const spd = obj.angularSpeed || 0.6;
          obj.angle = (obj.angle || 0) + spd * dt;
          break;
        }

        case 'oscillate': {
          const base = obj.baseAngle || 0;
          const amp = (obj.maxAngle || 0.45) - base;
          const spd = obj.angularSpeed || 1.2;
          obj.angle = base + Math.sin(time * spd) * amp;
          break;
        }

        case 'hit_reactive': {
          const base = obj.baseAngle || 0;
          if (obj.hitTimer && obj.hitTimer > 0) {
            const decay = obj.hitTimer / 0.8;
            obj.angle = base + Math.sin(decay * Math.PI * 3) * 0.35 * decay;
          } else {
            obj.angle = base;
          }
          break;
        }

        case 'patrol_h': {
          const baseX = obj.baseX ?? obj.x;
          const range = obj.moveRange || 45;
          const spd = obj.moveSpeed || 1.1;
          obj.x = baseX + Math.sin(time * spd) * range;
          break;
        }

        case 'patrol_v': {
          const baseY = obj.baseY ?? obj.y;
          const range = obj.moveRange || 30;
          const spd = obj.moveSpeed || 1.0;
          obj.y = baseY + Math.sin(time * spd) * range;
          break;
        }

        case 'lever': {
          const target = obj.leverActivated
            ? obj.maxAngle || 0.6
            : obj.baseAngle || -0.2;
          const current = obj.angle || obj.baseAngle || 0;
          obj.angle = current + (target - current) * Math.min(1, dt * 6);
          break;
        }
      }

      // Update segment endpoints for moving bars and ramps with custom pivot points
      if (obj.type === 'moving_bar' || obj.type === 'lever') {
        const pType = obj.pivotType || 'center';
        const len = (obj as MovingBar | LeverObstacle).length || 80;
        const ang = obj.angle || 0;

        let pX = obj.x;
        let pY = obj.y;

        if (pType === 'left') {
          pX = obj.x;
          pY = obj.y;
          (obj as MovingBar).x2 = pX + Math.cos(ang) * len;
          (obj as MovingBar).y2 = pY + Math.sin(ang) * len;
        } else if (pType === 'right') {
          pX = obj.x;
          pY = obj.y;
          (obj as MovingBar).x2 = pX - Math.cos(ang) * len;
          (obj as MovingBar).y2 = pY - Math.sin(ang) * len;
        } else {
          // Center pivot
          const half = len / 2;
          obj.x = pX - Math.cos(ang) * half;
          obj.y = pY - Math.sin(ang) * half;
          (obj as MovingBar).x2 = pX + Math.cos(ang) * half;
          (obj as MovingBar).y2 = pY + Math.sin(ang) * half;
        }
      }
    }
  }

  // --- Segment to Ball Collision Helper with Descent-Oriented Physics ---
  private handleSegmentCollision(
    ball: Ball,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    speedBoost = 0
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;

    const t = Math.max(0, Math.min(1, ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distVecX = ball.x - closestX;
    const distVecY = ball.y - closestY;
    const dist = Math.hypot(distVecX, distVecY);
    const minDist = ball.radius + thickness / 2;

    if (dist < minDist && dist > 0) {
      const nx = distVecX / dist;
      const ny = distVecY / dist;

      // Push ball out cleanly
      ball.x = closestX + nx * minDist;
      ball.y = closestY + ny * minDist;

      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        // Controlled arcade restitution:
        // Dampen upward bounce so the ball does NOT get stuck bouncing upward
        const rest = GAME_CONSTANTS.RESTITUTION;
        ball.vx = (ball.vx - (1 + rest) * dot * nx) * GAME_CONSTANTS.FRICTION;
        ball.vy = (ball.vy - (1 + rest) * dot * ny) * GAME_CONSTANTS.FRICTION;

        // If bounce gives excessive upward speed, smoothly limit it to prioritize descent
        if (ball.vy < -380) {
          ball.vy = -380;
        }

        // Tangential slope acceleration along the ramp/bar
        const len = Math.sqrt(lenSq);
        const tx = dx / len;
        const ty = dy / len;
        const rampSign = ty >= 0 ? 1 : -1;
        ball.vx += tx * rampSign * (45 + speedBoost);
        ball.vy += ty * rampSign * (45 + speedBoost);

        soundManager.playWoodBounce(Math.min(1.0, Math.abs(dot) / 220));
        return true;
      }
    }
    return false;
  }

  // --- Ramp Segment Collision ---
  private handleRampCollision(ball: Ball, ramp: Ramp) {
    this.handleSegmentCollision(
      ball,
      ramp.x,
      ramp.y,
      ramp.x2,
      ramp.y2,
      ramp.thickness,
      ramp.speedBoost || 0
    );
  }

  // --- Moving Bar Collision ---
  private handleMovingBarCollision(ball: Ball, bar: MovingBar) {
    const x2 = bar.x2 ?? bar.x + (bar.length || 80);
    const y2 = bar.y2 ?? bar.y;
    const hit = this.handleSegmentCollision(ball, bar.x, bar.y, x2, y2, bar.thickness || 12);

    if (hit && bar.motionType === 'hit_reactive') {
      bar.hitTimer = 0.8;
      this.createSparks(ball.x, ball.y, '#f59e0b', 6);
    }
  }

  // --- Lever Collision ---
  private handleLeverCollision(ball: Ball, lever: LeverObstacle) {
    const x2 = lever.x2 ?? lever.x + (lever.length || 70);
    const y2 = lever.y2 ?? lever.y;
    const hit = this.handleSegmentCollision(ball, lever.x, lever.y, x2, y2, lever.thickness || 12);

    if (hit && !lever.leverActivated) {
      lever.leverActivated = true;
      lever.isTriggered = true;
      soundManager.playMetalBounce();
      this.addFloatingText('¡PALANCA ACTIVADA! ⚙️', lever.x, lever.y - 20, '#38bdf8');
      this.createSparks(lever.x, lever.y, '#38bdf8', 12);
    }
  }

  // --- Breakable Block Collision ---
  private handleBlockCollision(
    ball: Ball,
    block: BreakableBlock,
    onEvent: (ev: PhysicsEvent) => void,
    allObjects: MachineObject[]
  ) {
    const halfW = block.width / 2;
    const halfH = block.height / 2;

    const dx = ball.x - block.x;
    const dy = ball.y - block.y;

    const clampedX = Math.max(-halfW, Math.min(halfW, dx));
    const clampedY = Math.max(-halfH, Math.min(halfH, dy));

    const closestX = block.x + clampedX;
    const closestY = block.y + clampedY;

    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const dist = Math.hypot(distX, distY);

    if (dist < ball.radius) {
      let nx = dist > 0 ? distX / dist : 0;
      let ny = dist > 0 ? distY / dist : -1;

      ball.x = closestX + nx * ball.radius;
      ball.y = closestY + ny * ball.radius;

      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        // Balanced restitution through blocks: avoids getting stuck while breaking paths
        ball.vx = (ball.vx - (1 + GAME_CONSTANTS.RESTITUTION * 0.7) * dot * nx) * 0.90;
        ball.vy = (ball.vy - (1 + GAME_CONSTANTS.RESTITUTION * 0.7) * dot * ny) * 0.90;
        if (ball.vy < -320) ball.vy = -320;
      }

      if (ball.type === 'explosive' && !ball.hasExploded) {
        this.triggerExplosion(ball.x, ball.y, onEvent, allObjects);
        ball.hasExploded = true;
      }

      block.health--;
      soundManager.playBlockDestroy();
      this.createSparks(block.x, block.y, '#f59e0b', 8);

      if (block.health <= 0) {
        block.destroyed = true;
        this.createDebris(block.x, block.y, block.width, block.height);

        const pts = (block.blockColor && BLOCK_COLOR_POINTS[block.blockColor]) || block.points || GAME_CONSTANTS.POINTS_BLOCK;
        const colorStyle = (block.blockColor && BLOCK_COLOR_STYLES[block.blockColor]) || { light: '#fbbf24' };

        this.addFloatingText(`+${pts}`, block.x, block.y, colorStyle.light);
        onEvent({
          type: 'OBJECT_DESTROYED',
          points: pts,
          x: block.x,
          y: block.y,
        });
      }
    }
  }

  // --- Trampoline / Spring ---
  private handleTrampolineCollision(ball: Ball, tramp: Trampoline) {
    const halfW = tramp.width / 2;
    const halfH = tramp.height / 2;
    const dx = ball.x - tramp.x;
    const dy = ball.y - tramp.y;

    if (Math.abs(dx) < halfW + ball.radius && Math.abs(dy) < halfH + ball.radius) {
      if (ball.vy > 0) {
        const force = tramp.bounceForce || GAME_CONSTANTS.TRAMPOLINE_POWER;
        const angle = tramp.angle || 0;
        ball.vy = -force * Math.cos(angle);
        ball.vx += force * Math.sin(angle) * 0.6;
        ball.y = tramp.y - halfH - ball.radius - 2;

        tramp.animTimer = 0.25;
        soundManager.playTrampoline();
        this.createSparks(tramp.x, tramp.y, '#38bdf8', 10);
      }
    }
  }

  // --- Wind Fan Area Force ---
  private handleFanForce(ball: Ball, fan: Fan, dt: number) {
    const isHorizontal = Math.abs(fan.forceX) > Math.abs(fan.forceY);
    let inStream = false;

    if (isHorizontal) {
      const isRight = fan.forceX > 0;
      const minX = isRight ? fan.x : fan.x - fan.range;
      const maxX = isRight ? fan.x + fan.range : fan.x;
      const minY = fan.y - fan.height / 2 - 20;
      const maxY = fan.y + fan.height / 2 + 20;

      if (ball.x >= minX && ball.x <= maxX && ball.y >= minY && ball.y <= maxY) {
        inStream = true;
      }
    }

    if (inStream) {
      ball.vx += fan.forceX * dt;
      ball.vy += fan.forceY * dt;
      if (Math.random() < 0.2) {
        this.particles.push({
          x: fan.x + (Math.random() * 20 - 10),
          y: fan.y + (Math.random() * fan.height - fan.height / 2),
          vx: fan.forceX * 0.8 + (Math.random() * 40 - 20),
          vy: Math.random() * 20 - 10,
          radius: 2 + Math.random() * 2,
          color: '#e0f2fe',
          life: 0.4,
          maxLife: 0.4,
        });
      }
    }
  }

  // --- Oil Slick ---
  private handleOilCollision(ball: Ball, oil: OilSlick) {
    const halfW = oil.width / 2;
    const halfH = oil.height / 2;
    const dx = ball.x - oil.x;
    const dy = ball.y - oil.y;

    if (Math.abs(dx) < halfW + ball.radius && Math.abs(dy) < halfH + ball.radius) {
      if (!ball.boostedByOil) {
        const mult = oil.boostFactor || GAME_CONSTANTS.OIL_SPEED_MULTIPLIER;
        ball.vx *= mult;
        ball.vy *= mult;
        ball.boostedByOil = true;
        soundManager.playOilBoost();
        this.addFloatingText('¡ACEITE! ⚡', oil.x, oil.y - 15, '#38bdf8');
        this.createSparks(ball.x, ball.y, '#0284c7', 6);
      }
    }
  }

  // --- Bomb Hazard ---
  private handleBombCollision(
    ball: Ball,
    bomb: BombHazard,
    onEvent: (ev: PhysicsEvent) => void,
    allObjects: MachineObject[]
  ) {
    const dist = Math.hypot(ball.x - bomb.x, ball.y - bomb.y);
    if (dist < ball.radius + bomb.radius) {
      bomb.destroyed = true;
      soundManager.playBombExplosion();
      this.triggerExplosion(bomb.x, bomb.y, onEvent, allObjects);

      if (ball.type !== 'shield' && !ball.isImmune) {
        ball.active = false;
        onEvent({ type: 'BALL_LOST', points: 0, text: '¡BOMBA! 💥' });
      } else {
        this.addFloatingText('¡ESCUDO ACTIVADO! 🛡️', ball.x, ball.y - 20, '#60a5fa');
      }
    }
  }

  // --- Balloon ---
  private handleBalloonCollision(
    ball: Ball,
    balloon: Balloon,
    onEvent: (ev: PhysicsEvent) => void
  ) {
    const dist = Math.hypot(ball.x - balloon.x, ball.y - balloon.y);
    if (dist < ball.radius + balloon.radius) {
      const nx = (ball.x - balloon.x) / dist;
      const ny = (ball.y - balloon.y) / dist;

      ball.vx = nx * 340;
      ball.vy = ny * 340;
      if (ball.vy < -300) ball.vy = -300;

      balloon.destroyed = true;
      soundManager.playBalloonPop();
      this.createSparks(balloon.x, balloon.y, balloon.color, 12);
      this.addFloatingText(`+${GAME_CONSTANTS.POINTS_BALLOON}`, balloon.x, balloon.y, balloon.color);
      onEvent({
        type: 'OBJECT_DESTROYED',
        points: GAME_CONSTANTS.POINTS_BALLOON,
        x: balloon.x,
        y: balloon.y,
      });
    }
  }

  // --- Rotating Gear ---
  private handleGearCollision(ball: Ball, gear: Gear, dt: number) {
    gear.angle = (gear.angle || 0) + gear.speed * dt;
    const dist = Math.hypot(ball.x - gear.x, ball.y - gear.y);
    if (dist < ball.radius + gear.radius) {
      const nx = (ball.x - gear.x) / dist;
      const ny = (ball.y - gear.y) / dist;

      ball.x = gear.x + nx * (ball.radius + gear.radius);
      const tangentX = -ny * gear.speed * gear.radius * 0.7;
      const tangentY = nx * gear.speed * gear.radius * 0.7;

      ball.vx = ball.vx * 0.5 + tangentX;
      ball.vy = -Math.abs(ball.vy) * 0.5 + tangentY;

      soundManager.playMetalBounce();
      this.createSparks(ball.x, ball.y, '#f59e0b', 4);
    }
  }

  // --- Magnet Force ---
  private handleMagnetForce(ball: Ball, magnet: Magnet, dt: number) {
    const dx = magnet.x - ball.x;
    const dy = magnet.y - ball.y;
    const dist = Math.hypot(dx, dy);

    if (dist < magnet.radius * 2.5 && dist > 10) {
      const force = (magnet.strength / (dist * dist)) * 24000;
      ball.vx += (dx / dist) * force * dt;
      ball.vy += (dy / dist) * force * dt;
    }
  }

  // --- Target / Carnival Cans ---
  private handleTargetCollision(
    ball: Ball,
    target: TargetCan,
    onEvent: (ev: PhysicsEvent) => void
  ) {
    const dist = Math.hypot(ball.x - target.x, ball.y - target.y);
    if (dist < ball.radius + target.radius) {
      const nx = (ball.x - target.x) / dist;
      const ny = (ball.y - target.y) / dist;

      ball.vx = (ball.vx - 1.2 * (ball.vx * nx + ball.vy * ny) * nx) * 0.85;
      ball.vy = (ball.vy - 1.2 * (ball.vx * nx + ball.vy * ny) * ny) * 0.85;
      if (ball.vy < -300) ball.vy = -300;

      target.destroyed = true;
      soundManager.playTargetHit();
      this.createSparks(target.x, target.y, '#ef4444', 10);
      this.addFloatingText(`+${target.points}`, target.x, target.y - 15, '#ef4444');
      onEvent({
        type: 'TARGET_HIT',
        points: target.points,
        x: target.x,
        y: target.y,
      });
    }
  }

  // --- Bottom Prize Boxes ---
  private handleBoxCollision(
    ball: Ball,
    box: PrizeBox,
    onEvent: (ev: PhysicsEvent) => void
  ) {
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    const dx = ball.x - box.x;
    const dy = ball.y - box.y;

    if (Math.abs(dx) < halfW + ball.radius && Math.abs(dy) < halfH + ball.radius) {
      if (!box.opened) {
        box.opened = true;
        soundManager.playBoxOpen();
        this.createSparks(box.x, box.y, '#f59e0b', 16);

        let rewardText = `+${box.points} PTS`;
        if (box.reward === 'ball_1') rewardText = '+1 BOLA 🟡';
        else if (box.reward === 'ball_2') rewardText = '+2 BOLAS 🟡🟡';
        else if (box.reward === 'ball_3') rewardText = '+3 BOLAS 🟡🟡🟡';
        else if (box.reward === 'power_double') rewardText = 'BOLA DOBLE ✨';
        else if (box.reward === 'power_triple') rewardText = 'BOLA TRIPLE 💥';
        else if (box.reward === 'power_fast') rewardText = 'BOLA RÁPIDA ⚡';
        else if (box.reward === 'power_explosive') rewardText = 'BOLA BOMBA 💣';
        else if (box.reward === 'power_shield') rewardText = 'BOLA INVENCIBLE 🛡️';
        else if (box.reward === 'points_500') rewardText = '+500 PTS ⭐';

        this.addFloatingText(rewardText, box.x, box.y - 30, '#facc15');

        onEvent({
          type: 'BOX_OPENED',
          points: box.points || GAME_CONSTANTS.POINTS_BOX,
          boxReward: box.reward,
          x: box.x,
          y: box.y,
          text: rewardText,
        });
      }

      ball.active = false;
      onEvent({ type: 'BALL_LOST', points: 0 });
    }
  }

  // --- Explosion Helper ---
  public triggerExplosion(
    x: number,
    y: number,
    onEvent: (ev: PhysicsEvent) => void,
    allObjects: MachineObject[]
  ) {
    const radius = GAME_CONSTANTS.EXPLOSION_RADIUS;
    soundManager.playBombExplosion();
    this.createExplosionParticles(x, y);
    this.addFloatingText('¡BOOM! 💥', x, y - 20, '#ef4444');

    for (const obj of allObjects) {
      if (obj.destroyed) continue;
      const dist = Math.hypot(obj.x - x, obj.y - y);
      if (dist < radius) {
        if (obj.type === 'breakable_block') {
          obj.destroyed = true;
          this.createDebris(obj.x, obj.y, obj.width, obj.height);
          onEvent({
            type: 'OBJECT_DESTROYED',
            points: GAME_CONSTANTS.POINTS_BLOCK,
            x: obj.x,
            y: obj.y,
          });
        } else if (obj.type === 'balloon') {
          obj.destroyed = true;
          onEvent({
            type: 'OBJECT_DESTROYED',
            points: GAME_CONSTANTS.POINTS_BALLOON,
            x: obj.x,
            y: obj.y,
          });
        } else if (obj.type === 'target') {
          obj.destroyed = true;
          onEvent({
            type: 'TARGET_HIT',
            points: obj.points,
            x: obj.x,
            y: obj.y,
          });
        }
      }
    }
  }

  // --- Particle Effects ---
  public createSparks(x: number, y: number, color: string, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2.5,
        color,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        shape: 'spark',
      });
    }
  }

  public createDebris(x: number, y: number, w: number, h: number) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() * w - w / 2),
        y: y + (Math.random() * h - h / 2),
        vx: (Math.random() - 0.5) * 200,
        vy: -60 - Math.random() * 150,
        radius: 3 + Math.random() * 4,
        color: '#b45309',
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        shape: 'wood_chip',
      });
    }
  }

  public createExplosionParticles(x: number, y: number) {
    const colors = ['#f87171', '#fb923c', '#facc15', '#ffffff'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 280;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        shape: 'smoke',
      });
    }
  }

  public applyEmergencyTapImpulse(tapX: number, tapY: number, balls: Ball[]): boolean {
    let applied = false;
    for (const ball of balls) {
      if (!ball.active) continue;
      const dx = ball.x - tapX;
      const dy = ball.y - tapY;
      const dist = Math.hypot(dx, dy);

      if (dist < GAME_CONSTANTS.TAP_IMPULSE_RADIUS) {
        const nx = dist > 0 ? dx / dist : (Math.random() - 0.5);
        const ny = dist > 0 ? dy / dist : -1;

        ball.vx += nx * GAME_CONSTANTS.TAP_IMPULSE_FORCE;
        ball.vy += ny * GAME_CONSTANTS.TAP_IMPULSE_FORCE - 60;
        soundManager.playWoodBounce(0.8);
        this.createSparks(tapX, tapY, '#38bdf8', 12);
        this.addFloatingText('👆 EMPUJÓN MANUAL', tapX, tapY - 20, '#38bdf8');
        applied = true;
      }
    }
    return applied;
  }

  private handlePipeCollision(ball: Ball, pipe: PipeChute) {
    this.handleSegmentCollision(
      ball,
      pipe.x,
      pipe.y,
      pipe.x2,
      pipe.y2,
      pipe.radius * 2 || 24,
      pipe.boostSpeed || 60
    );
  }

  public addFloatingText(text: string, x: number, y: number, color = '#fbbf24') {
    this.floatingTexts.push({
      id: `ft_${this.textIdCounter++}`,
      text,
      x,
      y,
      color,
      alpha: 1.0,
      life: 0.8,
      scale: 1.0,
    });
  }
}
