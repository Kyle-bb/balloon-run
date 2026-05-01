export type Vec2 = { x: number; y: number };

export type EnemyKind = 'basic' | 'fast' | 'tank';

export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  scoreValue: number;
  progressValue: number;
  kind: EnemyKind;
};

export type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ttl: number;
  radius: number;
};

export type OffensiveStats = {
  projectileDamage: number;
  fireRateMs: number;
  projectileSpeed: number;
  piercing: number;
};

export type GateChoiceId = 'damage' | 'rate' | 'speed';

export type GameState = {
  player: Vec2 & { hp: number; maxHp: number; speed: number; radius: number };
  score: number;
  progression: number;
  level: number;
  nextThreshold: number;
  isGameOver: boolean;
  isPaused: boolean;
  wave: number;
  pendingGate: null | {
    threshold: number;
    choices: Array<{ id: GateChoiceId; label: string; description: string; apply: (state: GameState) => GameState }>;
  };
  enemies: Enemy[];
  projectiles: Projectile[];
  input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    firing: boolean;
    touchDirection: Vec2;
    touchFiring: boolean;
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

const INITIAL_THRESHOLD = 100;

export function createInitialState(): GameState {
  return {
    player: { x: 200, y: 200, hp: 100, maxHp: 100, speed: 200, radius: 12 },
    score: 0,
    progression: 0,
    level: 1,
    wave: 1,
    nextThreshold: INITIAL_THRESHOLD,
    isGameOver: false,
    isPaused: false,
    pendingGate: null,
    enemies: [],
    projectiles: [],
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      firing: false,
      touchDirection: { x: 0, y: 0 },
      touchFiring: false,
    },
    timers: { enemySpawnMs: 0, fireCooldownMs: 0 },
    events: { audio: [], fx: [] },
    ids: { enemy: 1, projectile: 1 },
  };
}

export function createGateChoices(): GameState['pendingGate']['choices'] {
  return [
    { id: 'damage', label: 'Power Up', description: '+3 projectile damage', apply: (s) => ({ ...s, level: s.level + 1, score: s.score + 10 }) },
    { id: 'rate', label: 'Rapid Fire', description: '-60ms fire cooldown', apply: (s) => ({ ...s, level: s.level + 1, score: s.score + 10 }) },
    { id: 'speed', label: 'Swift Shots', description: '+100 projectile speed', apply: (s) => ({ ...s, level: s.level + 1, score: s.score + 10 }) },
  ];
}

export function getBaseOffense(level: number): OffensiveStats {
  return {
    projectileDamage: 9 + level,
    fireRateMs: Math.max(150, 560 - level * 20),
    projectileSpeed: 260 + level * 20,
    piercing: Math.floor(level / 4),
  };
}

export function applyThresholdUpgrade(stats: OffensiveStats, choiceId: GateChoiceId): OffensiveStats {
  if (choiceId === 'damage') return { ...stats, projectileDamage: stats.projectileDamage + 3 };
  if (choiceId === 'rate') return { ...stats, fireRateMs: Math.max(100, stats.fireRateMs - 60) };
  return { ...stats, projectileSpeed: stats.projectileSpeed + 100 };
}

export function hasOffenseImproved(before: OffensiveStats, after: OffensiveStats): boolean {
  return after.projectileDamage > before.projectileDamage || after.projectileSpeed > before.projectileSpeed || after.fireRateMs < before.fireRateMs;
}

export function spawnEnemy(state: GameState): Enemy {
  const roll = Math.random();
  const kind: EnemyKind = roll < 0.65 ? 'basic' : roll < 0.9 ? 'fast' : 'tank';
  const side = Math.floor(Math.random() * 4);
  const pad = 24;
  const x = side === 0 ? -pad : side === 1 ? 760 + pad : Math.random() * 760;
  const y = side === 2 ? -pad : side === 3 ? 420 + pad : Math.random() * 420;

  if (kind === 'fast') {
    return { id: state.ids.enemy, x, y, hp: 12 + state.wave, speed: 80 + state.wave * 8, radius: 10, damage: 8, scoreValue: 12, progressValue: 14, kind };
  }
  if (kind === 'tank') {
    return { id: state.ids.enemy, x, y, hp: 30 + state.wave * 4, speed: 36 + state.wave * 3, radius: 16, damage: 14, scoreValue: 24, progressValue: 28, kind };
  }
  return { id: state.ids.enemy, x, y, hp: 18 + state.wave * 2, speed: 52 + state.wave * 5, radius: 12, damage: 10, scoreValue: 16, progressValue: 18, kind };
}

export function queueProgress(state: GameState, points: number): GameState {
  if (state.pendingGate || state.isGameOver) return state;
  const progression = state.progression + points;
  if (progression >= state.nextThreshold) {
    return {
      ...state,
      progression,
      pendingGate: { threshold: state.nextThreshold, choices: createGateChoices() },
      events: { audio: [...state.events.audio, 'gate_open'], fx: [...state.events.fx, 'threshold_reached'] },
    };
  }
  return { ...state, progression };
}

export function applyGateChoice(state: GameState, choiceId: GateChoiceId): GameState {
  if (!state.pendingGate) return state;
  const choice = state.pendingGate.choices.find((c) => c.id === choiceId);
  if (!choice) return state;
  const advanced = choice.apply(state);
  return {
    ...advanced,
    pendingGate: null,
    wave: state.wave + 1,
    nextThreshold: Math.round(state.nextThreshold * 1.55),
    events: { audio: [...state.events.audio, 'gate_choice_confirmed'], fx: [...state.events.fx, `gate_choice_${choiceId}`] },
  };
}

export function restartRun(): GameState {
  return createInitialState();
}

export function drainEvents(state: GameState): GameState {
  if (state.events.audio.length === 0 && state.events.fx.length === 0) return state;
  return { ...state, events: { audio: [], fx: [] } };
}
