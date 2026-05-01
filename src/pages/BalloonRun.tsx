import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  applyGateChoice,
  applyThresholdUpgrade,
  createInitialState,
  drainEvents,
  GameState,
  getBaseOffense,
  hasOffenseImproved,
  queueProgress,
  restartRun,
} from '../game/scenes/BalloonRun';

const WORLD_W = 760;
const WORLD_H = 420;

export default function BalloonRunPage() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [offense, setOffense] = useState(() => getBaseOffense(1));
  const lastFrame = useRef<number>(0);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      setState((s) => ({ ...s, input: { ...s.input, ...keyToInput(e.key, true) } }));
    };
    const onUp = (e: KeyboardEvent) => {
      setState((s) => ({ ...s, input: { ...s.input, ...keyToInput(e.key, false) } }));
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = (ts: number) => {
      const dt = Math.min(0.033, (ts - (lastFrame.current || ts)) / 1000);
      lastFrame.current = ts;
      setState((s) => tick(s, offense, dt));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [offense]);

  const progressPct = Math.min(100, Math.round((state.progression / state.nextThreshold) * 100));
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 800, []);

  const onChoice = (id: string) => {
    const upgraded = applyThresholdUpgrade(offense, id);
    if (!hasOffenseImproved(offense, upgraded)) return;
    setOffense(upgraded);
    setState((s) => applyGateChoice(s, id));
  };

  const onRestart = () => {
    setOffense(getBaseOffense(1));
    setState(restartRun());
    lastFrame.current = 0;
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>BalloonRun</h1>
      <p><strong>Goal:</strong> Survive, pop balloons, and pass person-gates to keep progressing.</p>
      <p>Move with WASD or arrow keys. Auto-fire pops nearest balloons.</p>
      <div style={{ maxWidth: 480, background: '#223', height: 12 }}>
        <div style={{ width: `${progressPct}%`, background: '#52d', height: '100%' }} />
      </div>
      <p>Progress to next gate: {state.progression}/{state.nextThreshold}</p>
      <p>Health: {state.player.hp}/{state.player.maxHp} | Score: {state.score}</p>

      <div style={{ position: 'relative', width: WORLD_W, height: WORLD_H, border: '1px solid #999', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: state.player.x, top: state.player.y }}>🧍</div>
        {state.enemies.map((e) => <div key={e.id} style={{ position: 'absolute', left: e.x, top: e.y }}>🎈</div>)}
        {state.projectiles.map((p) => <div key={p.id} style={{ position: 'absolute', left: p.x, top: p.y }}>•</div>)}
      </div>

      {state.pendingGate && (
        <div style={{ border: '2px solid #8c6', padding: 12, marginTop: 12 }}>
          <h3>Person Gate Reached</h3>
          <p>You must choose one upgrade to continue.</p>
          {state.pendingGate.choices.map((c) => (
            <button key={c.id} onClick={() => onChoice(c.id)} style={{ marginRight: 8 }}>
              {c.label} ({c.description})
            </button>
          ))}
        </div>
      )}

      {state.isGameOver && (
        <div style={{ marginTop: 12 }}>
          <h3>Run Over</h3>
          <button onClick={onRestart}>Restart Run</button>
        </div>
      )}

      {isMobile && (
        <div style={{ marginTop: 10 }}>
          <button onTouchStart={() => setDir(setState, 0, -1)} onTouchEnd={() => setDir(setState, 0, 0)}>↑</button>
          <button onTouchStart={() => setDir(setState, -1, 0)} onTouchEnd={() => setDir(setState, 0, 0)}>←</button>
          <button onTouchStart={() => setDir(setState, 1, 0)} onTouchEnd={() => setDir(setState, 0, 0)}>→</button>
          <button onTouchStart={() => setDir(setState, 0, 1)} onTouchEnd={() => setDir(setState, 0, 0)}>↓</button>
        </div>
      )}

      {import.meta.env.DEV && (
        <pre>DEV debug events: {JSON.stringify(state.events)}</pre>
      )}
    </div>
  );
}

function keyToInput(key: string, value: boolean) {
  if (key === 'w' || key === 'ArrowUp') return { up: value };
  if (key === 's' || key === 'ArrowDown') return { down: value };
  if (key === 'a' || key === 'ArrowLeft') return { left: value };
  if (key === 'd' || key === 'ArrowRight') return { right: value };
  return {};
}

function setDir(setState: Dispatch<SetStateAction<GameState>>, x: number, y: number) {
  setState((s) => ({ ...s, input: { ...s.input, touchDirection: { x, y } } }));
}

function tick(state: GameState, offense: ReturnType<typeof getBaseOffense>, dt: number): GameState {
  if (state.isGameOver) return drainEvents(state);
  if (state.pendingGate) return drainEvents({ ...state, timers: { ...state.timers, enemySpawnMs: 0 } });

  let next = { ...state, events: { ...state.events } };
  const inputX = (next.input.right ? 1 : 0) - (next.input.left ? 1 : 0) + next.input.touchDirection.x;
  const inputY = (next.input.down ? 1 : 0) - (next.input.up ? 1 : 0) + next.input.touchDirection.y;
  next.player = {
    ...next.player,
    x: clamp(next.player.x + inputX * next.player.speed * dt, 0, WORLD_W - 16),
    y: clamp(next.player.y + inputY * next.player.speed * dt, 0, WORLD_H - 16),
  };

  next.timers = { enemySpawnMs: next.timers.enemySpawnMs + dt * 1000, fireCooldownMs: next.timers.fireCooldownMs + dt * 1000 };
  if (next.timers.enemySpawnMs > 900) {
    next.timers.enemySpawnMs = 0;
    next.enemies = [...next.enemies, { id: next.ids.enemy++, x: Math.random() * WORLD_W, y: 0, hp: 12 + next.level * 2, speed: 40 + next.level * 8 }];
  }

  if (next.enemies.length > 0 && next.timers.fireCooldownMs >= offense.fireRateMs) {
    next.timers.fireCooldownMs = 0;
    const target = next.enemies[0];
    const dx = target.x - next.player.x;
    const dy = target.y - next.player.y;
    const m = Math.hypot(dx, dy) || 1;
    next.projectiles = [...next.projectiles, { id: next.ids.projectile++, x: next.player.x, y: next.player.y, vx: (dx / m) * offense.projectileSpeed, vy: (dy / m) * offense.projectileSpeed, damage: offense.projectileDamage, ttl: 1.8 }];
  }

  next.projectiles = next.projectiles.map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, ttl: p.ttl - dt })).filter((p) => p.ttl > 0);
  next.enemies = next.enemies.map((e) => ({ ...e, y: e.y + e.speed * dt }));

  for (const p of next.projectiles) {
    for (const e of next.enemies) {
      if (Math.hypot(p.x - e.x, p.y - e.y) < 14) {
        e.hp -= p.damage;
      }
    }
  }

  const alive: typeof next.enemies = [];
  for (const e of next.enemies) {
    if (e.hp <= 0) {
      next.score += 10;
      next = queueProgress(next, 18);
      next.events.audio.push('enemy_pop');
      next.events.fx.push('confetti');
    } else {
      alive.push(e);
    }
    if (Math.hypot(next.player.x - e.x, next.player.y - e.y) < 18) {
      next.player.hp -= 10;
      next.events.audio.push('player_hit');
    }
  }
  next.enemies = alive;

  if (next.player.hp <= 0) {
    next.player.hp = 0;
    next.isGameOver = true;
    next.events.audio.push('run_lost');
  }

  return drainEvents(next);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
