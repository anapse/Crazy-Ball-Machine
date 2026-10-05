import { LevelConfig, MachineObject, TopChannel, BoxReward, BlockColor, ArrowDirection } from '../types/game';
import { GAME_CONSTANTS } from './constants';

// Seeded Pseudo-Random Number Generator for reproducible, controlled level generation
class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  public next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public choice<T>(array: T[]): T {
    return array[this.rangeInt(0, array.length - 1)];
  }
}

export class LevelManager {
  private static getBounds(obj: MachineObject): any {
    switch (obj.type) {
      case 'breakable_block':
        return { type: 'rect', x: obj.x, y: obj.y, w: obj.width, h: obj.height };
      case 'ramp':
      case 'moving_bar':
      case 'lever':
      case 'pipe':
        return { 
          type: 'segment', 
          x: obj.x, 
          y: obj.y, 
          x2: (obj as any).x2 ?? (obj.x + ((obj as any).length ?? 80)), 
          y2: (obj as any).y2 ?? obj.y, 
          thickness: (obj as any).thickness ?? ((obj as any).radius ?? 12) * 2 
        };
      case 'trampoline':
        return { type: 'rect', x: obj.x, y: obj.y, w: obj.width, h: obj.height };
      case 'gear':
      case 'windmill':
      case 'bumper':
      case 'target':
      case 'bomb':
      case 'balloon':
      case 'magnet': {
        const rad = (obj as any).radius || (obj as any).armLength || 20;
        return { type: 'circle', x: obj.x, y: obj.y, r: rad };
      }
      case 'arrow':
      case 'fan':
      case 'box':
        return { type: 'rect', x: obj.x, y: obj.y, w: obj.width || 44, h: obj.height || 44 };
      case 'oil':
        return { type: 'rect', x: obj.x, y: obj.y, w: obj.width, h: obj.height };
      default:
        return { type: 'circle', x: (obj as any).x, y: (obj as any).y, r: 20 };
    }
  }

  private static getAABB(b: any, padding: number): { minX: number, maxX: number, minY: number, maxY: number } {
    if (b.type === 'circle') {
      return {
        minX: b.x - b.r - padding,
        maxX: b.x + b.r + padding,
        minY: b.y - b.r - padding,
        maxY: b.y + b.r + padding,
      };
    } else if (b.type === 'rect') {
      const halfW = b.w / 2;
      const halfH = b.h / 2;
      return {
        minX: b.x - halfW - padding,
        maxX: b.x + halfW + padding,
        minY: b.y - halfH - padding,
        maxY: b.y + halfH + padding,
      };
    } else if (b.type === 'segment') {
      const minX = Math.min(b.x, b.x2);
      const maxX = Math.max(b.x, b.x2);
      const minY = Math.min(b.y, b.y2);
      const maxY = Math.max(b.y, b.y2);
      const t = b.thickness / 2;
      return {
        minX: minX - t - padding,
        maxX: maxX + t + padding,
        minY: minY - t - padding,
        maxY: maxY + t + padding,
      };
    }
    return { minX: b.x - padding, maxX: b.x + padding, minY: b.y - padding, maxY: b.y + padding };
  }

  private static checkOverlap(o1: MachineObject, o2: MachineObject, padding: number = 32): boolean {
    const b1 = this.getBounds(o1);
    const b2 = this.getBounds(o2);

    const box1 = this.getAABB(b1, padding);
    const box2 = this.getAABB(b2, padding);

    return !(
      box1.maxX < box2.minX ||
      box1.minX > box2.maxX ||
      box1.maxY < box2.minY ||
      box1.minY > box2.maxY
    );
  }

