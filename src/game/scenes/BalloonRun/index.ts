export type Vec2 = { x: number; y: number };

export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
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
};

export type OffensiveStats = {
  projectileDamage: number;
  fireRateMs: number;
  projectileSpeed: number;
};

export type GameState = {
  player: Vec2 & { hp: number; maxHp: number; speed: number };
  score: number;
  progression: number;
  level: number;
  nextThreshold: number;
  isGameOver: boolean;
  pendingGate: null | {
    threshold: number;
    choices: Array<{ id: string; label: string; description: string; apply: (state: GameState) => GameState }>;
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
    player: { x: 200, y: 200, hp: 100, maxHp: 100, speed: 180 },
    score: 0,
    progression: 0,
    level: 1,
    nextThreshold: INITIAL_THRESHOLD,
    isGameOver: false,
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
    },
    timers: { enemySpawnMs: 0, fireCooldownMs: 0 },
    events: { audio: [], fx: [] },
    ids: { enemy: 1, projectile: 1 },
  };
}

export function createGateChoices(): GameState['pendingGate']['choices'] {
  return [
    {
      id: 'damage',
      label: 'Power Up',
      description: '+2 projectile damage',
      apply: (s) => ({ ...s, player: { ...s.player }, level: s.level + 1, score: s.score + 10 }),
    },
    {
      id: 'rate',
      label: 'Rapid Fire',
      description: '-50ms fire cooldown',
      apply: (s) => ({ ...s, player: { ...s.player }, level: s.level + 1, score: s.score + 10 }),
    },
    {
      id: 'speed',
      label: 'Swift Shots',
      description: '+80 projectile speed',
      apply: (s) => ({ ...s, player: { ...s.player }, level: s.level + 1, score: s.score + 10 }),
    },
  ];
}

export function getBaseOffense(level: number): OffensiveStats {
  return {
    projectileDamage: 8 + level,
    fireRateMs: Math.max(180, 550 - level * 20),
    projectileSpeed: 260 + level * 15,
  };
}

export function applyThresholdUpgrade(stats: OffensiveStats, choiceId: string): OffensiveStats {
  if (choiceId === 'damage') {
    return { ...stats, projectileDamage: stats.projectileDamage + 2 };
  }
  if (choiceId === 'rate') {
    return { ...stats, fireRateMs: Math.max(120, stats.fireRateMs - 50) };
  }
  if (choiceId === 'speed') {
    return { ...stats, projectileSpeed: stats.projectileSpeed + 80 };
  }
  return stats;
}

export function hasOffenseImproved(before: OffensiveStats, after: OffensiveStats): boolean {
  return (
    after.projectileDamage > before.projectileDamage ||
    after.projectileSpeed > before.projectileSpeed ||
    after.fireRateMs < before.fireRateMs
  );
}

export function queueProgress(state: GameState, points: number): GameState {
  if (state.pendingGate || state.isGameOver) return state;

  const progression = state.progression + points;
  if (progression >= state.nextThreshold) {
    return {
      ...state,
      progression,
      pendingGate: {
        threshold: state.nextThreshold,
        choices: createGateChoices(),
      },
      events: {
        audio: [...state.events.audio, 'gate_open'],
        fx: [...state.events.fx, 'threshold_reached'],
      },
    };
  }

  return { ...state, progression };
}

export function applyGateChoice(state: GameState, choiceId: string): GameState {
  if (!state.pendingGate) return state;
  const choice = state.pendingGate.choices.find((c) => c.id === choiceId);
  if (!choice) return state;

  const advanced = choice.apply(state);
  return {
    ...advanced,
    pendingGate: null,
    nextThreshold: Math.round(state.nextThreshold * 1.5),
    events: {
      audio: [...state.events.audio, 'gate_choice_confirmed'],
      fx: [...state.events.fx, `gate_choice_${choiceId}`],
    },
  };
}

export function restartRun(): GameState {
  return createInitialState();
}

export function drainEvents(state: GameState): GameState {
  if (state.events.audio.length === 0 && state.events.fx.length === 0) return state;
  return {
    ...state,
    events: { audio: [], fx: [] },
  };
}
