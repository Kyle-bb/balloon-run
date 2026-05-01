import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { applyGateChoice, applyThresholdUpgrade, createInitialState, drainEvents, type GameState, getBaseOffense, hasOffenseImproved, queueProgress, restartRun, spawnEnemy, type GateChoiceId } from '../game/scenes/BalloonRun';

const WORLD_W = 760;
const WORLD_H = 420;

export default function BalloonRunPage() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [offense, setOffense] = useState(() => getBaseOffense(1));
  const lastFrame = useRef<number>(0);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') setState((s) => ({ ...s, isPaused: !s.isPaused }));
      if (e.key === ' ') setState((s) => ({ ...s, input: { ...s.input, firing: true } }));
      setState((s) => ({ ...s, input: { ...s.input, ...keyToInput(e.key, true) } }));
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setState((s) => ({ ...s, input: { ...s.input, firing: false } }));
      setState((s) => ({ ...s, input: { ...s.input, ...keyToInput(e.key, false) } }));
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
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
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 900, []);

  const onChoice = (id: GateChoiceId) => {
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
    <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <h1>BalloonRun</h1>
      <p><strong>Goal:</strong> Survive waves, pop balloons, and pass person-gates to keep progressing.</p>
      <p>Move with WASD / arrows. Hold <kbd>Space</kbd> for focused fire. Press <kbd>P</kbd> to pause.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <p>Health: {state.player.hp}/{state.player.maxHp}</p><p>Score: {state.score}</p>
        <p>Wave: {state.wave}</p><p>Level: {state.level}</p>
      </div>
      <div style={{ maxWidth: 640, background: '#223', height: 12, borderRadius: 6 }}>
        <div style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #52d, #6cf)', height: '100%', borderRadius: 6 }} />
      </div>
      <p>Progress to next gate: {state.progression}/{state.nextThreshold}</p>

      <div style={{ position: 'relative', width: WORLD_W, height: WORLD_H, border: '2px solid #999', overflow: 'hidden', borderRadius: 8, background: '#fdfdff' }}>
        <div style={{ position: 'absolute', left: state.player.x, top: state.player.y, transform: 'translate(-50%, -50%)' }}>🧍</div>
        {state.enemies.map((e) => <div key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, transform: 'translate(-50%, -50%)' }}>{e.kind === 'tank' ? '🎈🧱' : e.kind === 'fast' ? '🎈⚡' : '🎈'}</div>)}
        {state.projectiles.map((p) => <div key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}>•</div>)}
        {state.isPaused && <div style={overlayStyle}>Paused</div>}
      </div>

      {state.pendingGate && (
        <div style={overlayPanelStyle}>
          <h3>Person Gate Reached</h3>
          <p>Choose one upgrade to continue. Progression is paused until selection.</p>
          {state.pendingGate.choices.map((c) => (
            <button key={c.id} onClick={() => onChoice(c.id)} style={{ display: 'block', margin: '8px 0', width: '100%' }}>
              {c.label} — {c.description}
            </button>
          ))}
        </div>
      )}

      {state.isGameOver && (
        <div style={overlayPanelStyle}>
          <h3>Run Over</h3>
          <p>Final score: {state.score}</p>
          <button onClick={onRestart}>Restart Run</button>
        </div>
      )}

      {isMobile && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 6 }}>
          <button onTouchStart={() => setDir(setState, 0, -1)} onTouchEnd={() => setDir(setState, 0, 0)}>↑</button>
          <button onTouchStart={() => setDir(setState, -1, 0)} onTouchEnd={() => setDir(setState, 0, 0)}>←</button>
          <button onTouchStart={() => setDir(setState, 1, 0)} onTouchEnd={() => setDir(setState, 0, 0)}>→</button>
          <button onTouchStart={() => setDir(setState, 0, 1)} onTouchEnd={() => setDir(setState, 0, 0)}>↓</button>
          <button onTouchStart={() => setTouchFiring(setState, true)} onTouchEnd={() => setTouchFiring(setState, false)}>FIRE</button>
        </div>
      )}

      {import.meta.env.DEV && <pre>DEV debug events: {JSON.stringify(state.events)}</pre>}
    </div>
  );
}

const overlayStyle = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28 } as const;
const overlayPanelStyle = { border: '2px solid #8c6', padding: 12, marginTop: 12, borderRadius: 8, background: '#fafff6' } as const;

function keyToInput(key: string, value: boolean) {
  const normalized = key.toLowerCase();
  if (normalized === 'w' || key === 'ArrowUp') return { up: value };
  if (normalized === 's' || key === 'ArrowDown') return { down: value };
  if (normalized === 'a' || key === 'ArrowLeft') return { left: value };
  if (normalized === 'd' || key === 'ArrowRight') return { right: value };
  return {};
}