  private static getRequiredPadding(o1: MachineObject, o2: MachineObject): number {
    if (o1.type === 'breakable_block' && o2.type === 'breakable_block') {
      if ((o1 as any).clusterId !== undefined && (o1 as any).clusterId === (o2 as any).clusterId) {
        return -2; // Allowed to touch side-by-side inside same cluster
      }
      return 8; // Small gap between different block clusters
    }

    if (o1.type === 'box' && o2.type === 'box') {
      return 2; // Bottom prize boxes placed neatly side-by-side
    }

    const isLarge1 = o1.type === 'gear' || o1.type === 'windmill' || o1.type === 'fan' || o1.type === 'ramp' || o1.type === 'pipe';
    const isLarge2 = o2.type === 'gear' || o2.type === 'windmill' || o2.type === 'fan' || o2.type === 'ramp' || o2.type === 'pipe';

    if (isLarge1 && isLarge2) {
      return 14; // Enough visual/physical breathing room
    }
    if (isLarge1 || isLarge2) {
      return 10; // Enough breathing room without starving the level
    }

    return 8; // Compact but non-overlapping placement
  }

  private static tryPlaceObject(obj: MachineObject, existing: MachineObject[]): boolean {
    for (const other of existing) {
      const pad = this.getRequiredPadding(obj, other);
      if (this.checkOverlap(obj, other, pad)) {
        return false;
      }
    }
    return true;
  }

  private static findValidPosition(
    obj: MachineObject,
    existing: MachineObject[],
    worldWidth: number,
    minY: number,
    maxY: number
  ): { x: number; y: number } | null {
    const origX = obj.x;
    const origY = obj.y;
    const segmentDx = (obj.type === 'ramp' || obj.type === 'pipe' || obj.type === 'moving_bar' || obj.type === 'lever')
      ? (((obj as any).x2 ?? (obj.x + ((obj as any).length ?? 80))) - origX) : 0;
    const segmentDy = (obj.type === 'ramp' || obj.type === 'pipe' || obj.type === 'moving_bar' || obj.type === 'lever')
      ? (((obj as any).y2 ?? obj.y) - origY) : 0;

    const steps = [
      { dx: 0, dy: 0 },
      // Ring 1 (15px)
      { dx: -15, dy: 0 }, { dx: 15, dy: 0 }, { dx: 0, dy: -15 }, { dx: 0, dy: 15 },
      // Ring 2 (30px)
      { dx: -30, dy: 0 }, { dx: 30, dy: 0 }, { dx: 0, dy: -30 }, { dx: 0, dy: 30 },
      { dx: -22, dy: -22 }, { dx: 22, dy: -22 }, { dx: -22, dy: 22 }, { dx: 22, dy: 22 },
      // Ring 3 (45px)
      { dx: -45, dy: 0 }, { dx: 45, dy: 0 }, { dx: 0, dy: -45 }, { dx: 0, dy: 45 },
      { dx: -32, dy: -32 }, { dx: 32, dy: -32 }, { dx: -32, dy: 32 }, { dx: 32, dy: 32 },
      // Ring 4 (60px)
      { dx: -60, dy: 0 }, { dx: 60, dy: 0 }, { dx: 0, dy: -60 }, { dx: 0, dy: 60 },
      // Ring 5 (80px)
      { dx: -80, dy: 0 }, { dx: 80, dy: 0 }, { dx: 0, dy: -80 }, { dx: 0, dy: 80 },
      // Ring 6 (100px)
      { dx: -100, dy: 0 }, { dx: 100, dy: 0 }, { dx: 0, dy: -100 }, { dx: 0, dy: 100 },
      // Ring 7 (120px)
      { dx: -120, dy: 0 }, { dx: 120, dy: 0 }, { dx: 0, dy: -120 }, { dx: 0, dy: 120 },
    ];

    for (const step of steps) {
      const trialX = origX + step.dx;
      const trialY = origY + step.dy;

      const safetyMargin = 30;
      if (trialX < safetyMargin || trialX > worldWidth - safetyMargin) continue;
      if (trialY < minY || trialY > maxY) continue;

      obj.x = trialX;
      obj.y = trialY;

      if (obj.type === 'ramp' || obj.type === 'pipe' || obj.type === 'moving_bar' || obj.type === 'lever') {
        (obj as any).x2 = trialX + segmentDx;
        (obj as any).y2 = trialY + segmentDy;
      }

      if (this.tryPlaceObject(obj, existing)) {
        return { x: trialX, y: trialY };
      }
    }

    return null;
  }

