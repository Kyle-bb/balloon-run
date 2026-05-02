export type Vec2 = { x: number; y: number };

export type BalloonType = {
  layers: number; // 1-5 layers
  speed: number;
  color: number; // Phaser color
  points: number;
  special?: 'boss' | 'armored' | 'fast' | 'explosive';
};

export type PowerUp = {
  id: number;
  x: number;
  y: number;
  type: 'health' | 'damage' | 'speed' | 'multishot';
  collected: boolean;
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
  cost: number;
  apply: (stats: OffensiveStats) => OffensiveStats;
};

export type GameState = {
  player: Vec2 & { hp: number; maxHp: number; speed: number };
  score: number;
  money: number;
  currentStage: number;
  balloonsRemaining: number;
  isStageComplete: boolean;
  isGameOver: boolean;
  pendingUpgrades: Upgrade[] | null;
  enemies: Enemy[];
  projectiles: Projectile[];
  powerUps: PowerUp[];
  input: {
    left: boolean;
    right: boolean;
    firing: boolean;
    touchDirection: Vec2;
  };
  timers: {
    enemySpawnMs: number;
    fireCooldownMs: number;
    powerUpSpawnMs: number;
  };
  events: {
    audio: string[];
    fx: string[];
  };
  ids: {
    enemy: number;
    projectile: number;
    powerUp: number;
  };
};

const WORLD_W = 800;
const WORLD_H = 600;

export const BALLOON_TYPES: BalloonType[] = [
  { layers: 1, speed: 50, color: 0xff0000, points: 15 }, // Red
  { layers: 2, speed: 40, color: 0x00ff00, points: 30 }, // Green
  { layers: 3, speed: 30, color: 0x0000ff, points: 50 }, // Blue
  { layers: 1, speed: 80, color: 0xffff00, points: 25 }, // Yellow fast
  { layers: 4, speed: 25, color: 0xff00ff, points: 75 }, // Magenta tough
  // New 2.0 types
  { layers: 5, speed: 20, color: 0x8B4513, points: 150, special: 'boss' }, // Brown boss
  { layers: 2, speed: 60, color: 0xFFA500, points: 40, special: 'fast' }, // Orange fast
  { layers: 3, speed: 35, color: 0x800080, points: 60, special: 'armored' }, // Purple armored
  { layers: 2, speed: 45, color: 0xFF1493, points: 50, special: 'explosive' }, // Pink explosive
];

export function createInitialState(): GameState {
  return {
    player: { x: WORLD_W / 2, y: WORLD_H - 80, hp: 150, maxHp: 150, speed: 250 }, // Moved up from 570 to 520
    score: 0,
    money: 50,
    currentStage: 1,
    balloonsRemaining: 10,
    isStageComplete: false,
    isGameOver: false,
    pendingUpgrades: null,
    enemies: [],
    projectiles: [],
    powerUps: [],
    input: {
      left: false,
      right: false,
      firing: true,
      touchDirection: { x: 0, y: 0 },
    },
    timers: { enemySpawnMs: 0, fireCooldownMs: 0, powerUpSpawnMs: 0 },
    events: { audio: [], fx: [] },
    ids: { enemy: 1, projectile: 1, powerUp: 1 },
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
  return 6 + stage * 2; // Stage 1: 8, Stage 2: 10, Stage 3: 12, etc - much longer stages
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
    speed: type.speed + (stage - 1) * 5, // Faster scaling: +5 per stage instead of +3
  };
}

export function spawnPowerUp(): PowerUp {
  const types: PowerUp['type'][] = ['health', 'damage', 'speed', 'multishot'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    id: 0, // Set later
    x: Math.random() * (WORLD_W - 40) + 20,
    y: Math.random() * (WORLD_H - 200) + 100,
    type,
    collected: false,
  };
}

export function collectPowerUp(state: GameState, powerUpId: number, offense: OffensiveStats): { state: GameState; offense: OffensiveStats } {
  const powerUp = state.powerUps.find(p => p.id === powerUpId);
  if (!powerUp || powerUp.collected) return { state, offense };

  let newState = { ...state };
  let newOffense = { ...offense };

  switch (powerUp.type) {
    case 'health':
      newState.player.hp = Math.min(newState.player.maxHp, newState.player.hp + 30);
      break;
    case 'damage':
      newOffense.projectileDamage += 1;
      break;
    case 'speed':
      newOffense.projectileSpeed += 50;
      break;
    case 'multishot':
      newOffense.multiShot = Math.min(5, newOffense.multiShot + 1);
      break;
  }

  newState.powerUps = newState.powerUps.map(p =>
    p.id === powerUpId ? { ...p, collected: true } : p
  );

  newState.events.fx.push('powerup_collected');
  newState.events.audio.push('powerup');

  return { state: newState, offense: newOffense };
}

export function getAllUpgrades(): Upgrade[] {
  return [
    {
      id: 'damage',
      name: 'Stronger Shots',
      description: '+2 damage',
      cost: 75,
      apply: (s) => ({ ...s, projectileDamage: s.projectileDamage + 2 }),
    },
    {
      id: 'rate',
      name: 'Faster Fire',
      description: '-150ms fire rate',
      cost: 100,
      apply: (s) => ({ ...s, fireRateMs: Math.max(100, s.fireRateMs - 150) }),
    },
    {
      id: 'multishot',
      name: 'Multi Shot',
      description: '+1 projectile per shot',
      cost: 125,
      apply: (s) => ({ ...s, multiShot: Math.min(3, s.multiShot + 1) }),
    },
    {
      id: 'extra_shooter',
      name: 'Extra Shooter',
      description: 'Add side shooter',
      cost: 150,
      apply: (s) => ({ ...s, extraShooters: Math.min(2, s.extraShooters + 1) }),
    },
    {
      id: 'piercing',
      name: 'Piercing Shots',
      description: 'Projectiles pierce balloons',
      cost: 200,
      apply: (s) => ({ ...s, piercing: true }),
    },
    {
      id: 'explosive',
      name: 'Explosive Shots',
      description: 'Splash damage',
      cost: 200,
      apply: (s) => ({ ...s, explosive: true }),
    },
    {
      id: 'health',
      name: 'Extra Health',
      description: '+20 max HP',
      cost: 80,
      apply: (s) => s, // Health handled separately in scene
    },
  ];
}

export function createUpgrades(): Upgrade[] {
  const allUpgrades = getAllUpgrades();
  const shuffled = [...allUpgrades].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function applyUpgrade(stats: OffensiveStats, upgradeId: string): OffensiveStats {
  const upgrade = getAllUpgrades().find(u => u.id === upgradeId);
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
    powerUps: [],
    timers: { enemySpawnMs: 0, fireCooldownMs: 0, powerUpSpawnMs: 0 },
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
