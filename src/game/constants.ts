export const BLOCK_COLOR_POINTS: Record<string, number> = {
  rojo: 10,
  azul: 25,
  verde: 40,
  amarillo: 60,
  naranja: 100,
  morado: 150,
  rosa: 250,
};

export const BLOCK_COLOR_STYLES: Record<string, { fill: string; stroke: string; light: string }> = {
  rojo: { fill: '#ef4444', stroke: '#fca5a5', light: '#fee2e2' },
  azul: { fill: '#3b82f6', stroke: '#93c5fd', light: '#dbeafe' },
  verde: { fill: '#10b981', stroke: '#6ee7b7', light: '#d1fae5' },
  amarillo: { fill: '#f59e0b', stroke: '#fde68a', light: '#fef3c7' },
  naranja: { fill: '#f97316', stroke: '#ffedd5', light: '#fff7ed' },
  morado: { fill: '#8b5cf6', stroke: '#c4b5fd', light: '#f3e8ff' },
  rosa: { fill: '#ec4899', stroke: '#fbcfe8', light: '#fdf2f8' },
};

export const GAME_CONSTANTS = {
  WORLD_WIDTH: 450,
  WORLD_HEIGHT: 2800, // Deep, long machine height
  VIEWPORT_WIDTH: 450,
  VIEWPORT_HEIGHT_GAMEPLAY: 720, // Exactly 90% of standard 800px vertical machine frame
  VIEWPORT_HEIGHT_MENU: 800,     // Full 100% height when in menu
  VIEWPORT_HEIGHT: 720,
  ASPECT_RATIO: 9 / 16,

  // Physics constants
  GRAVITY: 960,
  DEFAULT_BALL_RADIUS: 12.5,
  TERMINAL_VELOCITY: 1200,
  RESTITUTION: 0.782, // 0.68 * 1.15 (+15% bounce)
  FRICTION: 0.990,

  // Manual Emergency Tap Control
  TAP_COOLDOWN_SECONDS: 0.6,
  TAP_IMPULSE_RADIUS: 45,
  TAP_IMPULSE_FORCE: 400,

  // Single Bottom Exit Loss Gap
  LOSS_HOLE_X: 225,
  LOSS_HOLE_Y: 2720,
  LOSS_HOLE_RADIUS: 22,

  // Observation phase delay
  OBSERVATION_DELAY_SECONDS: 3.0,

  // Power-up multipliers
  FAST_BALL_SPEED_MULT: 1.5,
  EXPLOSION_FORCE: 550,
  EXPLOSION_RADIUS: 90,
  OIL_SPEED_MULTIPLIER: 1.4,
  TRAMPOLINE_POWER: 640,

  // Camera settings
  CAMERA_SMOOTH_FACTOR: 0.08,
  CAMERA_RETURN_SPEED: 0.07,
  CAMERA_LEAD_Y: 280,

  // Channel configuration
  CHANNEL_COUNT: 5,
  CHANNEL_Y: 150,
  CHANNEL_HEIGHT: 55,
  CHANNEL_COLORS: [
    { name: 'Rojo', hex: '#ef4444', border: '#991b1b', light: '#fca5a5' },
    { name: 'Azul', hex: '#3b82f6', border: '#1e40af', light: '#93c5fd' },
    { name: 'Verde', hex: '#10b981', border: '#065f46', light: '#6ee7b7' },
    { name: 'Amarillo', hex: '#f59e0b', border: '#92400e', light: '#fde68a' },
    { name: 'Morado', hex: '#8b5cf6', border: '#5b21b6', light: '#c4b5fd' },
  ],

  // Bottom Box positions (7 prize boxes at lower machine tier)
  BOTTOM_BOX_Y: 2620,
  BOTTOM_BOX_WIDTH: 52,
  BOTTOM_BOX_HEIGHT: 50,

  // Points
  POINTS_BLOCK: 20,
  POINTS_BUMPER: 30,
  POINTS_ARROW: 15,
  POINTS_TARGET: 100,
  POINTS_BALLOON: 30,
  POINTS_BOMB: 15,
  POINTS_BOX: 50,
  POINTS_CAN: 60,
};