  private static getBlockClusterPattern(patternIndex: number): { dx: number; dy: number }[] {
    switch (patternIndex) {
      case 0: // Flat
        return [
          { dx: 0, dy: 0 },
          { dx: 44, dy: 0 },
          { dx: 88, dy: 0 },
          { dx: 132, dy: 0 },
          { dx: 176, dy: 0 },
        ];
      case 1: // Slanted
        return [
          { dx: 0, dy: 0 },
          { dx: 44, dy: 10 },
          { dx: 88, dy: 20 },
          { dx: 132, dy: 30 },
          { dx: 176, dy: 40 },
        ];
      case 2: // Inverted V / Arch
        return [
          { dx: 0, dy: 16 },
          { dx: 44, dy: 8 },
          { dx: 88, dy: 0 },
          { dx: 132, dy: 8 },
          { dx: 176, dy: 16 },
        ];
      case 3: // V-Shape
      default:
        return [
          { dx: 0, dy: 0 },
          { dx: 44, dy: 8 },
          { dx: 88, dy: 16 },
          { dx: 132, dy: 8 },
          { dx: 176, dy: 0 },
        ];
    }
  }

  public static getChannels(): TopChannel[] {
    const channelWidth = 64;
    const gap = (GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.CHANNEL_COUNT * channelWidth) / (GAME_CONSTANTS.CHANNEL_COUNT + 1);

    return GAME_CONSTANTS.CHANNEL_COLORS.map((col, index) => {
      const x = gap + index * (channelWidth + gap) + channelWidth / 2;
      return {
        index,
        x,
        y: GAME_CONSTANTS.CHANNEL_Y,
        width: channelWidth,
        color: col.hex,
        name: col.name,
      };
    });
  }

  public static createBottomBoxes(rewards: BoxReward[]): MachineObject[] {
    const boxWidth = 46;
    // Bottom 10% of playable machine (height 2800): Y = 2520.
    // Explicit rule (Req 6 & 8): EXCLUDE loss hole at X = 225, leaving a clear open central channel.
    // 6 boxes in a single horizontal row: 3 on left, 3 on right.
    const startY = 2520;
    const positions = [
      { x: 55, y: startY },
      { x: 112, y: startY },
      { x: 169, y: startY },
      // Central open corridor above loss hole (X = 192 to 258)
      { x: 281, y: startY },
      { x: 338, y: startY },
      { x: 395, y: startY },
    ];

    return positions.map((pos, i) => ({
      id: `box_${i}`,
      type: 'box',
      x: pos.x,
      y: pos.y,
      width: boxWidth,
      height: boxWidth,
      boxIndex: i,
      reward: rewards[i % rewards.length],
      opened: false,
      destroyed: false,
      points: GAME_CONSTANTS.POINTS_BOX,
    }));
  }

  public static getLevel(levelNumber: number): LevelConfig {
    let seed = levelNumber * 777 + 12345;
    let attempts = 0;
    let config: LevelConfig | null = null;

    // Retry loop until bottleneck validation succeeds
    while (!config && attempts < 100) {
      config = this.generateLevelAttempt(levelNumber, seed + attempts);
      attempts++;
    }

    // Backup return to guarantee game never crashes
    if (!config) {
      return this.generateBackupLevel(levelNumber);
    }

    return config;
  }

