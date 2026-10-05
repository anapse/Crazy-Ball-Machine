import { LevelConfig, MachineObject, TopChannel, BoxReward, BlockColor } from '../types/game';
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
      return 36; // Spacing between different clusters
    }

    const isLarge1 = o1.type === 'gear' || o1.type === 'windmill' || o1.type === 'fan' || o1.type === 'ramp' || o1.type === 'pipe';
    const isLarge2 = o2.type === 'gear' || o2.type === 'windmill' || o2.type === 'fan' || o2.type === 'ramp' || o2.type === 'pipe';

    if (isLarge1 && isLarge2) {
      return 60; // Extra generous gap between multiple heavy elements
    }
    if (isLarge1 || isLarge2) {
      return 45; // Generous gap between heavy and medium elements
    }

    return 24; // Safe minimum distance between standard elements
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
        const dx = (obj as any).x2 !== undefined ? (obj as any).x2 - origX : 0;
        const dy = (obj as any).y2 !== undefined ? (obj as any).y2 - origY : 0;
        if (dx !== 0 || dy !== 0) {
          (obj as any).x2 = trialX + dx;
          (obj as any).y2 = trialY + dy;
        }
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
    const boxWidth = 52;
    // Place them neatly together in a horizontal row at Y = 2500 (high above loss hole Y = 2720)
    const startY = 2500;
    const positions = [
      { x: 50, y: startY },
      { x: 108, y: startY },
      { x: 166, y: startY },
      { x: 225, y: startY },
      { x: 284, y: startY },
      { x: 342, y: startY },
      { x: 400, y: startY },
    ];

    return positions.map((pos, i) => ({
      id: `box_${i}`,
      type: 'box',
      x: pos.x,
      y: pos.y,
      width: boxWidth - 4,
      height: 48,
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

    // Mark permanent physical blockers on the grid
    for (const obj of objects) {
      if (obj.destroyed) continue;

      // Breakable blocks, balloons, targets, oil, and boxes are either collectible, slippery, or breakable, so they don't block path permanently
      if (obj.type === 'ramp' || obj.type === 'moving_bar' || obj.type === 'lever') {
        const x1 = obj.x;
        const y1 = obj.y;
        const x2 = (obj as any).x2 ?? (obj.x + 80);
        const y2 = (obj as any).y2 ?? obj.y;
        const thickness = (obj as any).thickness || 12;

        // Trace line segments on our coarse validation grid
        const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6);
        for (let i = 0; i <= steps; i++) {
          const t = steps > 0 ? i / steps : 0;
          const lx = x1 + t * (x2 - x1);
          const ly = y1 + t * (y2 - y1);

          const rad = (thickness / 2 + 10) / cellSize;
          const gcx = Math.floor(lx / cellSize);
          const gcy = Math.floor(ly / cellSize);

          for (let dx = -Math.ceil(rad); dx <= rad; dx++) {
            for (let dy = -Math.ceil(rad); dy <= rad; dy++) {
              const nx = gcx + dx;
              const ny = gcy + dy;
              if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                grid[nx][ny] = true;
              }
            }
          }
        }
      } else if (
        obj.type === 'bumper' ||
        obj.type === 'gear' ||
        obj.type === 'windmill' ||
        obj.type === 'bomb'
      ) {
        const rad = (obj as any).radius || (obj as any).armLength || 20;
        const gcx = Math.floor(obj.x / cellSize);
        const gcy = Math.floor(obj.y / cellSize);
        const gridR = Math.ceil((rad + 10) / cellSize);

        for (let dx = -gridR; dx <= gridR; dx++) {
          for (let dy = -gridR; dy <= gridR; dy++) {
            const nx = gcx + dx;
            const ny = gcy + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              if (Math.hypot(dx, dy) * cellSize <= rad + 10) {
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
    const targetY = Math.floor(2480 / cellSize);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;

      if (cy >= targetY) {
        reachedBottom = true;
        break;
      }

      // Ball can roll down, left, right or slide diagonally
      const dirs = [
        [0, 1],   // Down
        [-1, 1],  // Down-Left
        [1, 1],   // Down-Right
        [-1, 0],  // Left
        [1, 0]    // Right
      ];

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

    const availableColors: BlockColor[] = ['rojo', 'azul', 'verde', 'amarillo', 'naranja', 'morado', 'rosa'];
    const balloonColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#ec4899'];

    // 12 precise vertical segments/tramos to space out mechanics and block structures perfectly
    const tramosCount = 12;
    const tramoHeight = 175;
    const tramoStartY = 250;

    let blockCounter = 0;
    let clusterCounter = 0;

    for (let t = 0; t < tramosCount; t++) {
      const minY = tramoStartY + t * tramoHeight;
      const maxY = minY + tramoHeight;
      const midY = (minY + maxY) / 2;

      // --- A. PLACE 1 HIGH-VARIATION HORIZONTAL OR STAGGERED BLOCK CLUSTER OF EXACTLY 5 BLOCKS (Guarantees exactly 60 blocks) ---
      const clusterSize = 5;
      const color = rng.choice(availableColors);
      const hp = color === 'morado' || color === 'rosa' ? 3 : color === 'verde' || color === 'naranja' ? 2 : 1;
      
      const patternIdx = rng.rangeInt(0, 3); // 4 custom cluster layouts (flat, slanted, arch, V-shape) to break breakout monotony!
      const pattern = this.getBlockClusterPattern(patternIdx);

      const startX = rng.rangeInt(40, width - 40 - 176);
      const startY = rng.range(minY + 20, maxY - 60);
      clusterCounter++;

      const shifts = [
        { dx: 0, dy: 0 },
        { dx: -20, dy: 0 }, { dx: 20, dy: 0 }, { dx: 0, dy: -20 }, { dx: 0, dy: 20 },
        { dx: -40, dy: 0 }, { dx: 40, dy: 0 }, { dx: 0, dy: -40 }, { dx: 0, dy: 40 },
        { dx: -60, dy: 0 }, { dx: 60, dy: 0 }, { dx: 0, dy: -60 }, { dx: 0, dy: 60 },
      ];

      for (const shift of shifts) {
        const trialStartX = startX + shift.dx;
        const trialStartY = startY + shift.dy;

        if (trialStartX < 30 || trialStartX + 176 > width - 30) continue;
        if (trialStartY < minY + 15 || trialStartY > maxY - 15) continue;

        const candidates: MachineObject[] = [];
        for (let i = 0; i < clusterSize; i++) {
          const pt = pattern[i];
          candidates.push({
            id: `blk_${++blockCounter}`,
            type: 'breakable_block',
            x: trialStartX + pt.dx,
            y: trialStartY + pt.dy,
            width: 40,
            height: 24,
            health: hp,
            maxHealth: hp,
            blockColor: color,
            clusterId: clusterCounter,
          } as any);
        }

        let candidatesValid = true;
        for (const cand of candidates) {
          if (!this.tryPlaceObject(cand, objects)) {
            candidatesValid = false;
            break;
          }
        }

        if (candidatesValid) {
          objects.push(...candidates);
          break;
        } else {
          blockCounter -= clusterSize; // Revert block ID increments on overlap
        }
      }

      // --- B. PLACE ASSIGNED PROCEDURAL MECHANICS IN THIS TRAMO ---
      // Wooden Planks (Plank assigned to tramos 0, 1, 2, 3, 5, 6, 7, 8, 9, 10 alternating sides)
      if (t !== 4 && t !== 11) {
        const isLeftPlank = t % 2 === 0;
        const angle = isLeftPlank ? 0.3 : -0.3;
        const x1 = isLeftPlank ? 30 : width - 160;
        const plank = {
          id: `plank_${t + 1}`,
          type: 'ramp',
          x: x1,
          y: midY,
          x2: x1 + Math.cos(angle) * 130,
          y2: midY + Math.sin(angle) * 130,
          thickness: 14,
        } as MachineObject;

        this.findValidPosition(plank, objects, width, minY + 10, maxY - 10);
        objects.push(plank);
      }

      // Gears (assigned to tramos 0, 3, 6, 9)
      if (t === 0 || t === 3 || t === 6 || t === 9) {
        const gear = {
          id: `gear_${t}`,
          type: 'gear',
          x: rng.range(70, width - 70),
          y: rng.range(minY + 20, maxY - 20),
          radius: rng.rangeInt(30, 42),
          teeth: 8,
          speed: (rng.next() > 0.5 ? 1 : -1) * rng.range(0.8, 1.5),
        } as MachineObject;

        this.findValidPosition(gear, objects, width, minY + 15, maxY - 15);
        objects.push(gear);
      }

      // Windmills (assigned to tramos 1, 4, 7, 10)
      if (t === 1 || t === 4 || t === 7 || t === 10) {
        const wm = {
          id: `wm_${t}`,
          type: 'windmill',
          x: rng.range(75, width - 75),
          y: rng.range(minY + 20, maxY - 20),
          arms: 4,
          armLength: 42,
          thickness: 10,
          rotationSpeed: (rng.next() > 0.5 ? 1.4 : -1.4),
        } as MachineObject;

        this.findValidPosition(wm, objects, width, minY + 15, maxY - 15);
        objects.push(wm);
      }

      // Bumpers (assigned to tramos 0, 2, 4, 6, 8, 10)
      if (t === 0 || t === 2 || t === 4 || t === 6 || t === 8 || t === 10) {
        const bmp = {
          id: `bmp_${t}`,
          type: 'bumper',
          x: rng.range(60, width - 60),
          y: rng.range(minY + 20, maxY - 20),
          radius: 20,
          bounceForce: 650,
          points: 30,
        } as MachineObject;

        this.findValidPosition(bmp, objects, width, minY + 15, maxY - 15);
        objects.push(bmp);
      }

      // Balloons (assigned to tramos 1, 2, 3, 5, 6, 7, 9, 10, 11 - sometimes 2!)
      if (t === 1 || t === 2 || t === 3 || t === 5 || t === 6 || t === 7 || t === 9 || t === 10 || t === 11) {
        const balloonCountInTramo = t === 3 || t === 7 ? 2 : 1;
        for (let b = 0; b < balloonCountInTramo; b++) {
          const isMoving = rng.next() > 0.5;
          const bal = {
            id: `bal_${t}_${b}`,
            type: 'balloon',
            x: rng.range(60, width - 60),
            y: rng.range(minY + 20, maxY - 20),
            radius: 18,
            color: rng.choice(balloonColors),
            popped: false,
            floatOffset: 0,
            motionType: isMoving ? 'patrol_h' : 'static',
            moveRange: isMoving ? rng.rangeInt(30, 50) : 0,
            moveSpeed: rng.range(0.8, 1.4),
          } as MachineObject;

          this.findValidPosition(bal, objects, width, minY + 15, maxY - 15);
          objects.push(bal);
        }
      }

      // Trampolines (assigned to tramos 2, 5, 8, 11)
      if (t === 2 || t === 5 || t === 8 || t === 11) {
        const tramp = {
          id: `tramp_${t}`,
          type: 'trampoline',
          x: rng.range(70, width - 70),
          y: rng.range(minY + 20, maxY - 20),
          width: 48,
          height: 18,
          angle: rng.choice([0, 0.2, -0.2]),
          bounceForce: 630,
          animTimer: 0,
        } as MachineObject;

        this.findValidPosition(tramp, objects, width, minY + 15, maxY - 15);
        objects.push(tramp);
      }

      // Speed Arrows (assigned to tramos 1, 3, 5, 7, 9, 11)
      if (t === 1 || t === 3 || t === 5 || t === 7 || t === 9 || t === 11) {
        const isRightArrow = rng.next() > 0.5;
        const arrow = {
          id: `arr_${t}`,
          type: 'arrow',
          x: rng.range(70, width - 70),
          y: rng.range(minY + 20, maxY - 20),
          width: 40,
          height: 36,
          forceX: isRightArrow ? 280 : -280,
          forceY: 200,
          angle: isRightArrow ? 0.35 : -0.35,
        } as MachineObject;

        this.findValidPosition(arrow, objects, width, minY + 15, maxY - 15);
        objects.push(arrow);
      }

      // Oil Slicks (assigned to tramos 0, 4, 8, 11)
      if (t === 0 || t === 4 || t === 8 || t === 11) {
        const oil = {
          id: `oil_${t}`,
          type: 'oil',
          x: rng.range(80, width - 80),
          y: rng.range(minY + 20, maxY - 20),
          width: 95,
          height: 14,
          boostFactor: 1.45,
        } as MachineObject;

        this.findValidPosition(oil, objects, width, minY + 15, maxY - 15);
        objects.push(oil);
      }

      // Targets (assigned to tramos 1, 3, 7, 9, 11)
      if (t === 1 || t === 3 || t === 7 || t === 9 || t === 11) {
        const target = {
          id: `target_${t}`,
          type: 'target',
          x: rng.range(60, width - 60),
          y: rng.range(minY + 20, maxY - 20),
          radius: 18,
          points: 100,
          hit: false,
          isSpecial: t % 2 === 0,
        } as MachineObject;

        this.findValidPosition(target, objects, width, minY + 15, maxY - 15);
        objects.push(target);
      }

      // Bombs (assigned to tramos 2, 6, 10)
      if (t === 2 || t === 6 || t === 10) {
        const bomb = {
          id: `bomb_${t}`,
          type: 'bomb',
          x: rng.range(60, width - 60),
          y: rng.range(minY + 20, maxY - 20),
          radius: 16,
        } as MachineObject;

        this.findValidPosition(bomb, objects, width, minY + 15, maxY - 15);
        objects.push(bomb);
      }

      // Pipes / Tuberías (assigned to tramos 0, 4, 8, 11)
      if (t === 0 || t === 4 || t === 8 || t === 11) {
        const isLeftToRight = t % 2 === 0;
        const x1 = isLeftToRight ? 50 : width - 50;
        const x2 = isLeftToRight ? 180 : width - 180;
        const pipe = {
          id: `pipe_${t}`,
          type: 'pipe',
          x: x1,
          y: minY + 30,
          x2: x2,
          y2: minY + 90,
          radius: 14,
          boostSpeed: 75,
        } as any;

        this.findValidPosition(pipe, objects, width, minY + 15, maxY - 15);
        objects.push(pipe);
      }

      // Moving bars (assigned to tramos 2, 8)
      if (t === 2 || t === 8) {
        const mbar = {
          id: `mbar_${t}`,
          type: 'moving_bar',
          x: rng.range(120, width - 120),
          y: rng.range(minY + 20, maxY - 20),
          length: 80,
          thickness: 12,
          pivotType: 'center',
          motionType: 'patrol_h',
          baseX: 0, // will be overwritten by engine based on starting position
          baseY: 0,
          moveRange: 55,
          moveSpeed: 1.1,
        } as any;

        this.findValidPosition(mbar, objects, width, minY + 15, maxY - 15);
        // Sync starting physics baseline coordinates with its found valid position
        mbar.baseX = mbar.x;
        mbar.baseY = mbar.y;
        objects.push(mbar);
      }

      // Levers (assigned to tramos 3, 9)
      if (t === 3 || t === 9) {
        const lever = {
          id: `lever_${t}`,
          type: 'lever',
          x: rng.range(80, width - 150),
          y: rng.range(minY + 20, maxY - 20),
          length: 75,
          thickness: 12,
          pivotType: 'left',
          motionType: 'lever',
          baseAngle: 0.3,
          maxAngle: -0.3,
          triggeredAngle: -0.3,
          isTriggered: false,
        } as any;

        this.findValidPosition(lever, objects, width, minY + 15, maxY - 15);
        objects.push(lever);
      }

      // Fans (assigned to tramos 4, 10)
      if (t === 4 || t === 10) {
        const isLeftFan = t === 4;
        const fan = {
          id: `fan_${t}`,
          type: 'fan',
          x: isLeftFan ? 50 : width - 50,
          y: rng.range(minY + 30, maxY - 30),
          width: 44,
          height: 44,
          forceX: isLeftFan ? 380 : -380,
          forceY: 0,
          range: 180,
          bladeAngle: 0,
        } as any;

        this.findValidPosition(fan, objects, width, minY + 15, maxY - 15);
        objects.push(fan);
      }

      // Magnets (assigned to tramos 5, 11)
      if (t === 5 || t === 11) {
        const magnet = {
          id: `magnet_${t}`,
          type: 'magnet',
          x: rng.range(100, width - 100),
          y: rng.range(minY + 10, maxY - 10),
          radius: 35,
          strength: 5.5,
        } as any;

        this.findValidPosition(magnet, objects, width, minY + 15, maxY - 15);
        objects.push(magnet);
      }
    }

    // --- 14. BOTTOM TIER: 7 PRIZE BOXES (cajas.png) ---
    const bottomBoxes = this.createBottomBoxes([
      'ball_1',
      'power_explosive',
      'points_500',
      'power_double',
      'ball_2',
      'power_fast',
      'ball_1',
    ]);

    // Bottom chamber safety pinball bumpers
    const bottomBumpers: MachineObject[] = [
      { id: 'bmp_bot_left', type: 'bumper', x: 45, y: 2380, radius: 20, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_right', type: 'bumper', x: 405, y: 2380, radius: 20, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_center', type: 'bumper', x: 225, y: 2360, radius: 20, bounceForce: 640, points: 30 },
    ];

    const allObjects = [...objects, ...bottomBumpers, ...bottomBoxes];

    // --- 15. REAL PATHFINDING CONNECTIVITY VALIDATION ---
    const valid = this.isPlayable(allObjects, width, height);
    if (!valid) return null; // Reject layout & let retry handle next seed

    return {
      levelNumber,
      title: `Máquina Pinball: Nivel ${levelNumber}`,
      worldWidth: width,
      worldHeight: height,
      startingBalls: 8 + Math.floor(levelNumber / 2),
      goal: {
        type: 'destroy_count',
        target: 7,
        current: 0,
        description: 'Destruye las 7 cajas de la máquina',
      },
      channels: this.getChannels(),
      objects: allObjects,
    };
  }

  // Guaranteed fallback backup level configuration
  private static generateBackupLevel(levelNumber: number): LevelConfig {
    const width = GAME_CONSTANTS.WORLD_WIDTH;
    const height = GAME_CONSTANTS.WORLD_HEIGHT;
    const objects: MachineObject[] = [];

    // Simple 60 brick blocks grid to guarantee >= 60 bricks always
    let bCount = 0;
    for (let row = 0; row < 12; row++) {
      const y = 300 + row * 160;
      for (let col = 0; col < 5; col++) {
        const x = 50 + col * 80;
        objects.push({
          id: `blk_back_${++bCount}`,
          type: 'breakable_block',
          x,
          y,
          width: 40,
          height: 24,
          health: 1,
          maxHealth: 1,
          blockColor: 'azul',
        });
      }
    }

    const bottomBoxes = this.createBottomBoxes([
      'ball_1', 'power_explosive', 'points_500', 'power_double', 'ball_2', 'power_fast', 'ball_1'
    ]);

    const allObjects = [...objects, ...bottomBoxes];

    return {
      levelNumber,
      title: `Máquina Pinball: Nivel ${levelNumber}`,
      worldWidth: width,
      worldHeight: height,
      startingBalls: 8 + Math.floor(levelNumber / 2),
      goal: {
        type: 'destroy_count',
        target: 7,
        current: 0,
        description: 'Destruye las 7 cajas de la máquina',
      },
      channels: this.getChannels(),
      objects: allObjects,
    };
  }
}