function setDir(setState: Dispatch<SetStateAction<GameState>>, x: number, y: number) {
  setState((s) => ({ ...s, input: { ...s.input, touchDirection: { x, y } } }));
}

function setTouchFiring(setState: Dispatch<SetStateAction<GameState>>, firing: boolean) {
  setState((s) => ({ ...s, input: { ...s.input, touchFiring: firing } }));
}

function tick(state: GameState, offense: ReturnType<typeof getBaseOffense>, dt: number): GameState {
  if (state.isGameOver || state.isPaused) return drainEvents(state);
  if (state.pendingGate) return drainEvents({ ...state, timers: { ...state.timers, enemySpawnMs: 0 } });

  let next = { ...state, events: { ...state.events } };
  const inputX = (next.input.right ? 1 : 0) - (next.input.left ? 1 : 0) + next.input.touchDirection.x;
  const inputY = (next.input.down ? 1 : 0) - (next.input.up ? 1 : 0) + next.input.touchDirection.y;
  const mag = Math.hypot(inputX, inputY) || 1;

  next.player = {
    ...next.player,
    x: clamp(next.player.x + (inputX / mag) * next.player.speed * dt, 16, WORLD_W - 16),
    y: clamp(next.player.y + (inputY / mag) * next.player.speed * dt, 16, WORLD_H - 16),
  };

  next.timers = { enemySpawnMs: next.timers.enemySpawnMs + dt * 1000, fireCooldownMs: next.timers.fireCooldownMs + dt * 1000 };
  const spawnEveryMs = Math.max(320, 900 - next.wave * 30);
  if (next.timers.enemySpawnMs >= spawnEveryMs) {
    next.timers.enemySpawnMs = 0;
    const e = spawnEnemy(next);
    next.enemies = [...next.enemies, e];
    next.ids.enemy += 1;
  }

  const wantsFire = next.input.firing || next.input.touchFiring || next.enemies.length > 0;
  if (wantsFire && next.enemies.length > 0 && next.timers.fireCooldownMs >= offense.fireRateMs) {
    next.timers.fireCooldownMs = 0;
    const target = next.enemies.reduce((best, e) => {
      const db = Math.hypot(best.x - next.player.x, best.y - next.player.y);
      const de = Math.hypot(e.x - next.player.x, e.y - next.player.y);
      return de < db ? e : best;
    });
    const dx = target.x - next.player.x;
    const dy = target.y - next.player.y;
    const m = Math.hypot(dx, dy) || 1;
    next.projectiles = [...next.projectiles, { id: next.ids.projectile++, x: next.player.x, y: next.player.y, vx: (dx / m) * offense.projectileSpeed, vy: (dy / m) * offense.projectileSpeed, damage: offense.projectileDamage, ttl: 1.5, radius: 5 }];
  }

  next.projectiles = next.projectiles.map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, ttl: p.ttl - dt })).filter((p) => p.ttl > 0);
  next.enemies = next.enemies.map((e) => {
    const dx = next.player.x - e.x;
    const dy = next.player.y - e.y;
    const m = Math.hypot(dx, dy) || 1;
    return { ...e, x: e.x + (dx / m) * e.speed * dt, y: e.y + (dy / m) * e.speed * dt };
  });

  const alive = [...next.enemies];
  const remainingProjectiles: typeof next.projectiles = [];

  for (const p of next.projectiles) {
    let hitsLeft = 1 + offense.piercing;
    for (const e of alive) {
      if (hitsLeft <= 0) break;
      if (Math.hypot(p.x - e.x, p.y - e.y) <= e.radius + p.radius) {
        e.hp -= p.damage;
        hitsLeft -= 1;
      }
    }
    if (hitsLeft > 0) remainingProjectiles.push(p);
  }

  next.enemies = alive.filter((e) => {
    if (e.hp <= 0) {
      next.score += e.scoreValue;
      next = queueProgress(next, e.progressValue);
      next.events.audio.push('enemy_pop');
      next.events.fx.push(`enemy_pop_${e.kind}`);
      return false;
    }
    return true;
  });

  next.projectiles = remainingProjectiles;

  for (const e of next.enemies) {
    if (Math.hypot(next.player.x - e.x, next.player.y - e.y) <= next.player.radius + e.radius) {
      next.player.hp -= e.damage * dt * 2;
      next.events.audio.push('player_hit');
    }
  }

  if (next.player.hp <= 0) {
    next.player.hp = 0;
    next.isGameOver = true;
    next.input = { ...next.input, up: false, down: false, left: false, right: false, firing: false, touchDirection: { x: 0, y: 0 }, touchFiring: false };
    next.events.audio.push('run_lost');
  }

  return drainEvents(next);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
