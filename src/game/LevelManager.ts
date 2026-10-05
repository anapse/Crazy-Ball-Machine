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
    const startY = GAME_CONSTANTS.BOTTOM_BOX_Y;

    // Open, accessible tier formation: 3 top, 2 middle, 2 bottom
    const positions = [
      { x: 95, y: startY },
      { x: 225, y: startY },
      { x: 355, y: startY },
      { x: 160, y: startY + 65 },
      { x: 290, y: startY + 65 },
      { x: 105, y: startY + 130 },
      { x: 345, y: startY + 130 },
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
    while (!config && attempts < 20) {
      config = this.generateLevelAttempt(levelNumber, seed + attempts);
      attempts++;
    }

    return config!;
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
      const clusterCount = rng.rangeInt(2, 3);
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
      const angle = (isLeft ? 0.3 : -0.3) + rng.range(-0.1, 0.1);

      // Single plank per tier or offset planks to prevent funnels
      const x1 = isLeft ? 60 : width - 180;
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
      const angle = rng.choice([0, 0.25, -0.25]);

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

    // --- 12. BOTTOM TIER: 7 PRIZE BOXES (cajas.png) ---
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
      { id: 'bmp_bot_left', type: 'bumper', x: 45, y: 2460, radius: 20, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_right', type: 'bumper', x: 405, y: 2460, radius: 20, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_center', type: 'bumper', x: 225, y: 2430, radius: 20, bounceForce: 640, points: 30 },
    ];

    const allObjects = [...objects, ...bottomBumpers, ...bottomBoxes];

    // --- 13. BOTTLENECK & PASSAGEWAY VALIDATION ENGINE ---
    // Validate that every 100px Y band from Y = 250 to Y = 2450 has a clear passageway > 50px
    let validPassage = true;
    for (let checkY = 250; checkY <= 2400; checkY += 80) {
      // Find objects overlapping this Y band
      const blockers = allObjects.filter((o) => {
        if (o.type === 'box' || o.type === 'balloon' || o.type === 'oil') return false;
        return Math.abs(o.y - checkY) < 30;
      });

      // Sort blockers horizontally
      blockers.sort((a, b) => a.x - b.x);

      // Check max horizontal gap between consecutive blockers
      let maxGap = 0;
      let prevRight = 15; // Left wall boundary
      for (const b of blockers) {
        const objW = (b as any).width || ((b as any).radius ? (b as any).radius * 2 : 40);
        const left = b.x - objW / 2;
        const gap = left - prevRight;
        if (gap > maxGap) maxGap = gap;
        const right = b.x + objW / 2;
        if (right > prevRight) prevRight = right;
      }
      const finalGap = (width - 15) - prevRight;
      if (finalGap > maxGap) maxGap = finalGap;

      // If max gap is too narrow (< 48px), ball cannot descend -> invalidate layout!
      if (maxGap < 48) {
        validPassage = false;
        break;
      }
    }

    if (!validPassage) return null; // Reject layout & trigger retry with next seed

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
