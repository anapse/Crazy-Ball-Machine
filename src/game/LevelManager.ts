import { LevelConfig, MachineObject, TopChannel, BoxReward, BlockColor } from '../types/game';
import { GAME_CONSTANTS } from './constants';

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

    // Fully accessible open formation: 3 top, 2 middle, 2 bottom
    // NO diagonal ramps above them!
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
    const channels = this.getChannels();
    const width = GAME_CONSTANTS.WORLD_WIDTH;
    const height = GAME_CONSTANTS.WORLD_HEIGHT;

    // Helper to generate 80+ breakable blocks in small clusters of 3-5
    const objects: MachineObject[] = [];

    let blockIdCounter = 1;
    const addBlockCluster = (startX: number, startY: number, count: number, color: BlockColor, hp: number) => {
      for (let i = 0; i < count; i++) {
        objects.push({
          id: `blk_${blockIdCounter++}`,
          type: 'breakable_block',
          x: startX + i * 46,
          y: startY,
          width: 42,
          height: 25,
          health: hp,
          maxHealth: hp,
          blockColor: color,
        });
      }
    };

    // --- 80 BREAKABLE BLOCKS IN SMALL CLUSTERS ---
    // Section 1: Upper Clusters (Y: 260 .. 500)
    addBlockCluster(80, 260, 3, 'rojo', 1);
    addBlockCluster(280, 260, 3, 'azul', 1);
    addBlockCluster(130, 340, 4, 'verde', 2);
    addBlockCluster(90, 430, 3, 'amarillo', 2);
    addBlockCluster(270, 430, 3, 'rojo', 1);

    // Section 2: Mid Upper Clusters (Y: 550 .. 900)
    addBlockCluster(110, 580, 4, 'naranja', 2);
    addBlockCluster(290, 580, 3, 'morado', 3);
    addBlockCluster(80, 710, 3, 'azul', 1);
    addBlockCluster(270, 710, 3, 'rosa', 3);
    addBlockCluster(130, 840, 3, 'amarillo', 2);

    // Section 3: Center Clusters (Y: 980 .. 1400)
    addBlockCluster(80, 1010, 3, 'verde', 2);
    addBlockCluster(280, 1010, 3, 'naranja', 2);
    addBlockCluster(120, 1150, 4, 'morado', 3);
    addBlockCluster(90, 1280, 3, 'rojo', 1);
    addBlockCluster(270, 1280, 3, 'rosa', 3);

    // Section 4: Deep Clusters (Y: 1480 .. 1950)
    addBlockCluster(110, 1510, 4, 'amarillo', 2);
    addBlockCluster(290, 1510, 3, 'azul', 1);
    addBlockCluster(80, 1680, 3, 'naranja', 2);
    addBlockCluster(270, 1680, 3, 'verde', 2);
    addBlockCluster(130, 1850, 3, 'rosa', 3);

    // Section 5: Pre-Bottom Clusters (Y: 2020 .. 2380)
    addBlockCluster(90, 2050, 3, 'morado', 3);
    addBlockCluster(280, 2050, 3, 'rojo', 1);
    addBlockCluster(120, 2210, 4, 'amarillo', 2);
    addBlockCluster(80, 2350, 3, 'verde', 2);

    // --- PHYSICAL MACHINE MECHANICS & OPEN NON-FUNNEL DEVICES ---
    // ABSOLUTELY NO DIAGONAL INWARD FUNNEL RAMPS (\ /)!
    const mechanics: MachineObject[] = [
      // Tier 1 (Y: 190 .. 500)
      { id: 'wm_1', type: 'windmill', x: 225, y: 310, arms: 4, armLength: 40, thickness: 10, rotationSpeed: 1.4 },
      { id: 'p_1', type: 'pipe', x: 50, y: 390, x2: 170, y2: 450, radius: 13, boostSpeed: 70 },
      { id: 'bmp_1', type: 'bumper', x: 380, y: 470, radius: 20, bounceForce: 650, points: 30 },

      // Tier 2 (Y: 520 .. 950)
      { id: 'arr_1', type: 'arrow', x: 225, y: 530, width: 40, height: 36, forceX: 300, forceY: 200, angle: 0.3 },
      { id: 'oil_1', type: 'oil', x: 120, y: 640, width: 100, height: 14, boostFactor: 1.45 },
      { id: 'bmp_2', type: 'bumper', x: 320, y: 640, radius: 20, bounceForce: 650, points: 30 },
      { id: 'bal_1', type: 'balloon', x: 225, y: 770, radius: 18, color: '#ef4444', popped: false, floatOffset: 0, motionType: 'patrol_h', moveRange: 45 },
      { id: 'tramp_1', type: 'trampoline', x: 380, y: 890, width: 46, height: 16, angle: -0.25, bounceForce: 620, animTimer: 0 },
      { id: 'gear_1', type: 'gear', x: 100, y: 910, radius: 36, teeth: 8, speed: 1.1 },

      // Tier 3 (Y: 980 .. 1450)
      { id: 'p_2', type: 'pipe', x: 390, y: 1070, x2: 250, y2: 1130, radius: 13, boostSpeed: 75 },
      { id: 'lever_1', type: 'lever', x: 160, y: 1200, length: 85, thickness: 12, pivotType: 'right', motionType: 'lever', baseAngle: 0.35, maxAngle: -0.4, triggeredAngle: -0.4, isTriggered: false },
      { id: 'wm_2', type: 'windmill', x: 310, y: 1340, arms: 4, armLength: 42, thickness: 10, rotationSpeed: -1.4 },
      { id: 'fan_1', type: 'fan', x: 405, y: 1420, width: 44, height: 44, forceX: -360, forceY: 0, range: 200, bladeAngle: 0 },

      // Tier 4 (Y: 1480 .. 1950)
      { id: 'bar_patrol_h', type: 'moving_bar', x: 180, y: 1580, length: 85, thickness: 12, pivotType: 'center', motionType: 'patrol_h', baseX: 180, moveRange: 60, moveSpeed: 1.2 },
      { id: 'bmp_3', type: 'bumper', x: 225, y: 1740, radius: 22, bounceForce: 660, points: 30 },
      { id: 'p_3', type: 'pipe', x: 80, y: 1800, x2: 210, y2: 1860, radius: 13, boostSpeed: 75 },
      { id: 'bar_patrol_v', type: 'moving_bar', x: 320, y: 1910, length: 70, thickness: 12, pivotType: 'center', motionType: 'patrol_v', baseY: 1910, moveRange: 35, moveSpeed: 1.1 },

      // Tier 5 (Y: 1980 .. 2450)
      { id: 'arr_2', type: 'arrow', x: 180, y: 2120, width: 40, height: 36, forceX: -260, forceY: 220, angle: -0.4 },
      { id: 'p_4', type: 'pipe', x: 370, y: 2270, x2: 240, y2: 2330, radius: 13, boostSpeed: 70 },
      { id: 'gear_2', type: 'gear', x: 160, y: 2410, radius: 36, teeth: 8, speed: -1.2 },

      // Tier 6: Fully Open & Bouncy Lower Chamber (Y: 2450 .. 2800)
      // ZERO DIAGONAL FUNNEL RAMPS HERE! Outer pinball bumpers allow complete lateral freedom!
      { id: 'bmp_bot_left', type: 'bumper', x: 45, y: 2460, radius: 20, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_right', type: 'bumper', x: 405, y: 2460, radius: 20, bounceForce: 650, points: 30 },
      { id: 'bmp_bot_center', type: 'bumper', x: 225, y: 2430, radius: 20, bounceForce: 640, points: 30 },
      { id: 't_mid', type: 'target', x: 225, y: 2600, radius: 18, points: 100, hit: false, isSpecial: true },

      // 7 Bottom Mystery Boxes - 100% Accessible!
      ...this.createBottomBoxes([
        'ball_1',
        'power_explosive',
        'points_500',
        'power_double',
        'ball_2',
        'power_fast',
        'ball_1',
      ]),
    ];

    return {
      levelNumber,
      title: 'Máquina Pinball: Las 7 Cajas',
      worldWidth: width,
      worldHeight: height,
      startingBalls: 8,
      goal: {
        type: 'destroy_count',
        target: 7, // 7/7 Boxes destroyed = Victory!
        current: 0,
        description: 'Destruye las 7 cajas de la máquina',
      },
      channels,
      objects: [...objects, ...mechanics],
    };
  }
}
