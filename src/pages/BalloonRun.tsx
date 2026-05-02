import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import Phaser from 'phaser';
import { BalloonRunScene } from '../game/scenes/BalloonRun/BalloonRunScene';
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
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !gameInstanceRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: WORLD_W,
        height: WORLD_H,
        parent: gameRef.current,
        scene: new BalloonRunScene(setState, setOffense),
        physics: {
          default: 'arcade',
          arcade: { debug: false },
        },
      };
      gameInstanceRef.current = new Phaser.Game(config);
    }

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);

  const progressPct = Math.min(100, Math.round((state.progression / state.nextThreshold) * 100));

  const onChoice = (id: string) => {
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene('BalloonRunScene') as BalloonRunScene;
      scene.applyGateChoice(id);
    }
  };

  const onRestart = () => {
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene('BalloonRunScene') as BalloonRunScene;
      scene.restart();
    }
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

      <div ref={gameRef} style={{ border: '1px solid #999' }}></div>

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

      {import.meta.env.DEV && (
        <pre>DEV debug events: {JSON.stringify(state.events)}</pre>
      )}
    </div>
  );
}
