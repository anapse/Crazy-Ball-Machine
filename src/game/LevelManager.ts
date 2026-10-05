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

    // Track vertical bands to prevent bottlenecks and ensure continuous descent routes
    const yBands = [
      { min: 250, max: 550 },
      { min: 600, max: 900 },
      { min: 950, max: 1250 },
      { min: 1300, max: 1600 },
      { min: 1650, max: 1950 },
      { min: 2000, max: 2350 },
    ];

    let blockCounter = 0;

    // --- 1. GENERATE 60+ BREAKABLE BLOCKS IN CONTIGUOUS CLUSTERS (3, 4, 5 blocks per cluster) ---
    yBands.forEach((band) => {
      const clusterCount = rng.rangeInt(3, 4); // Boost clusters to guarantee >= 60 blocks esparcidos
      for (let c = 0; c < clusterCount; c++) {
        const clusterSize = rng.rangeInt(3, 5); // 3, 4, 5 blocks per cluster
        const color = rng.choice(availableColors);
        const hp = color === 'morado' || color === 'rosa' ? 3 : color === 'verde' || color === 'naranja' ? 2 : 1;

        const startX = rng.rangeInt(50, width - 50 - clusterSize * 44);
        const startY = rng.range(band.min + 20, band.max - 40);

        for (let i = 0; i < clusterSize; i++) {
          objects.push({
            id: `blk_${++blockCounter}`,
            type: 'breakable_block',
            x: startX + i * 44,
            y: startY,
            width: 40,
            height: 24,
            health: hp,
            maxHealth: hp,
            blockColor: color,
          });
        }
      }
    });

    // --- 2. WOODEN BEAMS / PLANKS (6-12) - STRICTLY NO OPPOSING FUNNEL RAMPS (\ /) ---
    const plankCount = rng.rangeInt(8, 12);
    let plankCounter = 0;
    yBands.forEach((band) => {
      if (plankCounter >= plankCount) return;

      const y = rng.range(band.min + 30, band.max - 30);
      const isLeft = rng.next() > 0.5;
      const angle = (isLeft ? 0.3 : -0.3) + rng.range(-0.05, 0.05);

      // Single plank per tier or offset planks to prevent funnels
      const x1 = isLeft ? 50 : width - 170;
      const x2 = x1 + Math.cos(angle) * 110;
      const y2 = y + Math.sin(angle) * 110;

      objects.push({
        id: `plank_${++plankCounter}`,
        type: 'ramp',
        x: x1,
        y: y,
        x2: x2,
        y2: y2,
        thickness: 14,
      });
    });

    // --- 3. TRAMPOLINES (3-6) ---
    const trampCount = rng.rangeInt(4, 6);
    for (let i = 0; i < trampCount; i++) {
      const band = rng.choice(yBands);
      const x = rng.range(80, width - 80);
      const y = rng.range(band.min + 40, band.max - 40);
      const angle = rng.choice([0, 0.2, -0.2]);

      objects.push({
        id: `tramp_${i + 1}`,
        type: 'trampoline',
        x,
        y,
        width: 48,
        height: 18,
        angle,
        bounceForce: 630,
        animTimer: 0,
      });
    }

    // --- 4. GEARS & PROPELLERS / WINDMILLS (aspa_engranaje.png) ---
    const gearCount = rng.rangeInt(4, 6);
    for (let i = 0; i < gearCount; i++) {
      const band = yBands[i % yBands.length];
      const x = rng.range(90, width - 90);
      const y = rng.range(band.min + 50, band.max - 50);

      objects.push({
        id: `gear_${i + 1}`,
        type: 'gear',
        x,
        y,
        radius: rng.rangeInt(30, 42),
        teeth: 8,
        speed: (rng.next() > 0.5 ? 1 : -1) * rng.range(0.8, 1.5),
      });
    }

    const windmillCount = rng.rangeInt(3, 5);
    for (let i = 0; i < windmillCount; i++) {
      const band = yBands[(i + 2) % yBands.length];
      const x = rng.range(100, width - 100);
      const y = rng.range(band.min + 60, band.max - 60);

      objects.push({
        id: `wm_${i + 1}`,
        type: 'windmill',
        x,
        y,
        arms: 4,
        armLength: 42,
        thickness: 10,
        rotationSpeed: (rng.next() > 0.5 ? 1.4 : -1.4),
      });
    }

    // --- 5. PINBALL BUMPERS (4-8) ---
    const bumperCount = rng.rangeInt(5, 8);
    for (let i = 0; i < bumperCount; i++) {
      const band = rng.choice(yBands);
      const x = rng.range(60, width - 60);
      const y = rng.range(band.min + 20, band.max - 20);

      objects.push({
        id: `bmp_${i + 1}`,
        type: 'bumper',
        x,
        y,
        radius: 20,
        bounceForce: 650,
        points: 30,
      });
    }

    // --- 6. GLOBOS / BALLOONS (8-15) (globos.png) ---
    const balloonColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#ec4899'];
    const balloonCount = rng.rangeInt(9, 14);
    for (let i = 0; i < balloonCount; i++) {
      const band = rng.choice(yBands);
      const x = rng.range(70, width - 70);
      const y = rng.range(band.min + 10, band.max - 10);
      const isMoving = rng.next() > 0.4;

      objects.push({
        id: `bal_${i + 1}`,
        type: 'balloon',
        x,
        y,
        radius: 18,
        color: rng.choice(balloonColors),
        popped: false,
        floatOffset: 0,
        motionType: isMoving ? 'patrol_h' : 'static',
        moveRange: isMoving ? rng.rangeInt(30, 50) : 0,
        moveSpeed: rng.range(0.8, 1.4),
      });
    }

    // --- 7. FLECHAS TURBO / SPEED ARROWS (4-8) (flechas.png) ---
    const arrowCount = rng.rangeInt(5, 8);
    for (let i = 0; i < arrowCount; i++) {
      const band = rng.choice(yBands);
      const x = rng.range(80, width - 80);
      const y = rng.range(band.min + 30, band.max - 30);
      const isRight = x < width / 2;
      const angle = isRight ? 0.35 : -0.35;

      objects.push({
        id: `arr_${i + 1}`,
        type: 'arrow',
        x,
        y,
        width: 40,
        height: 36,
        forceX: isRight ? 280 : -280,
        forceY: 200,
        angle,
      });
    }

    // --- 8. ACEITE / OIL SLICKS (3-6) (aceite.png) ---
    const oilCount = rng.rangeInt(4, 6);
    for (let i = 0; i < oilCount; i++) {
      const band = rng.choice(yBands);
      const x = rng.range(90, width - 90);
      const y = rng.range(band.min + 20, band.max - 20);

      objects.push({
        id: `oil_${i + 1}`,
        type: 'oil',
        x,
        y,
        width: 95,
        height: 14,
        boostFactor: 1.45,
      });
    }

    // --- 9. PIPES / TUBERÍAS (3-6) (tuberias_dianas_bombas.png Row 0) ---
    const pipeCount = rng.rangeInt(3, 5);
    for (let i = 0; i < pipeCount; i++) {
      const band = yBands[(i * 2) % yBands.length];
      const isLeftToRight = i % 2 === 0;
      const x1 = isLeftToRight ? 50 : width - 50;
      const x2 = isLeftToRight ? 180 : width - 180;
      const y1 = rng.range(band.min + 40, band.max - 60);
      const y2 = y1 + 60;

      objects.push({
        id: `pipe_${i + 1}`,
        type: 'pipe',
        x: x1,
        y: y1,
        x2: x2,
        y2: y2,
        radius: 14,
        boostSpeed: 75,
      } as any);
    }

    // --- 10. TARGETS / DIANAS (3-6) (tuberias_dianas_bombas.png Row 1) ---
    const targetCount = rng.rangeInt(4, 6);
    for (let i = 0; i < targetCount; i++) {
      const band = rng.choice(yBands);
      const x = rng.range(70, width - 70);
      const y = rng.range(band.min + 30, band.max - 30);

      objects.push({
        id: `target_${i + 1}`,
        type: 'target',
        x,
        y,
        radius: 18,
        points: 100,
        hit: false,
        isSpecial: i % 2 === 0,
      } as any);
    }

    // --- 11. BOMBS / HAZARDS (2-4) (tuberias_dianas_bombas.png Row 1 Col 4) ---
    const bombCount = rng.rangeInt(2, 4);
    for (let i = 0; i < bombCount; i++) {
      const band = yBands[(i * 2 + 1) % yBands.length];
      const x = rng.range(100, width - 100);
      const y = rng.range(band.min + 50, band.max - 50);

      objects.push({
        id: `bomb_${i + 1}`,
        type: 'bomb',
        x,
        y,
        radius: 16,
      } as any);
    }

    // --- 12. RESTORING EXOTIC MECÁNICAS (Fase 5 RESTORE: fan, lever, moving_bar, magnet) ---
    // Moving bars
    for (let i = 0; i < 2; i++) {
      const band = yBands[i + 1];
      const x = rng.range(120, width - 120);
      const y = rng.range(band.min + 15, band.max - 15);
      objects.push({
        id: `mbar_${i + 1}`,
        type: 'moving_bar',
        x,
        y,
        length: 80,
        thickness: 12,
        pivotType: 'center',
        motionType: 'patrol_h',
        baseX: x,
        baseY: y,
        moveRange: 55,
        moveSpeed: 1.1,
      } as any);
    }

    // Levers
    for (let i = 0; i < 2; i++) {
      const band = yBands[i + 3];
      const x = rng.range(80, width - 150);
      const y = rng.range(band.min + 20, band.max - 20);
      objects.push({
        id: `lever_${i + 1}`,
        type: 'lever',
        x,
        y,
        length: 75,
        thickness: 12,
        pivotType: 'left',
        motionType: 'lever',
        baseAngle: 0.3,
        maxAngle: -0.3,
        triggeredAngle: -0.3,
        isTriggered: false,
      } as any);
    }

    // Fans (pointing horizontally to push the ball)
    for (let i = 0; i < 2; i++) {
      const band = yBands[i + 2];
      const isLeft = i % 2 === 0;
      const x = isLeft ? 50 : width - 50;
      const y = rng.range(band.min + 30, band.max - 30);
      objects.push({
        id: `fan_${i + 1}`,
        type: 'fan',
        x,
        y,
        width: 44,
        height: 44,
        forceX: isLeft ? 380 : -380,
        forceY: 0,
        range: 180,
        bladeAngle: 0,
      } as any);
    }

    // Magnets
    for (let i = 0; i < 2; i++) {
      const band = yBands[i + 1];
      const x = rng.range(100, width - 100);
      const y = rng.range(band.min + 10, band.max - 10);
      objects.push({
        id: `magnet_${i + 1}`,
        type: 'magnet',
        x,
        y,
        radius: 35,
        strength: 5.5,
      } as any);
    }

    // --- 13. BOTTOM TIER: 7 PRIZE BOXES (cajas.png) ---
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

    // --- 14. REAL PATHFINDING CONNECTIVITY VALIDATION ---
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
