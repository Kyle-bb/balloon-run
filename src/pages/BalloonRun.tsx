import { useEffect, useRef, useState, useMemo } from 'react';
import Phaser from 'phaser';
import { BalloonRunScene } from '../game/scenes/BalloonRun/BalloonRunScene';
import {
  createInitialState,
  GameState,
  getBaseOffense,
  OffensiveStats,
} from '../game/scenes/BalloonRun';

const WORLD_W = 800;
const WORLD_H = 600;

export default function BalloonRunPage() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [offense, setOffense] = useState(() => getBaseOffense());
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 800, []);

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

  const onUpgrade = (upgradeId: string) => {
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene('BalloonRunScene') as BalloonRunScene;
      scene.applyUpgrade(upgradeId);
    }
  };

  const onRestart = () => {
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene('BalloonRunScene') as BalloonRunScene;
      scene.restart();
    }
  };

  const setTouchDirection = (x: number) => {
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene('BalloonRunScene') as BalloonRunScene;
      scene.setTouchDirection(x);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px'
    }}>
      <h1 style={{ margin: '0 0 10px 0', color: '#2c3e50', textAlign: 'center' }}>Balloon Defense</h1>
      <p style={{ margin: '0 0 20px 0', color: '#34495e', textAlign: 'center', fontSize: '14px' }}>
        Defend against balloon waves! Move with A/D or arrow keys. Auto-fire upward.
      </p>

      {/* HUD */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        <div>Stage: <span style={{ color: '#e74c3c' }}>{state.currentStage}</span></div>
        <div>Balloons: <span style={{ color: '#f39c12' }}>{state.balloonsRemaining}</span></div>
        <div>Score: <span style={{ color: '#27ae60' }}>{state.score}</span></div>
        <div>Health: <span style={{ color: state.player.hp < state.player.maxHp * 0.3 ? '#e74c3c' : '#27ae60' }}>{state.player.hp}/{state.player.maxHp}</span></div>
        <div>Damage: <span style={{ color: '#9b59b6' }}>{offense.projectileDamage}</span></div>
        <div>Fire Rate: <span style={{ color: '#3498db' }}>{(1000 / offense.fireRateMs).toFixed(1)}/s</span></div>
        <div>Shots: <span style={{ color: '#e67e22' }}>{offense.multiShot}</span></div>
        <div>Shooters: <span style={{ color: '#16a085' }}>{1 + offense.extraShooters}</span></div>
        {offense.piercing && <div style={{ color: '#8e44ad' }}>🔥 Piercing</div>}
        {offense.explosive && <div style={{ color: '#d35400' }}>💥 Explosive</div>}
      </div>

      <div style={{
        position: 'relative',
        border: '4px solid #2c3e50',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        background: '#87CEEB'
      }}>
        <div ref={gameRef} style={{
          border: 'none'
        }}></div>

        {/* Game Over Overlay */}
        {state.isGameOver && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(231, 76, 60, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>💥 GAME OVER 💥</div>
            <div style={{ fontSize: '18px', marginBottom: '20px' }}>Final Score: {state.score}</div>
            <button
              onClick={onRestart}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔄 Restart Game
            </button>
          </div>
        )}

        {/* Upgrade Overlay */}
        {state.pendingUpgrades && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(46, 204, 113, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            padding: '20px'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '10px', textAlign: 'center' }}>
              🎉 Stage {state.currentStage} Complete! 🎉
            </div>
            <div style={{ fontSize: '18px', marginBottom: '20px', textAlign: 'center' }}>
              Choose your upgrade:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {state.pendingUpgrades.map((upgrade) => (
                <button
                  key={upgrade.id}
                  onClick={() => onUpgrade(upgrade.id)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    background: '#f39c12',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    minWidth: '120px'
                  }}
                >
                  {upgrade.name}<br />
                  <small>{upgrade.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '40px'
        }}>
          <button
            onTouchStart={() => setTouchDirection(-1)}
            onTouchEnd={() => setTouchDirection(0)}
            onMouseDown={() => setTouchDirection(-1)}
            onMouseUp={() => setTouchDirection(0)}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            ←
          </button>
          <button
            onTouchStart={() => setTouchDirection(1)}
            onTouchEnd={() => setTouchDirection(0)}
            onMouseDown={() => setTouchDirection(1)}
            onMouseUp={() => setTouchDirection(0)}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '24px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            →
          </button>
        </div>
      )}

      {import.meta.env.DEV && (
        <div style={{
          marginTop: '20px',
          padding: '8px',
          background: 'rgba(0,0,0,0.7)',
          color: '#00ff00',
          fontSize: '12px',
          fontFamily: 'monospace',
          borderRadius: '4px',
          maxWidth: '800px',
          wordWrap: 'break-word'
        }}>
          DEV: {JSON.stringify(state.events)}
        </div>
      )}
    </div>
  );
}
