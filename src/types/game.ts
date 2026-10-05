export type BallType = 'standard' | 'double' | 'triple' | 'fast' | 'explosive' | 'shield';

export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: BallType;
  color: string;
  active: boolean;
  trail: { x: number; y: number; alpha: number }[];
  isImmune?: boolean;
  hasExploded?: boolean;
  boostedByOil?: boolean;
  boostedByArrow?: boolean;
}

export type PhysicalObjectType =
  | 'breakable_block'
  | 'ramp'
  | 'pipe'
  | 'bumper'
  | 'windmill'
  | 'arrow'
  | 'trampoline'
  | 'fan'
  | 'oil'
  | 'bomb'
  | 'balloon'
  | 'gear'
  | 'magnet'
  | 'target'
  | 'box'
  | 'lever'
  | 'moving_bar';

export type ObstacleMotionType =
  | 'static'
  | 'continuous_spin'
  | 'oscillate'
  | 'hit_reactive'
  | 'patrol_h'
  | 'patrol_v'
  | 'lever';

export type BoxReward =
  | 'ball_1'
  | 'ball_2'
  | 'ball_3'
  | 'power_double'
  | 'power_triple'
  | 'power_fast'
  | 'power_explosive'
  | 'power_shield'
  | 'points_500'
  | 'empty';

export interface BaseObject {
  id: string;
  type: PhysicalObjectType;
  x: number;
  y: number;
  destroyed?: boolean;
  points?: number;

  // Dynamic Motion & Pivot Point properties
  motionType?: ObstacleMotionType;
  pivotType?: 'left' | 'center' | 'right';
  pivotX?: number;
  pivotY?: number;
  angle?: number;
  baseAngle?: number;
  minAngle?: number;
  maxAngle?: number;
  angularSpeed?: number;
  moveSpeed?: number;
  moveRange?: number;
  baseX?: number;
  baseY?: number;
  hitTimer?: number;
  leverActivated?: boolean;
}

export type BlockColor = 'rojo' | 'azul' | 'verde' | 'amarillo' | 'morado' | 'naranja' | 'rosa';

export interface BreakableBlock extends BaseObject {
  type: 'breakable_block';
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  blockColor?: BlockColor;
  colorTheme?: string;
}

export interface PipeChute extends BaseObject {
  type: 'pipe';
  x2: number;
  y2: number;
  radius: number;
  color?: string;
  boostSpeed?: number;
}

export interface PinballBumper extends BaseObject {
  type: 'bumper';
  radius: number;
  bounceForce: number;
  points: number;
  hitTimer?: number;
}

export interface WindmillPropeller extends BaseObject {
  type: 'windmill';
  arms: number;
  armLength: number;
  thickness: number;
  rotationSpeed: number;
}

export interface DirectionArrow extends BaseObject {
  type: 'arrow';
  width: number;
  height: number;
  forceX: number;
  forceY: number;
  angle: number;
}

export interface Ramp extends BaseObject {
  type: 'ramp';
  x2: number;
  y2: number;
  thickness: number;
  curved?: boolean;
  cpX?: number;
  cpY?: number;
  color?: string;
  speedBoost?: number;
  origX1?: number;
  origY1?: number;
  origX2?: number;
  origY2?: number;
}

export interface MovingBar extends BaseObject {
  type: 'moving_bar';
  length: number;
  thickness: number;
  pivotType?: 'left' | 'center' | 'right';
  x2?: number;
  y2?: number;
}

export interface LeverObstacle extends BaseObject {
  type: 'lever';
  length: number;
  thickness: number;
  pivotType?: 'left' | 'center' | 'right';
  triggeredAngle: number;
  isTriggered: boolean;
  x2?: number;
  y2?: number;
}

export interface Trampoline extends BaseObject {
  type: 'trampoline';
  width: number;
  height: number;
  bounceForce: number;
  animTimer: number;
}

export interface Fan extends BaseObject {
  type: 'fan';
  width: number;
  height: number;
  forceX: number;
  forceY: number;
  range: number;
  bladeAngle: number;
}

export interface OilSlick extends BaseObject {
  type: 'oil';
  width: number;
  height: number;
  boostFactor: number;
}

export interface BombHazard extends BaseObject {
  type: 'bomb';
  radius: number;
  exploded: boolean;
  fuseTimer?: number;
}

export interface Balloon extends BaseObject {
  type: 'balloon';
  radius: number;
  color: string;
  popped: boolean;
  floatOffset: number;
}

export interface Gear extends BaseObject {
  type: 'gear';
  radius: number;
  teeth: number;
  speed: number;
}

export interface Magnet extends BaseObject {
  type: 'magnet';
  radius: number;
  strength: number;
}

export interface TargetCan extends BaseObject {
  type: 'target';
  radius: number;
  points: number;
  isSpecial?: boolean;
  hit: boolean;
  symbol?: string;
}

export interface PrizeBox extends BaseObject {
  type: 'box';
  width: number;
  height: number;
  reward: BoxReward;
  opened: boolean;
  boxIndex: number;
  label?: string;
}

export type MachineObject =
  | BreakableBlock
  | Ramp
  | PipeChute
  | PinballBumper
  | WindmillPropeller
  | DirectionArrow
  | MovingBar
  | LeverObstacle
  | Trampoline
  | Fan
  | OilSlick
  | BombHazard
  | Balloon
  | Gear
  | Magnet
  | TargetCan
  | PrizeBox;

export interface TopChannel {
  index: number;
  x: number;
  y: number;
  width: number;
  color: string;
  name: string;
}

export interface LevelGoal {
  type: 'destroy_count' | 'score' | 'destroy_targets';
  target: number;
  current: number;
  description: string;
}

export interface LevelConfig {
  levelNumber: number;
  title: string;
  worldWidth: number;
  worldHeight: number;
  startingBalls: number;
  goal: LevelGoal;
  channels: TopChannel[];
  objects: MachineObject[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'smoke' | 'wood_chip' | 'gear_tooth';
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
  scale: number;
}

export type GameStatePhase =
  | 'MENU'
  | 'AIMING'
  | 'DROPPING'
  | 'OBSERVING_RESULT'
  | 'CAMERA_RETURN'
  | 'LEVEL_COMPLETE'
  | 'GAME_OVER'
  | 'PAUSED';

export interface PowerUpInventory {
  double: number;
  triple: number;
  fast: number;
  explosive: number;
  shield: number;
}

export interface GameSnapshot {
  phase: GameStatePhase;
  levelNumber: number;
  score: number;
  ballsLeft: number;
  goalProgress: number;
  goalTarget: number;
  goalDescription: string;
  combo: number;
  selectedChannelIndex: number;
  activePowerUp: BallType | null;
  inventory: PowerUpInventory;
  objectsDestroyedCount: number;
  totalBallsUsed: number;
  isSoundMuted: boolean;
}

export interface LeaderboardEntry {
  id?: string;
  playerName: string;
  score: number;
  ballsUsed?: number;
  objectsDestroyed?: number;
  level?: number;
  maxCombo?: number;
  createdAt?: string | number | { seconds: number; nanoseconds: number };
}

export interface RecordHistoryItem {
  id?: string;
  playerName: string;
  oldScore: number;
  newScore: number;
  diff: number;
  date: string;
  time: string;
  timestamp?: number;
}

export interface AdminStats {
  visits: number;
  sessions: number;
  gamesStarted: number;
  gamesCompleted: number;
  recordScore: number;
  recordPlayer: string;
  totalObjectsDestroyed: number;
  totalBallsUsed: number;
}