  // Real Pathfinding Grid-Based Connectivity Validation (Flood Fill BFS)
  private static isPlayable(objects: MachineObject[], width: number, height: number): boolean {
    const cellSize = 15;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    // Create 2D grid initialized to false (open)
    const grid = Array.from({ length: cols }, () => new Array(rows).fill(false));

    // Mark permanent physical blockers and initial brick formations on the grid
    for (const obj of objects) {
      if (obj.destroyed) continue;

      if (obj.type === 'breakable_block') {
        const halfW = obj.width / 2;
        const halfH = obj.height / 2;
        const minGX = Math.max(0, Math.floor((obj.x - halfW) / cellSize));
        const maxGX = Math.min(cols - 1, Math.floor((obj.x + halfW) / cellSize));
        const minGY = Math.max(0, Math.floor((obj.y - halfH) / cellSize));
        const maxGY = Math.min(rows - 1, Math.floor((obj.y + halfH) / cellSize));
        for (let gx = minGX; gx <= maxGX; gx++) {
          for (let gy = minGY; gy <= maxGY; gy++) {
            grid[gx][gy] = true;
          }
        }
      } else if (obj.type === 'ramp' || obj.type === 'moving_bar' || obj.type === 'lever' || obj.type === 'pipe') {
        const x1 = obj.x;
        const y1 = obj.y;
        const x2 = (obj as any).x2 ?? (obj.x + 80);
        const y2 = (obj as any).y2 ?? obj.y;
        const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6);
        for (let i = 0; i <= steps; i++) {
          const t = steps > 0 ? i / steps : 0;
          const lx = x1 + t * (x2 - x1);
          const ly = y1 + t * (y2 - y1);
          const gcx = Math.floor(lx / cellSize);
          const gcy = Math.floor(ly / cellSize);
          if (gcx >= 0 && gcx < cols && gcy >= 0 && gcy < rows) {
            grid[gcx][gcy] = true;
          }
        }
      } else if (
        obj.type === 'bumper' ||
        obj.type === 'gear' ||
        obj.type === 'windmill' ||
        obj.type === 'trampoline' ||
        obj.type === 'target'
      ) {
        const rad = (obj as any).radius || (obj as any).armLength || 22;
        const gcx = Math.floor(obj.x / cellSize);
        const gcy = Math.floor(obj.y / cellSize);
        const gridR = Math.ceil(rad / cellSize);

        for (let dx = -gridR; dx <= gridR; dx++) {
          for (let dy = -gridR; dy <= gridR; dy++) {
            const nx = gcx + dx;
            const ny = gcy + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              if (Math.hypot(dx, dy) * cellSize <= rad) {
                grid[nx][ny] = true;
              }
            }
          }
        }
      }
    }

    // Run Flood Fill / BFS starting from the top launchers to check if we can reach boxes Y = 2500
    const visited = Array.from({ length: cols }, () => new Array(rows).fill(false));
    const queue: [number, number][] = [];

    // Push 5 top launcher channel positions onto BFS queue
    const startY = Math.floor(200 / cellSize);
    const startXs = [50, 137, 225, 312, 400].map(x => Math.floor(x / cellSize));

    for (const sx of startXs) {
      if (sx >= 0 && sx < cols && startY >= 0 && startY < rows && !grid[sx][startY]) {
        queue.push([sx, startY]);
        visited[sx][startY] = true;
      }
    }

    let reachedBottom = false;
    const targetY = Math.floor(2450 / cellSize);
    const dirs = [
      [0, 1],   // Down
      [-1, 1],  // Down-Left
      [1, 1],   // Down-Right
      [-1, 0],  // Left
      [1, 0],   // Right
      [-1, -1], // Up-Left (bounce)
      [1, -1]   // Up-Right (bounce)
    ];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;

      if (cy >= targetY) {
        reachedBottom = true;
        break;
      }

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          if (!grid[nx][ny] && !visited[nx][ny]) {
            visited[nx][ny] = true;
            queue.push([nx, ny]);
          }
        }
      }
    }

    return reachedBottom;
  }

  private static generateLevelAttempt(levelNumber: number, seed: number): LevelConfig | null {
    const rng = new SeededRNG(seed);
    const width = GAME_CONSTANTS.WORLD_WIDTH; // 450
    const height = GAME_CONSTANTS.WORLD_HEIGHT; // 2800
    const objects: MachineObject[] = [];

    const colors: BlockColor[] = ['rojo', 'azul', 'verde', 'amarillo', 'naranja', 'morado', 'rosa'];
    const balloonColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#ec4899'];
    const tramos = 12;
    const tramoHeight = 168;
    const firstY = 240;
    let blockCounter = 0;
    let clusterCounter = 0;

    const addIfValid = (obj: MachineObject, minY: number, maxY: number) => {
      const found = this.findValidPosition(obj, objects, width, minY, maxY);
      if (!found) return false;
      objects.push(obj);
      return true;
    };

    // Generate non-repetitive clusters of 3-5 bricks distributed across 12 tramos.
    // Guaranteed >= 60 bricks without ever forming full horizontal walls or repetitive grids.
    for (let t = 0; t < tramos; t++) {
      const minY = firstY + t * tramoHeight;
      const maxY = Math.min(2260, minY + tramoHeight);

      // Primary cluster (3 to 5 bricks)
      const clusterSize1 = rng.rangeInt(3, 5);
      const left1 = t % 2 === 0;
      const clusterW1 = (clusterSize1 - 1) * 40 + 38;
      const startX1 = left1 ? 45 : width - 45 - clusterW1;
      const clusterY1 = minY + 40;
      const color1 = rng.choice(colors);
      const hp1 = color1 === 'morado' || color1 === 'rosa' ? 3 : color1 === 'verde' || color1 === 'naranja' ? 2 : 1;
      const cId1 = ++clusterCounter;

      for (let i = 0; i < clusterSize1; i++) {
        const b: MachineObject = {
          id: `blk_${++blockCounter}`,
          type: 'breakable_block',
          x: startX1 + i * 40 + 19,
          y: clusterY1,
          width: 38,
          height: 26,
          health: hp1,
          maxHealth: hp1,
          blockColor: color1,
          clusterId: cId1,
        } as any;
        if (this.tryPlaceObject(b, objects)) objects.push(b);
      }

      // Secondary cluster in 8 of the tramos to reach 65-75 total bricks smoothly
      if (t !== 2 && t !== 5 && t !== 8 && t !== 11) {
        const clusterSize2 = rng.rangeInt(3, 4);
        const left2 = !left1;
        const clusterW2 = (clusterSize2 - 1) * 40 + 38;
        const startX2 = left2 ? 45 : width - 45 - clusterW2;
        const clusterY2 = minY + 105;
        const color2 = rng.choice(colors);
        const hp2 = color2 === 'morado' || color2 === 'rosa' ? 3 : color2 === 'verde' || color2 === 'naranja' ? 2 : 1;
        const cId2 = ++clusterCounter;

        for (let i = 0; i < clusterSize2; i++) {
          const b: MachineObject = {
            id: `blk_${++blockCounter}`,
            type: 'breakable_block',
            x: startX2 + i * 40 + 19,
            y: clusterY2,
            width: 38,
            height: 26,
            health: hp2,
            maxHealth: hp2,
            blockColor: color2,
            clusterId: cId2,
          } as any;
          if (this.tryPlaceObject(b, objects)) objects.push(b);
        }
      }

      // Place diverse interactive mechanics per tramo
      const safeX = left1 ? width - 85 : 85;
      const centerX = 225;
      const yA = minY + (t % 2 === 0 ? 95 : 130);
      const yB = minY + (t % 2 === 0 ? 145 : 80);

      // Gears (Engranajes)
      if (t === 1 || t === 4 || t === 7 || t === 10) {
        addIfValid({
          id: `gear_${t}`, type: 'gear', x: safeX, y: yA,
          radius: 28, teeth: 8, speed: (t % 2 === 0 ? 1 : -1) * 1.1,
          motionType: 'continuous_spin', angularSpeed: (t % 2 === 0 ? 1 : -1) * 1.1,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Windmills (Molinos)
      if (t === 0 || t === 3 || t === 6 || t === 9) {
        addIfValid({
          id: `wm_${t}`, type: 'windmill', x: safeX, y: yA,
          arms: 4, armLength: 32, thickness: 10,
          rotationSpeed: (t % 2 === 0 ? 1 : -1) * 1.0,
          motionType: 'continuous_spin', angularSpeed: (t % 2 === 0 ? 1 : -1) * 1.0,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Pinball Bumpers
      if (t === 1 || t === 3 || t === 5 || t === 7 || t === 9 || t === 11) {
        addIfValid({
          id: `bmp_${t}`, type: 'bumper', x: centerX + (t % 2 === 0 ? 40 : -40), y: yB,
          radius: 23, bounceForce: 650, points: 30,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Slow, clearly visible Balloons (Globos) - Requirement 9: Increased quantity distributed across levels
      if (t < 11) {
        const balOffset = (t % 3 === 0 ? -60 : t % 3 === 1 ? 60 : 0);
        const balBaseX = centerX + balOffset + rng.rangeInt(-15, 15);
        const balBaseY = minY + rng.rangeInt(50, 80);
        addIfValid({
          id: `bal_${t}`, type: 'balloon', x: balBaseX, y: balBaseY,
          radius: 22, color: rng.choice(balloonColors), popped: false, floatOffset: rng.range(0, Math.PI * 2),
          motionType: 'patrol_h', moveRange: rng.rangeInt(24, 38), moveSpeed: rng.range(0.9, 1.3),
          baseX: balBaseX, baseY: balBaseY,
        } as MachineObject, minY + 15, maxY - 15);
      }

      // Trampolines (using native horizontal/slanted cells)
      if (t === 2 || t === 5 || t === 8 || t === 11) {
        addIfValid({
          id: `tramp_${t}`, type: 'trampoline', x: safeX, y: yB,
          width: 72, height: 26, angle: t % 4 === 2 ? 0 : (t % 4 === 1 ? 0.25 : -0.25),
          bounceForce: 630, animTimer: 0,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Pipes (Tuberías)
      if (t === 0 || t === 4 || t === 8) {
        const px = left1 ? width - 130 : 50;
        addIfValid({
          id: `pipe_${t}`, type: 'pipe', x: px, y: minY + 70,
          x2: px + 80, y2: minY + 70,
          radius: 14, boostSpeed: 75,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Arrows (Flechas) - Requirement 5: exact physical directional acceleration
      if (t === 1 || t === 5 || t === 9) {
        const arrowOptions: { dir: ArrowDirection; fx: number; fy: number; a: number }[] = [
          { dir: 'UP', fx: 0, fy: -380, a: -Math.PI / 2 },
          { dir: 'DOWN', fx: 0, fy: 380, a: Math.PI / 2 },
          { dir: 'LEFT', fx: -380, fy: 0, a: Math.PI },
          { dir: 'RIGHT', fx: 380, fy: 0, a: 0 },
          { dir: 'DIAG_RIGHT', fx: 280, fy: 280, a: Math.PI / 4 },
          { dir: 'DIAG_LEFT', fx: -280, fy: 280, a: 3 * Math.PI / 4 },
        ];
        const opt = arrowOptions[(t + levelNumber) % arrowOptions.length];
        addIfValid({
          id: `arr_${t}`, type: 'arrow', x: centerX, y: yB,
          width: 48, height: 48, forceX: opt.fx, forceY: opt.fy,
          angle: opt.a, direction: opt.dir,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Oil patches (Manchas de aceite)
      if (t === 2 || t === 6 || t === 10) {
        addIfValid({
          id: `oil_${t}`, type: 'oil', x: safeX, y: minY + 110,
          width: 76, height: 38, boostFactor: 1.35,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Targets (Dianas) - Pinball reactive score targets (Req 10)
      if (t === 1 || t === 3 || t === 7 || t === 9) {
        addIfValid({
          id: `target_${t}`, type: 'target', x: safeX, y: yB,
          radius: 22, points: t % 2 === 0 ? 150 : 100, isSpecial: t % 2 === 0, hitTimer: 0,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Bombs (Bombas)
      if (t === 0 || t === 4 || t === 8) {
        addIfValid({
          id: `bomb_${t}`, type: 'bomb', x: centerX, y: yA,
          radius: 22, exploded: false,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Fans (Ventiladores)
      if (t === 3 || t === 9) {
        addIfValid({
          id: `fan_${t}`, type: 'fan', x: safeX, y: minY + 130,
          width: 50, height: 50, forceX: left1 ? -280 : 280, forceY: 0,
          range: 150, bladeAngle: 0,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Magnets (Imanes)
      if (t === 5 || t === 11) {
        addIfValid({
          id: `magnet_${t}`, type: 'magnet', x: safeX, y: minY + 130,
          radius: 28, strength: 5.5,
        } as MachineObject, minY + 20, maxY - 20);
      }

      // Moving bars / Levers
      if (t === 2 || t === 8) {
        const barX = left1 ? width - 120 : 60;
        addIfValid({
          id: `mbar_${t}`, type: 'moving_bar', x: barX, y: minY + 120,
          length: 76, thickness: 12, pivotType: 'center', motionType: 'patrol_h',
          baseX: barX, baseY: minY + 120, moveRange: 30, moveSpeed: 0.4,
        } as MachineObject, minY + 90, maxY - 15);
      }
      if (t === 6 || t === 10) {
        const lx = left1 ? width - 110 : 70;
        addIfValid({
          id: `lever_${t}`, type: 'lever', x: lx, y: minY + 125,
          length: 68, thickness: 12, pivotType: 'left',
          baseAngle: 0, maxAngle: 0.3, triggeredAngle: 0.3, isTriggered: false,
        } as MachineObject, minY + 95, maxY - 15);
      }
    }

    // Varied bottom prize boxes rewards mix (Req 8: mix of rewards and empty boxes)
    const rewardMixes: BoxReward[][] = [
      ['power_double', 'empty', 'ball_1', 'power_explosive', 'points_500', 'empty'],
      ['ball_2', 'power_triple', 'empty', 'power_fast', 'points_500', 'power_shield'],
      ['empty', 'power_fast', 'ball_1', 'power_double', 'empty', 'power_triple'],
      ['power_shield', 'empty', 'power_double', 'points_500', 'power_explosive', 'ball_1'],
    ];
    const chosenRewards = rewardMixes[levelNumber % rewardMixes.length];
    const bottomBoxes = this.createBottomBoxes(chosenRewards);

    // Lower bumpers framing the exit area
    const bottomBumpers: MachineObject[] = [
      { id: 'bmp_bot_left', type: 'bumper', x: 55, y: 2380, radius: 23, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_right', type: 'bumper', x: 395, y: 2380, radius: 23, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_center', type: 'bumper', x: 225, y: 2325, radius: 23, bounceForce: 640, points: 30 },
    ];

    const allObjects = [...objects, ...bottomBumpers, ...bottomBoxes];
    const brickCount = allObjects.filter(o => o.type === 'breakable_block').length;
    if (brickCount < 68 || brickCount > 77) return null;
    if (!this.isPlayable(allObjects, width, height)) return null;

    return {
      levelNumber,
      title: `Máquina Pinball: Nivel ${levelNumber}`,
      worldWidth: width,
      worldHeight: height,
      startingBalls: 5,
      goal: { type: 'destroy_count', target: 6, current: 0, description: 'Destruye las 6 cajas de la máquina' },
      channels: this.getChannels(),
      objects: allObjects,
    };
  }

  // Fallback level guaranteeing exactly 72 bricks (within 68–77) and full interactive pinball mechanics
  private static generateBackupLevel(levelNumber: number): LevelConfig {
    const width = GAME_CONSTANTS.WORLD_WIDTH;
    const height = GAME_CONSTANTS.WORLD_HEIGHT;
    const objects: MachineObject[] = [];
    const colors: BlockColor[] = ['rojo', 'azul', 'verde', 'amarillo', 'naranja', 'morado', 'rosa'];

    // Exactly 72 bricks across 18 clusters leaving wide alternating descent corridors
    let bCount = 0;
    for (let c = 0; c < 18; c++) {
      const clusterY = 280 + c * 115;
      const leftSide = c % 2 === 0;
      const startX = leftSide ? 45 : 255;
      const size = 4; // 18 clusters * 4 bricks = 72 bricks
      const col = colors[c % colors.length];
      const clusterId = c + 1;

      for (let i = 0; i < size; i++) {
        objects.push({
          id: `blk_back_${++bCount}`,
          type: 'breakable_block',
          x: startX + i * 40 + 19,
          y: clusterY,
          width: 38,
          height: 26,
          health: 1,
          maxHealth: 1,
          blockColor: col,
          clusterId,
        });
      }

      // Add corresponding mechanics
      const mechX = leftSide ? 360 : 90;
      if (c % 4 === 0) {
        objects.push({
          id: `gear_back_${c}`, type: 'gear', x: mechX, y: clusterY, radius: 28, teeth: 8,
          speed: 1.1, motionType: 'continuous_spin', angularSpeed: 1.1,
        });
      } else if (c % 4 === 1) {
        objects.push({
          id: `wm_back_${c}`, type: 'windmill', x: mechX, y: clusterY, arms: 4, armLength: 32, thickness: 10,
          rotationSpeed: 1.0, motionType: 'continuous_spin', angularSpeed: 1.0,
        });
      } else if (c % 4 === 2) {
        objects.push({
          id: `bmp_back_${c}`, type: 'bumper', x: mechX, y: clusterY, radius: 23, bounceForce: 650, points: 30,
        });
      } else {
        objects.push({
          id: `bal_back_${c}`, type: 'balloon', x: 225, y: clusterY - 30, radius: 22, color: '#3b82f6',
          motionType: 'patrol_h', moveRange: 24, moveSpeed: 0.35, popped: false, floatOffset: 0,
        });
      }
    }

    const rewardMixes: BoxReward[][] = [
      ['power_double', 'empty', 'ball_1', 'power_explosive', 'points_500', 'empty'],
      ['ball_2', 'power_triple', 'empty', 'power_fast', 'points_500', 'power_shield'],
    ];
    const bottomBoxes = this.createBottomBoxes(rewardMixes[levelNumber % rewardMixes.length]);
    const bottomBumpers: MachineObject[] = [
      { id: 'bmp_bot_left', type: 'bumper', x: 55, y: 2380, radius: 23, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_right', type: 'bumper', x: 395, y: 2380, radius: 23, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_center', type: 'bumper', x: 225, y: 2325, radius: 23, bounceForce: 640, points: 30 },
    ];

    const allObjects = [...objects, ...bottomBumpers, ...bottomBoxes];

    return {
      levelNumber,
      title: `Máquina Pinball: Nivel ${levelNumber}`,
      worldWidth: width,
      worldHeight: height,
      startingBalls: 5,
      goal: {
        type: 'destroy_count',
        target: 6,
        current: 0,
        description: 'Destruye las 6 cajas de la máquina',
      },
      channels: this.getChannels(),
      objects: allObjects,
    };
  }
}
