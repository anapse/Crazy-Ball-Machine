import { LevelConfig, MachineObject, TopChannel, BoxReward } from '../types/game';
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
    const boxCount = 7;
    const boxWidth = 52;
    const totalW = boxCount * boxWidth;
    const startX = (GAME_CONSTANTS.WORLD_WIDTH - totalW) / 2 + boxWidth / 2;
    const y = GAME_CONSTANTS.BOTTOM_BOX_Y;

    const boxes: MachineObject[] = [];
    for (let i = 0; i < boxCount; i++) {
      boxes.push({
        id: `box_${i}`,
        type: 'box',
        x: startX + i * boxWidth,
        y,
        width: boxWidth - 4,
        height: 50,
        boxIndex: i,
        reward: rewards[i % rewards.length],
        opened: false,
        points: GAME_CONSTANTS.POINTS_BOX,
      });
    }
    return boxes;
  }

  public static getLevel(levelNumber: number): LevelConfig {
    const channels = this.getChannels();
    const width = GAME_CONSTANTS.WORLD_WIDTH;
    const height = GAME_CONSTANTS.WORLD_HEIGHT;

    switch (levelNumber) {
      case 1:
        return {
          levelNumber: 1,
          title: 'La Gran Máquina Extendida',
          worldWidth: width,
          worldHeight: height,
          startingBalls: 6,
          goal: {
            type: 'destroy_count',
            target: 14,
            current: 0,
            description: 'Destruye 14 bloques u objetivos',
          },
          channels,
          objects: [
            // --- TIER 1: UPPER ENTRY (Y = 190 .. 450) ---
            // Wide side guide ramps (Open center gap > 120px)
            { id: 'r_top1', type: 'ramp', x: 20, y: 195, x2: 160, y2: 240, thickness: 12 },
            { id: 'r_top2', type: 'ramp', x: 430, y: 195, x2: 290, y2: 240, thickness: 12 },

            // Staggered Colored Blocks Row 1
            { id: 'b_1', type: 'breakable_block', x: 100, y: 280, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'rojo' },
            { id: 'b_2', type: 'breakable_block', x: 225, y: 270, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'azul' },
            { id: 'b_3', type: 'breakable_block', x: 350, y: 280, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'verde' },

            // Top Pipe Transport (Left to Center)
            { id: 'p_top1', type: 'pipe', x: 50, y: 350, x2: 170, y2: 410, radius: 13, boostSpeed: 65 },

            // Type C: Oscillating Flap with left pivot (TIPO C)
            {
              id: 'bar_osc1',
              type: 'moving_bar',
              x: 230,
              y: 380,
              length: 85,
              thickness: 12,
              pivotType: 'left',
              motionType: 'oscillate',
              baseAngle: 0.1,
              maxAngle: 0.45,
              angularSpeed: 1.4,
            },

            // Balloons
            { id: 'bal_1', type: 'balloon', x: 110, y: 440, radius: 18, color: '#ef4444', popped: false, floatOffset: 0 },
            { id: 'bal_2', type: 'balloon', x: 340, y: 440, radius: 18, color: '#3b82f6', popped: false, floatOffset: 1 },

            // --- TIER 2: MID MECHANICS (Y = 480 .. 850) ---
            { id: 'r_mid1', type: 'ramp', x: 40, y: 510, x2: 240, y2: 570, thickness: 12 },
            { id: 'oil_1', type: 'oil', x: 130, y: 545, width: 90, height: 14, boostFactor: 1.4 },

            // Springboard on right
            { id: 'tramp_1', type: 'trampoline', x: 380, y: 550, width: 46, height: 16, angle: -0.25, bounceForce: 600, animTimer: 0 },

            // Staggered Colored Blocks Row 2 (Yellow, Purple & Orange high-value)
            { id: 'b_4', type: 'breakable_block', x: 120, y: 630, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'amarillo' },
            { id: 'b_5', type: 'breakable_block', x: 225, y: 620, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'morado' },
            { id: 'b_6', type: 'breakable_block', x: 330, y: 630, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'naranja' },

            // Pipe 2 (Right to Center)
            { id: 'p_mid2', type: 'pipe', x: 390, y: 700, x2: 260, y2: 760, radius: 13, boostSpeed: 70 },

            // Type D: Hit-reactive swinging gate with center pivot
            {
              id: 'bar_react1',
              type: 'moving_bar',
              x: 170,
              y: 730,
              length: 80,
              thickness: 12,
              pivotType: 'center',
              motionType: 'hit_reactive',
              baseAngle: 0.2,
            },

            // Rotating Gear
            { id: 'gear_1', type: 'gear', x: 225, y: 830, radius: 36, teeth: 8, speed: 0.9 },

            // --- TIER 3: DEEP MACHINE CHUTE (Y = 880 .. 1350) ---
            { id: 't_1', type: 'target', x: 90, y: 890, radius: 18, points: 60, hit: false },
            { id: 't_2', type: 'target', x: 360, y: 890, radius: 18, points: 60, hit: false },

            // Bomb hazard with side clearance
            { id: 'bomb_1', type: 'bomb', x: 225, y: 940, radius: 18, exploded: false },

            // Pipe 3 (Center Downward Transport)
            { id: 'p_deep1', type: 'pipe', x: 80, y: 1000, x2: 200, y2: 1070, radius: 13, boostSpeed: 75 },

            // Staggered Colored Blocks Row 3 (Pink & Purple)
            { id: 'b_7', type: 'breakable_block', x: 140, y: 1120, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'rosa' },
            { id: 'b_8', type: 'breakable_block', x: 310, y: 1120, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'morado' },

            // Type E: Horizontal moving patrol platform
            {
              id: 'bar_patrol_h',
              type: 'moving_bar',
              x: 225,
              y: 1200,
              length: 85,
              thickness: 12,
              pivotType: 'center',
              motionType: 'patrol_h',
              baseX: 225,
              moveRange: 65,
              moveSpeed: 1.2,
            },

            // --- TIER 4: LOWER MACHINE & CANNON ZONE (Y = 1380 .. 1800) ---
            { id: 'r_deep1', type: 'ramp', x: 30, y: 1300, x2: 190, y2: 1360, thickness: 12 },
            { id: 'r_deep2', type: 'ramp', x: 420, y: 1300, x2: 260, y2: 1360, thickness: 12 },

            // Fan blowing left-center
            { id: 'fan_1', type: 'fan', x: 405, y: 1420, width: 44, height: 44, forceX: -360, forceY: 0, range: 200, bladeAngle: 0 },

            // Staggered Colored Blocks Row 4
            { id: 'b_9', type: 'breakable_block', x: 100, y: 1480, width: 44, height: 26, health: 1, maxHealth: 1, blockColor: 'verde' },
            { id: 'b_10', type: 'breakable_block', x: 225, y: 1470, width: 44, height: 26, health: 1, maxHealth: 1, blockColor: 'naranja' },
            { id: 'b_11', type: 'breakable_block', x: 350, y: 1480, width: 44, height: 26, health: 1, maxHealth: 1, blockColor: 'rosa' },

            // Pipe 4
            { id: 'p_deep2', type: 'pipe', x: 260, y: 1550, x2: 380, y2: 1610, radius: 13, boostSpeed: 70 },

            // Type F: Vertical elevator bar
            {
              id: 'bar_patrol_v',
              type: 'moving_bar',
              x: 160,
              y: 1640,
              length: 70,
              thickness: 12,
              pivotType: 'center',
              motionType: 'patrol_v',
              baseY: 1640,
              moveRange: 35,
              moveSpeed: 1.1,
            },

            // --- TIER 5: BOTTOM TARGETS & LOSS HOLE (Y = 1820 .. 2200) ---
            { id: 'r_bottom1', type: 'ramp', x: 30, y: 1780, x2: 180, y2: 1840, thickness: 12 },
            { id: 'r_bottom2', type: 'ramp', x: 420, y: 1780, x2: 270, y2: 1840, thickness: 12 },

            // Staggered Open Bottom Blocks & Targets
            { id: 'b_b1', type: 'breakable_block', x: 120, y: 1890, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'azul' },
            { id: 'b_b2', type: 'breakable_block', x: 330, y: 1890, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'amarillo' },

            { id: 't_mid', type: 'target', x: 225, y: 1940, radius: 18, points: 100, hit: false, isSpecial: true },

            { id: 'b_b3', type: 'breakable_block', x: 160, y: 1980, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'rojo' },
            { id: 'b_b4', type: 'breakable_block', x: 290, y: 1980, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'rosa' },

            // 7 Bottom Mystery Boxes
            ...this.createBottomBoxes([
              'ball_1',
              'power_explosive',
              'points_500',
              'power_double',
              'ball_2',
              'power_fast',
              'ball_1',
            ]),
          ],
        };

      case 2:
      default:
        return {
          levelNumber: Math.max(2, levelNumber),
          title: `Feria Extrema (Nivel ${levelNumber})`,
          worldWidth: width,
          worldHeight: height,
          startingBalls: 7,
          goal: {
            type: 'destroy_count',
            target: 16,
            current: 0,
            description: 'Destruye 16 bloques u objetivos',
          },
          channels,
          objects: [
            // Upper zone
            { id: 'fan_1', type: 'fan', x: 50, y: 220, width: 44, height: 44, forceX: 380, forceY: 0, range: 220, bladeAngle: 0 },
            { id: 'r_top1', type: 'ramp', x: 420, y: 210, x2: 240, y2: 270, thickness: 12 },

            // Pipe 1
            { id: 'p_1', type: 'pipe', x: 180, y: 310, x2: 320, y2: 370, radius: 13, boostSpeed: 70 },

            // Colored blocks
            { id: 'b_1', type: 'breakable_block', x: 110, y: 320, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'rojo' },
            { id: 'b_2', type: 'breakable_block', x: 340, y: 320, width: 42, height: 26, health: 2, maxHealth: 2, blockColor: 'morado' },

            // Lever
            {
              id: 'lever_1',
              type: 'lever',
              x: 160,
              y: 430,
              length: 85,
              thickness: 12,
              pivotType: 'right',
              motionType: 'lever',
              baseAngle: 0.35,
              maxAngle: -0.4,
              triggeredAngle: -0.4,
              isTriggered: false,
            },

            // Pipe 2
            { id: 'p_2', type: 'pipe', x: 60, y: 520, x2: 180, y2: 580, radius: 13, boostSpeed: 65 },

            // Moving bar patrol
            {
              id: 'bar_patrol_h',
              type: 'moving_bar',
              x: 225,
              y: 620,
              length: 80,
              thickness: 12,
              pivotType: 'center',
              motionType: 'patrol_h',
              baseX: 225,
              moveRange: 60,
              moveSpeed: 1.2,
            },

            // Colored blocks mid
            { id: 'b_3', type: 'breakable_block', x: 130, y: 710, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'amarillo' },
            { id: 'b_4', type: 'breakable_block', x: 225, y: 700, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'naranja' },
            { id: 'b_5', type: 'breakable_block', x: 320, y: 710, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'rosa' },

            // Trampolines
            { id: 'tramp_1', type: 'trampoline', x: 60, y: 800, width: 46, height: 16, angle: 0.3, bounceForce: 620, animTimer: 0 },
            { id: 'tramp_2', type: 'trampoline', x: 390, y: 800, width: 46, height: 16, angle: -0.3, bounceForce: 620, animTimer: 0 },

            // Pipe 3 deep
            { id: 'p_3', type: 'pipe', x: 380, y: 890, x2: 250, y2: 950, radius: 13, boostSpeed: 75 },

            // Elevator bar
            {
              id: 'bar_patrol_v',
              type: 'moving_bar',
              x: 225,
              y: 1040,
              length: 70,
              thickness: 12,
              pivotType: 'center',
              motionType: 'patrol_v',
              baseY: 1040,
              moveRange: 35,
              moveSpeed: 1.1,
            },

            // Deep colored blocks
            { id: 'b_6', type: 'breakable_block', x: 120, y: 1140, width: 44, height: 26, health: 1, maxHealth: 1, blockColor: 'verde' },
            { id: 'b_7', type: 'breakable_block', x: 330, y: 1140, width: 44, height: 26, health: 1, maxHealth: 1, blockColor: 'azul' },

            // Gears
            { id: 'gear_1', type: 'gear', x: 225, y: 1240, radius: 36, teeth: 8, speed: 1.1 },

            // Lower ramps
            { id: 'r_3', type: 'ramp', x: 30, y: 1350, x2: 180, y2: 1410, thickness: 12 },
            { id: 'r_4', type: 'ramp', x: 420, y: 1350, x2: 270, y2: 1410, thickness: 12 },

            // Bombs
            { id: 'bomb_1', type: 'bomb', x: 130, y: 1490, radius: 18, exploded: false },
            { id: 'bomb_2', type: 'bomb', x: 320, y: 1490, radius: 18, exploded: false },

            // Pipe 4
            { id: 'p_4', type: 'pipe', x: 100, y: 1580, x2: 220, y2: 1640, radius: 13, boostSpeed: 70 },

            // Deep blocks
            { id: 'b_8', type: 'breakable_block', x: 150, y: 1720, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'morado' },
            { id: 'b_9', type: 'breakable_block', x: 300, y: 1720, width: 44, height: 26, health: 2, maxHealth: 2, blockColor: 'rosa' },

            // Staggered Open Bottom Layout
            { id: 'b_b1', type: 'breakable_block', x: 130, y: 1880, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'verde' },
            { id: 'b_b2', type: 'breakable_block', x: 320, y: 1880, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'azul' },

            { id: 't_mid', type: 'target', x: 225, y: 1930, radius: 18, points: 100, hit: false, isSpecial: true },

            { id: 'b_b3', type: 'breakable_block', x: 170, y: 1980, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'amarillo' },
            { id: 'b_b4', type: 'breakable_block', x: 280, y: 1980, width: 42, height: 26, health: 1, maxHealth: 1, blockColor: 'rosa' },

            // 7 Boxes
            ...this.createBottomBoxes([
              'power_triple',
              'ball_2',
              'power_shield',
              'points_500',
              'power_explosive',
              'ball_3',
              'power_fast',
            ]),
          ],
        };
    }
  }
}
