export type Vec2 = { x: number; y: number };

export type BalloonType = {
  layers: number; // 1-3 layers
  speed: number;
  color: number; // Phaser color
  points: number;
};

export type Enemy = {
  id: number;
  x: number;
  y: number;
  type: BalloonType;
  currentLayer: number; // decreases on hit
  speed: number;
};

export type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ttl: number;
  piercing?: boolean;
  explosive?: boolean;
};

export type OffensiveStats = {
  projectileDamage: number;
  fireRateMs: number;
  projectileSpeed: number;
  multiShot: number; // 1, 2, or 3
  extraShooters: number; // 0, 1, or 2 (left/right)
  piercing: boolean;
  explosive: boolean;
};

export type Upgrade = {
  id: string;
  name: string;
  description: string;
  apply: (stats: OffensiveStats) => OffensiveStats;
};

export type GameState = {
  player: Vec2 & { hp: number; maxHp: number; speed: number };
  score: number;
  currentStage: number;
  balloonsRemaining: number;
  isStageComplete: boolean;
  isGameOver: boolean;
  pendingUpgrades: Upgrade[] | null;
  enemies: Enemy[];
  projectiles: Projectile[];
  input: {
    left: boolean;
    right: boolean;
    firing: boolean;
    touchDirection: Vec2;
  };
  timers: {
    enemySpawnMs: number;
    fireCooldownMs: number;
  };
  events: {
    audio: string[];
    fx: string[];
  };
  ids: {
    enemy: number;
    projectile: number;
  };
};

const WORLD_W = 800;
const WORLD_H = 600;

export const BALLOON_TYPES: BalloonType[] = [
  { layers: 1, speed: 50, color: 0xff0000, points: 10 }, // Red
  { layers: 2, speed: 40, color: 0x00ff00, points: 20 }, // Green
  { layers: 3, speed: 30, color: 0x0000ff, points: 30 }, // Blue
  { layers: 1, speed: 80, color: 0xffff00, points: 15 }, // Yellow fast
  { layers: 4, speed: 25, color: 0xff00ff, points: 50 }, // Magenta tough
];

export function createInitialState(): GameState {
  return {
    player: { x: WORLD_W / 2, y: WORLD_H - 80, hp: 150, maxHp: 150, speed: 250 }, // Moved up from 570 to 520
    score: 0,
    currentStage: 1,
    balloonsRemaining: 10,
    isStageComplete: false,
    isGameOver: false,
    pendingUpgrades: null,
    enemies: [],
    projectiles: [],
    input: {
      left: false,
      right: false,
      firing: true,
      touchDirection: { x: 0, y: 0 },
    },
    timers: { enemySpawnMs: 0, fireCooldownMs: 0 },
    events: { audio: [], fx: [] },
    ids: { enemy: 1, projectile: 1 },
  };
}

export function getBaseOffense(): OffensiveStats {
  return {
    projectileDamage: 1,
    fireRateMs: 400, // Improved from 500ms (2.5 shots/sec vs 2 shots/sec)
    projectileSpeed: 350, // Slightly faster projectiles
    multiShot: 1,
    extraShooters: 0,
    piercing: false,
    explosive: false,
  };
}

export function getStageBalloons(stage: number): number {
  return Math.min(8, 4 + stage); // Stage 1: 5, Stage 2: 6, Stage 3: 7, Stage 4+: 8
}

export function getStageBalloonTypes(stage: number): BalloonType[] {
  const types = BALLOON_TYPES.slice(0, Math.min(stage, BALLOON_TYPES.length));
  return types;
}

export function spawnBalloon(stage: number): Enemy {
  const types = getStageBalloonTypes(stage);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    id: 0, // Set later
    x: Math.random() * WORLD_W,
    y: 60, // Spawn lower to reduce empty space (was 0)
    type,
    currentLayer: type.layers,
    speed: type.speed + (stage - 1) * 3, // More gradual speed increase: +3 per stage instead of +5
  };
}

export function createUpgrades(): Upgrade[] {
  const allUpgrades = [
    {
      id: 'damage',
      name: 'Stronger Shots',
      description: '+2 damage', // More impactful: +2 instead of +1
      apply: (s) => ({ ...s, projectileDamage: s.projectileDamage + 2 }),
    },
    {
      id: 'rate',
      name: 'Faster Fire',
      description: '-150ms fire rate', // More impactful: -150ms instead of -100ms
      apply: (s) => ({ ...s, fireRateMs: Math.max(100, s.fireRateMs - 150) }),
    },
    {
      id: 'multishot',
      name: 'Multi Shot',
      description: '+1 projectile per shot',
      apply: (s) => ({ ...s, multiShot: Math.min(3, s.multiShot + 1) }),
    },
    {
      id: 'extra_shooter',
      name: 'Extra Shooter',
      description: 'Add side shooter',
      apply: (s) => ({ ...s, extraShooters: Math.min(2, s.extraShooters + 1) }),
    },
    {
      id: 'piercing',
      name: 'Piercing Shots',
      description: 'Projectiles pierce balloons',
      apply: (s) => ({ ...s, piercing: true }),
    },
    {
      id: 'explosive',
      name: 'Explosive Shots',
      description: 'Splash damage',
      apply: (s) => ({ ...s, explosive: true }),
    },
    {
      id: 'health',
      name: 'Extra Health',
      description: '+20 max HP',
      apply: (s) => s, // Health handled separately in scene
    },
  ];

  // Shuffle and return 3 random upgrades
  const shuffled = [...allUpgrades].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function applyUpgrade(stats: OffensiveStats, upgradeId: string): OffensiveStats {
  const upgrade = createUpgrades().find(u => u.id === upgradeId);
  return upgrade ? upgrade.apply(stats) : stats;
}

export function startNextStage(state: GameState): GameState {
  const nextStage = state.currentStage + 1;
  return {
    ...state,
    currentStage: nextStage,
    balloonsRemaining: getStageBalloons(nextStage),
    isStageComplete: false,
    pendingUpgrades: null,
    enemies: [],
    projectiles: [],
    timers: { enemySpawnMs: 0, fireCooldownMs: 0 },
  };
}

export function restartGame(): GameState {
  return createInitialState();
}

export function drainEvents(state: GameState): GameState {
  if (state.events.audio.length === 0 && state.events.fx.length === 0) return state;
  return {
    ...state,
    events: { audio: [], fx: [] },
  };
}
