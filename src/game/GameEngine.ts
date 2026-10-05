import {
  Ball,
  BallType,
  GameSnapshot,
  GameStatePhase,
  LevelConfig,
  MachineObject,
  PowerUpInventory,
} from '../types/game';
import { GAME_CONSTANTS, BLOCK_COLOR_POINTS, BLOCK_COLOR_STYLES } from './constants';
import { Camera } from './Camera';
import { PhysicsEngine, PhysicsEvent } from './PhysicsEngine';
import { LevelManager } from './LevelManager';
import { soundManager } from '../audio/soundManager';
import { spriteManager } from './SpriteManager';
import { storage } from '../utils/storage';
import { leaderboardService } from '../utils/leaderboardService';
import confetti from 'canvas-confetti';

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Components
  public camera: Camera = new Camera();
  public physics: PhysicsEngine = new PhysicsEngine();

  // Dynamic Viewport Dimensions
  public viewportWidth: number = GAME_CONSTANTS.VIEWPORT_WIDTH;
  public viewportHeight: number = GAME_CONSTANTS.VIEWPORT_HEIGHT_GAMEPLAY;

  // State
  private phase: GameStatePhase = 'MENU';
  private levelConfig: LevelConfig = LevelManager.getLevel(1);
  private balls: Ball[] = [];
  private objects: MachineObject[] = [];
  private ballsLeft: number = 5;
  private totalBallsUsed: number = 0;
  private score: number = 0;
  private combo: number = 0;
  private objectsDestroyedCount: number = 0;
  private selectedChannelIndex: number = 2; // Middle channel
  public aimX: number = 225; // Smooth horizontal aim position
  public aimY: number = 110; // Launcher ball position (clearly below HUD)
  private observationTimer: number = 0; // 3-second result observation timer
  private tapCooldownTimer: number = 0; // Cooldown for manual emergency tap push
  private tapVisualEffect: { x: number; y: number; life: number } | null = null;
  private activePowerUp: BallType | null = null;
  private playerName: string = storage.getPlayerName() || '';
  private inventory: PowerUpInventory = {
    double: 0,
    triple: 0,
    fast: 0,
    explosive: 0,
    shield: 0,
  };

  // State callback to React
  private onStateChange: ((snapshot: GameSnapshot) => void) | null = null;

  // Pointer & Double Tap Detection
  private lastTapTime: number = 0;
  private isPointerDown: boolean = false;
  private pointerStartX: number = 0;

  constructor(onStateChange?: (snapshot: GameSnapshot) => void) {
    if (onStateChange) this.onStateChange = onStateChange;
  }

  public setPlayerName(name: string) {
    this.playerName = name;
    storage.setPlayerName(name);
    this.emitState();
  }

  public setViewportDimensions(w: number, h: number) {
    this.viewportWidth = w;
    this.viewportHeight = h;
    this.camera.setViewportHeight(h);
  }

  public attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupPointerListeners();
    this.startLoop();
  }

  public setOnStateChange(cb: (snapshot: GameSnapshot) => void) {
    this.onStateChange = cb;
    this.emitState();
  }

  public emitState() {
    if (!this.onStateChange) return;
    this.onStateChange({
      phase: this.phase,
      levelNumber: this.levelConfig.levelNumber,
      score: this.score,
      ballsLeft: this.ballsLeft,
      goalProgress: this.levelConfig.goal.current,
      goalTarget: this.levelConfig.goal.target,
      goalDescription: this.levelConfig.goal.description,
      combo: this.combo,
      selectedChannelIndex: this.selectedChannelIndex,
      activePowerUp: this.activePowerUp,
      inventory: { ...this.inventory },
      objectsDestroyedCount: this.objectsDestroyedCount,
      totalBallsUsed: this.totalBallsUsed,
      isSoundMuted: soundManager.getIsMuted(),
      playerName: this.playerName,
    });
  }

  // --- Game Lifecycle ---
  public startNewGame(levelNum = 1, playerName?: string) {
    if (playerName) {
      this.playerName = playerName;
      storage.setPlayerName(playerName);
    }
    this.levelConfig = LevelManager.getLevel(levelNum);
    this.objects = JSON.parse(JSON.stringify(this.levelConfig.objects));
    this.balls = [];
    this.ballsLeft = this.levelConfig.startingBalls;
    this.totalBallsUsed = 0;
    this.score = 0;
    this.combo = 0;
    this.objectsDestroyedCount = 0;
    this.selectedChannelIndex = 2;
    this.activePowerUp = null;
    this.inventory = { double: 0, triple: 0, fast: 0, explosive: 0, shield: 0 };
    this.camera.reset();
    this.phase = 'AIMING';
    this.emitState();
    leaderboardService.recordGameStart();
  }

  public nextLevel() {
    const nextLvl = this.levelConfig.levelNumber + 1;
    this.levelConfig = LevelManager.getLevel(nextLvl);
    this.objects = JSON.parse(JSON.stringify(this.levelConfig.objects));
    this.balls = [];
    this.ballsLeft += this.levelConfig.startingBalls;
    this.camera.reset();
    this.phase = 'AIMING';
    this.emitState();
  }

  public restartCurrentLevel() {
    this.startNewGame(this.levelConfig.levelNumber);
  }

  public pauseGame() {
    if (this.phase !== 'PAUSED') {
      this.phase = 'PAUSED';
      this.emitState();
    }
  }

  public resumeGame() {
    if (this.phase === 'PAUSED') {
      this.phase = this.balls.some((b) => b.active) ? 'DROPPING' : 'AIMING';
      this.emitState();
    }
  }

  public returnToMenu() {
    this.phase = 'MENU';
    this.balls = [];
    this.camera.reset();
    this.emitState();
  }

  // --- Power-up Activation ---
  public selectPowerUp(type: BallType) {
    if (this.phase !== 'AIMING') return;
    const invKey = type === 'standard' ? null : (type as keyof PowerUpInventory);
    if (!invKey || this.inventory[invKey] > 0) {
      this.activePowerUp = this.activePowerUp === type ? null : type;
      this.emitState();
    }
  }

  // --- Channel Selection & Ball Release ---
  public selectChannel(index: number) {
    if (this.phase !== 'AIMING') return;
    if (index >= 0 && index < this.levelConfig.channels.length) {
      this.selectedChannelIndex = index;
      const targetCh = this.levelConfig.channels[index];
      if (targetCh) {
        this.aimX = targetCh.x;
      }
      soundManager.playSelectChannel();
      this.emitState();
    }
  }

  public dropBall() {
    if (this.phase !== 'AIMING' || this.ballsLeft <= 0) return;

    const channel = this.levelConfig.channels[this.selectedChannelIndex];
    const spawnX = this.aimX || (channel ? channel.x : GAME_CONSTANTS.WORLD_WIDTH / 2);
    const spawnY = this.aimY + 10;

    this.ballsLeft--;
    this.totalBallsUsed++;
    soundManager.playRelease();

    const ballType = this.activePowerUp || 'standard';
    if (this.activePowerUp) {
      const key = this.activePowerUp as keyof PowerUpInventory;
      if (this.inventory[key] > 0) {
        this.inventory[key]--;
      }
      this.activePowerUp = null;
    }

    // Spawn balls physically according to type
    if (ballType === 'double') {
      const b1 = this.spawnBall(spawnX - 14, spawnY, 'double', '#facc15');
      b1.vx = -40 + (Math.random() - 0.5) * 20;
      b1.vy = 120 + Math.random() * 30;

      const b2 = this.spawnBall(spawnX + 14, spawnY, 'double', '#facc15');
      b2.vx = 40 + (Math.random() - 0.5) * 20;
      b2.vy = 120 + Math.random() * 30;
    } else if (ballType === 'triple') {
      const b1 = this.spawnBall(spawnX - 18, spawnY, 'triple', '#38bdf8');
      b1.vx = -60 + (Math.random() - 0.5) * 20;
      b1.vy = 120 + Math.random() * 30;

      const b2 = this.spawnBall(spawnX, spawnY - 8, 'triple', '#38bdf8');
      b2.vx = (Math.random() - 0.5) * 20;
      b2.vy = 145 + Math.random() * 30;

      const b3 = this.spawnBall(spawnX + 18, spawnY, 'triple', '#38bdf8');
      b3.vx = 60 + (Math.random() - 0.5) * 20;
      b3.vy = 120 + Math.random() * 30;
    } else if (ballType === 'fast') {
      const b = this.spawnBall(spawnX, spawnY, 'fast', '#f97316');
      b.vy = 420; // High initial velocity
    } else if (ballType === 'explosive') {
      this.spawnBall(spawnX, spawnY, 'explosive', '#ef4444');
    } else if (ballType === 'shield') {
      this.spawnBall(spawnX, spawnY, 'shield', '#a855f7');
    } else {
      this.spawnBall(spawnX, spawnY, 'standard', '#e2e8f0');
    }

    this.phase = 'DROPPING';
    this.emitState();
  }

  private spawnBall(x: number, y: number, type: BallType, color: string): Ball {
    const ball: Ball = {
      id: `ball_${Date.now()}_${Math.random()}`,
      x,
      y,
      vx: (Math.random() - 0.5) * 40,
      vy: 100 + Math.random() * 40,
      radius: GAME_CONSTANTS.DEFAULT_BALL_RADIUS,
      type,
      color,
      active: true,
      trail: [],
      isImmune: type === 'shield',
    };
    this.balls.push(ball);
    return ball;
  }

  // --- Input Handlers (Pointer & Double Tap & Emergency Rescue) ---
  private setupPointerListeners() {
    if (!this.canvas) return;

    const handlePointerDown = (e: PointerEvent) => {
      this.isPointerDown = true;
      this.pointerStartX = e.clientX;

      if (this.phase === 'DROPPING') {
        this.triggerEmergencyTap(e);
      } else if (this.phase === 'AIMING') {
        this.handlePointerMove(e);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      this.isPointerDown = false;
      const now = Date.now();
      const delta = now - this.lastTapTime;

      if (this.phase === 'AIMING' && delta < 350 && Math.abs(e.clientX - this.pointerStartX) < 30) {
        // Double tap / double click triggered to drop ball!
        this.dropBall();
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    };

    this.canvas.addEventListener('pointerdown', handlePointerDown);
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('dblclick', () => {
      if (this.phase === 'AIMING') this.dropBall();
    });
  }

  private triggerEmergencyTap(e: PointerEvent) {
    if (!this.canvas || this.tapCooldownTimer > 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = this.viewportWidth / rect.width;
    const scaleY = this.viewportHeight / rect.height;

    const worldX = clientX * scaleX;
    const worldY = clientY * scaleY + this.camera.y;

    const applied = this.physics.applyEmergencyTapImpulse(worldX, worldY, this.balls);
    if (applied) {
      this.tapCooldownTimer = GAME_CONSTANTS.TAP_COOLDOWN_SECONDS;
      this.tapVisualEffect = { x: worldX, y: worldY, life: 0.3 };
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (this.phase !== 'AIMING' || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const canvasScaleX = GAME_CONSTANTS.WORLD_WIDTH / rect.width;
    const worldX = clientX * canvasScaleX;

    // Smoothly update horizontal aim position
    this.aimX = Math.max(40, Math.min(GAME_CONSTANTS.WORLD_WIDTH - 40, worldX));

    // Find nearest channel
    let closestIdx = 0;
    let minD = Infinity;
    this.levelConfig.channels.forEach((ch, idx) => {
      const d = Math.abs(ch.x - this.aimX);
      if (d < minD) {
        minD = d;
        closestIdx = idx;
      }
    });

    if (closestIdx !== this.selectedChannelIndex) {
      this.selectedChannelIndex = closestIdx;
      soundManager.playSelectChannel();
      this.emitState();
    }
  }

  // --- Main Animation Loop ---
  private startLoop() {
    const loop = (timestamp: number) => {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  // --- Frame Update ---
  private update(dt: number) {
    if (this.phase === 'PAUSED' || this.phase === 'MENU') return;

    if (this.tapCooldownTimer > 0) {
      this.tapCooldownTimer -= dt;
    }
    if (this.tapVisualEffect) {
      this.tapVisualEffect.life -= dt;
      if (this.tapVisualEffect.life <= 0) {
        this.tapVisualEffect = null;
      }
    }

    if (this.phase === 'DROPPING') {
      // Physics step
      this.physics.update(dt, this.balls, this.objects, (ev) => this.handlePhysicsEvent(ev));

      // Camera smoothly follows dropping balls
      this.camera.followBalls(this.balls);

      // Check if all balls finished drop
      const activeBalls = this.balls.filter((b) => b.active);
      if (activeBalls.length === 0) {
        this.phase = 'OBSERVING_RESULT';
        this.observationTimer = GAME_CONSTANTS.OBSERVATION_DELAY_SECONDS; // 3 seconds observation delay
        this.emitState();
      }
    } else if (this.phase === 'OBSERVING_RESULT') {
      // Step particles and floating text animations so score popups finish smoothly
      this.physics.update(dt, [], this.objects, (ev) => this.handlePhysicsEvent(ev));

      this.observationTimer -= dt;
      if (this.observationTimer <= 0) {
        if (this.levelConfig.goal.current >= this.levelConfig.goal.target) {
          this.triggerVictory();
        } else {
          this.phase = 'CAMERA_RETURN';
          this.camera.returnToTop();
          this.emitState();
        }
      }
    } else if (this.phase === 'CAMERA_RETURN') {
      this.camera.update(dt);

      if (this.camera.isAtTop()) {
        this.camera.reset();
        this.resolveDropEnd();
      }
    }

    this.camera.update(dt);
  }

  private handlePhysicsEvent(ev: PhysicsEvent) {
    if (ev.points > 0) {
      this.score += ev.points;
    }

    if (ev.type === 'OBJECT_DESTROYED' || ev.type === 'TARGET_HIT') {
      this.objectsDestroyedCount++;
    }

    if (ev.type === 'BOX_OPENED') {
      this.objectsDestroyedCount++;
      this.levelConfig.goal.current++;

      soundManager.playPowerUpCollect();
      if (ev.boxReward === 'ball_1') this.ballsLeft += 1;
      else if (ev.boxReward === 'ball_2') this.ballsLeft += 2;
      else if (ev.boxReward === 'ball_3') this.ballsLeft += 3;
      else if (ev.boxReward === 'power_double') this.inventory.double++;
      else if (ev.boxReward === 'power_triple') this.inventory.triple++;
      else if (ev.boxReward === 'power_fast') this.inventory.fast++;
      else if (ev.boxReward === 'power_explosive') this.inventory.explosive++;
      else if (ev.boxReward === 'power_shield') this.inventory.shield++;
      else if (ev.boxReward === 'points_500') this.score += 500;

      // Check level goal completion (7/7 boxes destroyed)
      if (this.levelConfig.goal.current >= this.levelConfig.goal.target) {
        if (this.phase !== 'LEVEL_COMPLETE') {
          this.triggerVictory();
        }
      }
    }

    this.emitState();
  }

  private resolveDropEnd() {
    this.balls = [];
    if (this.phase === 'LEVEL_COMPLETE') return;

    if (this.ballsLeft > 0) {
      this.phase = 'AIMING';
    } else {
      this.phase = 'GAME_OVER';
      soundManager.playGameOver();
      storage.setHighScore(this.score);
      storage.saveRecentScore(this.score);
      leaderboardService.recordGameEnd();
    }
    this.emitState();
  }

  private triggerVictory() {
    this.phase = 'LEVEL_COMPLETE';
    soundManager.playVictory();
    storage.setHighScore(this.score);
    storage.saveRecentScore(this.score);
    leaderboardService.recordGameEnd();

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    this.emitState();
  }

  // --- Rendering ---
  private render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply scaling to fit logical resolution (450x720 in gameplay, 450x800 in menu)
    const scaleX = this.canvas.width / w;
    const scaleY = this.canvas.height / h;
    ctx.scale(scaleX, scaleY);

    // Apply Camera Translation
    ctx.save();
    ctx.translate(0, -this.camera.y);

    // Single Official fondo.png or fondomenu.png background sprite covering the machine world height
    const isMenu = this.phase === 'MENU';
    spriteManager.drawBackground(ctx, GAME_CONSTANTS.WORLD_WIDTH, GAME_CONSTANTS.WORLD_HEIGHT, isMenu);

    // Render Background Details & Machinery
    this.renderMachineStructure(ctx);

    // Render Machine Objects (ramps, blocks, trampolines, oil, etc.)
    for (const obj of this.objects) {
      if (obj.destroyed) continue;
      this.renderMachineObject(ctx, obj);
    }

    // Render Single Bottom Loss Exit Hole
    this.renderLossHole(ctx);

    // Render Emergency Tap Visual Ripple
    if (this.tapVisualEffect) {
      ctx.save();
      const alpha = Math.max(0, this.tapVisualEffect.life / 0.3);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.2})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.tapVisualEffect.x, this.tapVisualEffect.y, GAME_CONSTANTS.TAP_IMPULSE_RADIUS * (1.2 - alpha * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Render Balls and Trails
    for (const ball of this.balls) {
      if (!ball.active) continue;
      this.renderBall(ctx, ball);
    }

    // Render Particles & Sparks
    this.renderParticles(ctx);

    // Render Floating Score Texts
    this.renderFloatingTexts(ctx);

    ctx.restore();

    // Render Top Launcher HUD & Aiming Guide (Fixed on screen top)
    if (this.camera.isAtTop()) {
      this.renderTopLauncher(ctx);
    }

    // Render 3-second result observation banner overlay
    if (this.phase === 'OBSERVING_RESULT') {
      ctx.save();
      const secondsLeft = Math.max(1, Math.ceil(this.observationTimer));
      ctx.fillStyle = 'rgba(15, 8, 3, 0.88)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      const bW = 240;
      ctx.beginPath();
      ctx.roundRect(w / 2 - bW / 2, h - 50, bW, 28, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`👀 ANALIZANDO RESULTADO (${secondsLeft}s)...`, w / 2, h - 36);
      ctx.restore();
    }

    // Hidden development diagnostics overlay
    this.renderDiagnostics(ctx, w, h);
  }

  private renderDiagnostics(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (typeof window === 'undefined' || !window.location.search.includes('diagnostic=1')) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Draw semi-transparent dark background for the diag view
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DIAGNÓSTICO DE SPRITES (DESARROLLO)', 20, 20);

    let startY = 55;

    // 1. Flechas.png (3x2)
    const flechasImg = spriteManager.getImage('flechas');
    if (flechasImg) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('FLECHAS (Col 0..2, Row 0..1):', 20, startY);
      startY += 20;
      
      const drawSize = 36;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const dx = 20 + c * (drawSize + 15);
          const dy = startY + r * (drawSize + 20);
          spriteManager.drawSpriteProportional(ctx, 'flechas', c, r, 3, 2, dx + drawSize/2, dy + drawSize/2, drawSize, drawSize, 0);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px sans-serif';
          ctx.fillText(`c${c}r${r}`, dx, dy + drawSize + 2);
        }
      }
      startY += 2 * (drawSize + 20) + 20;
    }

    // 2. Trampolin.png (3x1)
    const trampolinImg = spriteManager.getImage('trampolin');
    if (trampolinImg) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('TRAMPOLINES (Col 0..2, Row 0):', 20, startY);
      startY += 20;

      const drawSize = 40;
      for (let c = 0; c < 3; c++) {
        const dx = 20 + c * (drawSize + 20);
        const dy = startY;
        spriteManager.drawSpriteProportional(ctx, 'trampolin', c, 0, 3, 1, dx + drawSize/2, dy + drawSize/2, drawSize, drawSize, 0);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText(`c${c}`, dx, dy + drawSize + 2);
      }
      startY += drawSize + 30;
    }

    // 3. Aspa_engranaje.png (3x1)
    const aspaImg = spriteManager.getImage('aspa_engranaje');
    if (aspaImg) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ASPA / ENGRANAJE (Col 0..2):', 20, startY);
      startY += 20;

      const drawSize = 40;
      for (let c = 0; c < 3; c++) {
        const dx = 20 + c * (drawSize + 20);
        const dy = startY;
        spriteManager.drawSpriteProportional(ctx, 'aspa_engranaje', c, 0, 3, 1, dx + drawSize/2, dy + drawSize/2, drawSize, drawSize, 0);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText(`c${c}`, dx, dy + drawSize + 2);
      }
    }

    ctx.restore();
  }

  private renderLossHole(ctx: CanvasRenderingContext2D) {
    const lx = GAME_CONSTANTS.LOSS_HOLE_X;
    const ly = GAME_CONSTANTS.LOSS_HOLE_Y;
    const r = GAME_CONSTANTS.LOSS_HOLE_RADIUS;

    ctx.save();

    // Solid wooden bottom floor across the machine width except for central loss hole
    ctx.fillStyle = '#291508';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;

    // Left floor plank
    ctx.fillRect(0, ly - 10, lx - r, 30);
    ctx.strokeRect(0, ly - 10, lx - r, 30);

    // Right floor plank
    ctx.fillRect(lx + r, ly - 10, GAME_CONSTANTS.WORLD_WIDTH - (lx + r), 30);
    ctx.strokeRect(lx + r, ly - 10, GAME_CONSTANTS.WORLD_WIDTH - (lx + r), 30);

    // Precise Central Exit Hole
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;

    const holeGrad = ctx.createRadialGradient(lx, ly, 2, lx, ly, r);
    holeGrad.addColorStop(0, '#000000');
    holeGrad.addColorStop(0.7, '#1e1111');
    holeGrad.addColorStop(1, '#7f1d1d');

    ctx.fillStyle = holeGrad;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(lx, ly, r - 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SALIDA', lx, ly);
    ctx.restore();
  }

  private renderCarnivalBackboard(ctx: CanvasRenderingContext2D) {
    // Official fondo.png or fondomenu.png background sprite
    const isMenu = this.phase === 'MENU';
    spriteManager.drawBackground(ctx, GAME_CONSTANTS.WORLD_WIDTH, this.viewportHeight, isMenu);

    // Machine Side Metal Rails
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 14, this.viewportHeight);
    ctx.fillRect(GAME_CONSTANTS.WORLD_WIDTH - 14, 0, 14, this.viewportHeight);

    // Metal rivet stripes
    ctx.fillStyle = '#94a3b8';
    for (let y = 10; y < this.viewportHeight; y += 30) {
      ctx.beginPath();
      ctx.arc(7, y, 3, 0, Math.PI * 2);
      ctx.arc(GAME_CONSTANTS.WORLD_WIDTH - 7, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderMachineStructure(_ctx: CanvasRenderingContext2D) {
    // The official fondo.png already contains the machine's wood structure.
    // Do not draw procedural X/cross braces over it: they obscure the play field
    // and visually compete with the real sprites.
  }

  private renderTopLauncher(ctx: CanvasRenderingContext2D) {
    const channels = this.levelConfig.channels;
    const selected = channels[this.selectedChannelIndex];
    const aimX = this.aimX || (selected ? selected.x : GAME_CONSTANTS.WORLD_WIDTH / 2);
    const aimY = this.aimY; // 110

    // 1. Draw Top Launcher Mechanical Rail Track (at y = 92..128)
    ctx.save();
    ctx.fillStyle = '#1e1107';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(25, 92, GAME_CONSTANTS.WORLD_WIDTH - 50, 36, 10);
    ctx.fill();
    ctx.stroke();

    // Brass slider slot
    ctx.fillStyle = '#0f0803';
    ctx.fillRect(35, 107, GAME_CONSTANTS.WORLD_WIDTH - 70, 7);
    ctx.restore();

    // 2. Draw 5 Colored Channel Entry Chutes (at y = 150)
    channels.forEach((ch, idx) => {
      const isSelected = idx === this.selectedChannelIndex;
      const x = ch.x;
      const y = ch.y; // 150
      const w = ch.width;
      const h = 50;

      // Outer chute frame
      ctx.fillStyle = isSelected ? ch.color : '#3d1d07';
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#78350f';
      ctx.lineWidth = isSelected ? 3.5 : 2;

      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - 25, w, h, [8, 8, 3, 3]);
      ctx.fill();
      ctx.stroke();

      // Top funnel indicators
      ctx.fillStyle = isSelected ? '#ffffff' : '#d97706';
      ctx.beginPath();
      ctx.moveTo(x, y + 12);
      ctx.lineTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.closePath();
      ctx.fill();
    });

    // 3. Draw Aiming Guide Line and Arrow when in AIMING phase
    if (this.phase === 'AIMING' && selected) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(aimX, aimY + 16);
      ctx.lineTo(selected.x, selected.y - 5);
      ctx.stroke();
      ctx.restore();

      // 4. Draw Active Metallic Pinball at aim position using official bolas.png [0,0]
      const drawn = spriteManager.drawBall(ctx, aimX, aimY, 13);
      if (!drawn) {
        this.renderMetallicSphere(ctx, aimX, aimY, 13, 'standard', true);
      }
      if (this.activePowerUp) {
        // Draw overlay for active power-up at aim position
        if (this.activePowerUp === 'fast') {
          ctx.save();
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(aimX, aimY, 15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (this.activePowerUp === 'shield') {
          ctx.save();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(aimX, aimY, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (this.activePowerUp === 'explosive') {
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(aimX, aimY, 15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5. Instruction banner above ball in the clear space
      ctx.save();
      ctx.fillStyle = 'rgba(15, 8, 3, 0.9)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      const badgeW = 220;
      ctx.beginPath();
      ctx.roundRect(GAME_CONSTANTS.WORLD_WIDTH / 2 - badgeW / 2, 60, badgeW, 22, 11);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⟵ ARRASTRA Y DOBLE TAP ⟶', GAME_CONSTANTS.WORLD_WIDTH / 2, 71);
      ctx.restore();
    }
  }

  // Authentic 3D polished chrome metallic pinball renderer
  private renderMetallicSphere(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    powerUpType: BallType | null = null,
    isAiming: boolean = false
  ) {
    ctx.save();

    // 1. Soft bottom drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.7, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Power-up aura ring (if active)
    if (powerUpType && powerUpType !== 'standard') {
      let auraColor = '#facc15';
      if (powerUpType === 'double') auraColor = '#facc15';
      else if (powerUpType === 'triple') auraColor = '#38bdf8';
      else if (powerUpType === 'fast') auraColor = '#f97316';
      else if (powerUpType === 'explosive') auraColor = '#ef4444';
      else if (powerUpType === 'shield') auraColor = '#a855f7';

      ctx.save();
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = isAiming ? 14 : 8;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. High-shine polished chrome metallic sphere
    const shineX = x - radius * 0.35;
    const shineY = y - radius * 0.35;
    const grad = ctx.createRadialGradient(
      shineX,
      shineY,
      radius * 0.08,
      x,
      y,
      radius
    );
    grad.addColorStop(0, '#ffffff'); // Pure intense white specular highlight
    grad.addColorStop(0.2, '#f1f5f9'); // Glossy silver
    grad.addColorStop(0.5, '#94a3b8'); // Chrome body
    grad.addColorStop(0.8, '#475569'); // Deep steel shadow
    grad.addColorStop(1, '#0f172a'); // Outer rim contrast

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Secondary ambient reflection at bottom edge
    const ambGrad = ctx.createRadialGradient(
      x + radius * 0.3,
      y + radius * 0.4,
      1,
      x + radius * 0.3,
      y + radius * 0.4,
      radius * 0.6
    );
    ambGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    ambGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = ambGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 5. Crisp outer rim outline for extreme contrast
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private renderMachineObject(ctx: CanvasRenderingContext2D, obj: MachineObject) {
    ctx.save();

    switch (obj.type) {
      case 'ramp': {
        const drawn = spriteManager.drawPlank(ctx, obj.x, obj.y, obj.x2, obj.y2, obj.thickness);
        if (!drawn) {
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = obj.thickness;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(obj.x2, obj.y2);
          ctx.stroke();

          // Metallic top rail fallback
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y - obj.thickness / 2);
          ctx.lineTo(obj.x2, obj.y2 - obj.thickness / 2);
          ctx.stroke();
        }
        break;
      }

      case 'bumper': {
        const rad = (obj as any).radius || 18;
        const drawn = spriteManager.drawGearOrPropeller(ctx, 'bumper', obj.angle || 0, obj.x, obj.y, rad);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);

          // Bumper outer glow when hit
          if (obj.hitTimer && obj.hitTimer > 0) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 18;
          }

          // Bumper base body
          const bGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, rad);
          bGrad.addColorStop(0, '#fef08a');
          bGrad.addColorStop(0.4, '#eab308');
          bGrad.addColorStop(1, '#854d0e');

          ctx.fillStyle = bGrad;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner cap ring
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(0, 0, rad * 0.45, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
        break;
      }

      case 'windmill': {
        const len = (obj as any).armLength || 40;
        const drawn = spriteManager.drawGearOrPropeller(ctx, 'windmill', obj.angle || 0, obj.x, obj.y, len);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.rotate(obj.angle || 0);

          const arms = (obj as any).arms || 4;
          const armStep = (Math.PI * 2) / arms;

          // Propeller blades
          for (let i = 0; i < arms; i++) {
            ctx.rotate(armStep);
            ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#1e3a8a';
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-4, 0, 8, len, 4);
            ctx.fill();
            ctx.stroke();
          }

          // Center hub
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.restore();
        }
        break;
      }

      case 'arrow': {
        const w = (obj as any).width || 36;
        const h = (obj as any).height || 36;
        const forceX = (obj as any).forceX;
        const forceY = (obj as any).forceY;
        const drawn = spriteManager.drawArrow(ctx, (obj as any).angle || 0, obj.x, obj.y, w, h, forceX, forceY);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.rotate((obj as any).angle || 0);

          // Arrow pad box
          ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 6);
          ctx.fill();
          ctx.stroke();

          // Chevron arrow indicator
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(0, -h * 0.35);
          ctx.lineTo(w * 0.3, h * 0.2);
          ctx.lineTo(w * 0.12, h * 0.2);
          ctx.lineTo(w * 0.12, h * 0.35);
          ctx.lineTo(-w * 0.12, h * 0.35);
          ctx.lineTo(-w * 0.12, h * 0.2);
          ctx.lineTo(-w * 0.3, h * 0.2);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
        break;
      }

      case 'pipe': {
        const x2 = (obj as any).x2 ?? obj.x + 80;
        const y2 = (obj as any).y2 ?? obj.y + 60;
        const rad = (obj as any).radius || 12;

        const drawn = spriteManager.drawPipe(ctx, obj.x, obj.y, x2, y2, rad);
        if (!drawn) {
          // Outer copper pipe
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = rad * 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Metallic inner shine
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = rad * 1.1;
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Brass entry flange ring
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, rad + 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Brass exit flange ring
          ctx.beginPath();
          ctx.arc(x2, y2, rad + 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }

      case 'moving_bar': {
        const x2 = obj.x2 ?? obj.x + (obj.length || 80);
        const y2 = obj.y2 ?? obj.y;

        const drawn = spriteManager.drawPlank(ctx, obj.x, obj.y, x2, y2, obj.thickness || 12);
        if (!drawn) {
          // Wooden/brass moving plank fallback
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = obj.thickness || 12;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Gold highlight rail
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y - 3);
          ctx.lineTo(x2, y2 - 3);
          ctx.stroke();
        }

        // Draw brass pivot bolt over the plank
        const pType = obj.pivotType || 'center';
        let pvX = (obj.x + x2) / 2;
        let pvY = (obj.y + y2) / 2;
        if (pType === 'left') {
          pvX = obj.x;
          pvY = obj.y;
        } else if (pType === 'right') {
          pvX = x2;
          pvY = y2;
        }

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pvX, pvY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'lever': {
        const x2 = obj.x2 ?? obj.x + (obj.length || 70);
        const y2 = obj.y2 ?? obj.y;

        const drawn = spriteManager.drawPlank(ctx, obj.x, obj.y, x2, y2, obj.thickness || 12);
        if (!drawn) {
          // Mechanical switch arm fallback
          ctx.strokeStyle = obj.leverActivated ? '#38bdf8' : '#e11d48';
          ctx.lineWidth = obj.thickness || 12;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Pivot fulcrum bolt over the lever
        const pType = obj.pivotType || 'left';
        const pvX = pType === 'right' ? x2 : obj.x;
        const pvY = pType === 'right' ? y2 : obj.y;

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pvX, pvY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Status indicator LED on lever
        ctx.fillStyle = obj.leverActivated ? '#38bdf8' : '#fbbf24';
        ctx.shadowColor = obj.leverActivated ? '#38bdf8' : '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc((obj.x + x2) / 2, (obj.y + y2) / 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'breakable_block': {
        const drawn = spriteManager.drawBlock(ctx, obj.blockColor || 'rojo', obj.x, obj.y, obj.width, obj.height);
        if (!drawn) {
          const x = obj.x - obj.width / 2;
          const y = obj.y - obj.height / 2;

          const style = (obj.blockColor && BLOCK_COLOR_STYLES[obj.blockColor]) || {
            fill: obj.health > 1 ? '#854d0e' : '#b45309',
            stroke: '#fef08a',
            light: '#ffffff',
          };

          ctx.fillStyle = style.fill;
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x, y, obj.width, obj.height, 5);
          ctx.fill();
          ctx.stroke();

          // Points text
          const pts = (obj.blockColor && BLOCK_COLOR_POINTS[obj.blockColor]) || obj.points || GAME_CONSTANTS.POINTS_BLOCK;
          ctx.fillStyle = style.light || '#ffffff';
          ctx.font = 'bold 11px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`+${pts}`, obj.x, obj.y);
        }
        break;
      }

      case 'trampoline': {
        const drawn = spriteManager.drawTrampoline(ctx, obj.angle || 0, obj.x, obj.y, obj.width, obj.height);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.rotate(obj.angle || 0);

          // Base & Spring
          ctx.fillStyle = '#334155';
          ctx.fillRect(-obj.width / 2, 4, obj.width, 10);

          // Spring coils
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-15, 6);
          ctx.lineTo(-5, 0);
          ctx.lineTo(5, 6);
          ctx.lineTo(15, 0);
          ctx.stroke();

          // Bouncy red pad
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-obj.width / 2, -obj.height / 2, obj.width, 8, 4);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        break;
      }

      case 'oil': {
        const drawn = spriteManager.drawOil(ctx, obj.x, obj.y, obj.width, obj.height, obj.id);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.rotate(obj.angle || 0);

          // Shimmering blue oil slick
          const oilGrad = ctx.createLinearGradient(-obj.width / 2, 0, obj.width / 2, 0);
          oilGrad.addColorStop(0, '#0284c7');
          oilGrad.addColorStop(0.5, '#38bdf8');
          oilGrad.addColorStop(1, '#0284c7');

          ctx.fillStyle = oilGrad;
          ctx.beginPath();
          ctx.roundRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height, 6);
          ctx.fill();

          // Speed arrows
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡ ⚡ ⚡', 0, 0);
          ctx.restore();
        }
        break;
      }

      case 'fan': {
        obj.bladeAngle += 0.2;
        ctx.save();
        ctx.translate(obj.x, obj.y);

        // Fan cage
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, obj.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spinning blades
        ctx.rotate(obj.bladeAngle);
        ctx.fillStyle = '#0284c7';
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.ellipse(0, 10, 4, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      case 'gear': {
        const drawn = spriteManager.drawGearOrPropeller(ctx, 'gear', obj.angle || 0, obj.x, obj.y, obj.radius);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);
          ctx.rotate(obj.angle || 0);

          // Brass Gear
          ctx.fillStyle = '#b45309';
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Teeth
          for (let i = 0; i < obj.teeth; i++) {
            const a = (i * Math.PI * 2) / obj.teeth;
            const tx = Math.cos(a) * (obj.radius + 4);
            const ty = Math.sin(a) * (obj.radius + 4);
            ctx.fillRect(tx - 3, ty - 3, 6, 6);
          }

          // Center hub
          ctx.fillStyle = '#180a03';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'balloon': {
        const floatY = Math.sin(Date.now() * 0.002 + obj.floatOffset) * 5;
        const drawn = spriteManager.drawBalloon(ctx, obj.color, obj.x, obj.y + floatY, obj.radius);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y + floatY);

          ctx.fillStyle = obj.color;
          ctx.shadowColor = obj.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(0, 0, obj.radius, obj.radius * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.arc(-4, -6, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'bomb': {
        const drawn = spriteManager.drawBomb(ctx, obj.x, obj.y, obj.radius);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);

          // Bomb body
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Skull / cross icon
          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', 0, 0);
          ctx.restore();
        }
        break;
      }

      case 'target': {
        const drawn = spriteManager.drawTarget(ctx, obj.x, obj.y, obj.radius, !!obj.isSpecial);
        if (!drawn) {
          ctx.save();
          ctx.translate(obj.x, obj.y);

          // Carnival Can / Bullseye Target
          ctx.fillStyle = obj.isSpecial ? '#eab308' : '#dc2626';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;

          ctx.beginPath();
          ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, obj.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = obj.isSpecial ? '#eab308' : '#dc2626';
          ctx.beginPath();
          ctx.arc(0, 0, obj.radius * 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'box': {
        const drawn = spriteManager.drawBox(ctx, obj.reward, obj.opened, obj.x, obj.y, obj.width, obj.height);
        if (!drawn) {
          const x = obj.x - obj.width / 2;
          const y = obj.y - obj.height / 2;

          if (obj.opened) {
            // Open empty wooden crate
            ctx.fillStyle = '#291508';
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2;
            ctx.fillRect(x, y, obj.width, obj.height);
            ctx.strokeRect(x, y, obj.width, obj.height);

            ctx.fillStyle = '#a1a1aa';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('ABIERTA', obj.x, obj.y + 4);
          } else {
            // Mystery prize chest with glow
            const boxColors = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#ec4899'];
            const col = boxColors[obj.boxIndex % boxColors.length];

            ctx.fillStyle = col;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, obj.width, obj.height, 4);
            ctx.fill();
            ctx.stroke();

            // Star / Question mark
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Fredoka, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎁', obj.x, obj.y);
          }
        }
        break;
      }

      case 'magnet': {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.angle || 0);

        // Core Ring
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner core
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Magnetic flux lines (shimmering animation)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius * (1.3 + Math.sin(Date.now() * 0.01) * 0.15), 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }

  private renderBall(ctx: CanvasRenderingContext2D, ball: Ball) {
    const time = Date.now() * 0.005;

    // 1. Draw ball trail
    for (const t of ball.trail) {
      const trailColor =
        ball.type === 'fast'
          ? `rgba(249, 115, 22, ${t.alpha * 0.5})`
          : ball.type === 'explosive'
          ? `rgba(239, 68, 68, ${t.alpha * 0.5})`
          : ball.type === 'shield'
          ? `rgba(168, 85, 247, ${t.alpha * 0.5})`
          : ball.type === 'triple'
          ? `rgba(56, 189, 248, ${t.alpha * 0.5})`
          : ball.type === 'double'
          ? `rgba(250, 204, 21, ${t.alpha * 0.5})`
          : `rgba(251, 191, 36, ${t.alpha * 0.4})`;

      ctx.fillStyle = trailColor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Base Ball: ALWAYS the exact official standard metallic ball sprite (bolas.png [col=0, row=0])
    const drawn = spriteManager.drawBall(ctx, ball.x, ball.y, ball.radius);
    if (!drawn) {
      this.renderMetallicSphere(ctx, ball.x, ball.y, ball.radius, 'standard', false);
    }

    // 3. Power-Up Overlays: Drawn ON TOP of the normal ball without replacing its sprite
    if (ball.type === 'fast') {
      // Speed Aura & Wind Streaks overlay
      ctx.save();
      const pulse = 1 + Math.sin(time * 6) * 0.15;
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * pulse + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Trailing speed streak
      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd > 40) {
        const ang = Math.atan2(ball.vy, ball.vx);
        ctx.strokeStyle = 'rgba(253, 186, 116, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ball.x - Math.cos(ang) * (ball.radius + 6), ball.y - Math.sin(ang) * (ball.radius + 6));
        ctx.lineTo(ball.x - Math.cos(ang) * (ball.radius + 18), ball.y - Math.sin(ang) * (ball.radius + 18));
        ctx.stroke();
      }
      ctx.restore();
    } else if (ball.type === 'shield' || ball.isImmune) {
      // Spherical Energy Forcefield Shield overlay
      ctx.save();
      const pulse = 1 + Math.sin(time * 4) * 0.1;
      const grad = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.5, ball.x, ball.y, ball.radius + 7);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.05)');
      grad.addColorStop(0.7, 'rgba(192, 132, 252, 0.25)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0.75)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, (ball.radius + 5) * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(216, 180, 254, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else if (ball.type === 'explosive') {
      // Danger Pulsing Flare & Spark Fuse overlay
      ctx.save();
      const pulse = 1 + Math.sin(time * 8) * 0.18;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * pulse + 1, 0, Math.PI * 2);
      ctx.stroke();

      // Small burning spark on top edge
      const sparkX = ball.x + Math.cos(time * 5) * (ball.radius * 0.7);
      const sparkY = ball.y - ball.radius * 0.8 + Math.sin(time * 7) * 2;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (ball.type === 'double' || ball.type === 'triple') {
      // Orbiting Sparkles overlay
      ctx.save();
      const count = ball.type === 'triple' ? 3 : 2;
      const color = ball.type === 'triple' ? '#38bdf8' : '#facc15';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;

      for (let i = 0; i < count; i++) {
        const ang = time * 3 + (i * Math.PI * 2) / count;
        const ox = ball.x + Math.cos(ang) * (ball.radius + 5);
        const oy = ball.y + Math.sin(ang) * (ball.radius + 5);
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (ball.boostedByOil) {
      // Shimmering oil sheen reflection
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.physics.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    for (const ft of this.physics.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 15px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
