import Phaser from 'phaser';
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
    OffensiveStats,
    Vec2,
    Enemy,
    Projectile,
} from './index';

const WORLD_W = 760;
const WORLD_H = 420;

export class BalloonRunScene extends Phaser.Scene {
    private gameState!: GameState;
    private offense!: OffensiveStats;
    private playerSprite!: Phaser.GameObjects.Rectangle;
    private enemySprites: Phaser.GameObjects.Rectangle[] = [];
    private projectileSprites: Phaser.GameObjects.Rectangle[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    private onGameStateChange?: (state: GameState) => void;
    private onOffenseChange?: (offense: OffensiveStats) => void;

    constructor(onGameStateChange: (state: GameState) => void, onOffenseChange: (offense: OffensiveStats) => void) {
        super({ key: 'BalloonRunScene' });
        this.onGameStateChange = onGameStateChange;
        this.onOffenseChange = onOffenseChange;
    }

    preload() {
        // No assets to preload for now
    }

    create() {
        this.gameState = createInitialState();
        this.offense = getBaseOffense(1);

        // Background
        this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x87CEEB); // Sky blue

        // Create player sprite
        this.playerSprite = this.add.circle(this.gameState.player.x + 8, this.gameState.player.y + 8, 8, 0x00ff00);

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as any;

        // Update initial state
        this.onGameStateChange?.(this.gameState);
        this.onOffenseChange?.(this.offense);
    }

    update(time: number, delta: number) {
        const dt = delta / 1000; // delta is in ms

        // Handle input
        const input = { up: false, down: false, left: false, right: false, firing: true, touchDirection: { x: 0, y: 0 } };
        if (this.cursors.up.isDown || this.wasd.W.isDown) input.up = true;
        if (this.cursors.down.isDown || this.wasd.S.isDown) input.down = true;
        if (this.cursors.left.isDown || this.wasd.A.isDown) input.left = true;
        if (this.cursors.right.isDown || this.wasd.D.isDown) input.right = true;

        this.gameState.input = input;

        // Tick the game
        this.gameState = this.tick(this.gameState, this.offense, dt);

        // Update sprites
        this.updateSprites();

        // Notify React
        this.onGameStateChange?.(this.gameState);
    }

    private tick(state: GameState, offense: OffensiveStats, dt: number): GameState {
        if (state.isGameOver) return drainEvents(state);
        if (state.pendingGate) return drainEvents({ ...state, timers: { ...state.timers, enemySpawnMs: 0 } });

        let next = { ...state, events: { ...state.events } };
        const inputX = (next.input.right ? 1 : 0) - (next.input.left ? 1 : 0) + next.input.touchDirection.x;
        const inputY = (next.input.down ? 1 : 0) - (next.input.up ? 1 : 0) + next.input.touchDirection.y;
        next.player = {
            ...next.player,
            x: Math.max(0, Math.min(WORLD_W - 16, next.player.x + inputX * next.player.speed * dt)),
            y: Math.max(0, Math.min(WORLD_H - 16, next.player.y + inputY * next.player.speed * dt)),
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
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const vx = (dx / dist) * offense.projectileSpeed;
                const vy = (dy / dist) * offense.projectileSpeed;
                next.projectiles = [...next.projectiles, {
                    id: next.ids.projectile++,
                    x: next.player.x + 8,
                    y: next.player.y + 8,
                    vx,
                    vy,
                    damage: offense.projectileDamage,
                    ttl: 1800,
                }];
            }
        }

        // Update projectiles
        next.projectiles = next.projectiles
            .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, ttl: p.ttl - dt * 1000 }))
            .filter((p) => p.ttl > 0 && p.x >= 0 && p.x <= WORLD_W && p.y >= 0 && p.y <= WORLD_H);

        // Update enemies
        next.enemies = next.enemies
            .map((e) => ({ ...e, y: e.y + e.speed * dt }))
            .filter((e) => e.hp > 0 && e.y < WORLD_H);

        // Collision detection
        next.projectiles.forEach((p) => {
            next.enemies.forEach((e) => {
                if (Math.abs(p.x - e.x) < 14 && Math.abs(p.y - e.y) < 14) {
                    e.hp -= p.damage;
                }
            });
        });

        // Player-enemy collision
        next.enemies.forEach((e) => {
            if (Math.abs(next.player.x - e.x) < 18 && Math.abs(next.player.y - e.y) < 18) {
                next.player.hp -= 10;
                e.hp = 0; // Remove enemy
                next.events.audio.push('player_hit');
                if (next.player.hp <= 0) {
                    next.isGameOver = true;
                    next.events.audio.push('run_lost');
                }
            }
        });

        // Filter dead enemies
        const aliveEnemies: Enemy[] = [];
        next.enemies.forEach((e) => {
            if (e.hp <= 0) {
                next.score += 10;
                next = queueProgress(next, 18);
                next.events.audio.push('enemy_pop');
                next.events.fx.push('confetti');
            } else {
                aliveEnemies.push(e);
            }
        });
        next.enemies = aliveEnemies;

        return next;
    }

    private updateSprites() {
        // Update player
        this.playerSprite.setPosition(this.gameState.player.x + 8, this.gameState.player.y + 8);

        // Update enemies
        while (this.enemySprites.length < this.gameState.enemies.length) {
            this.enemySprites.push(this.add.circle(0, 0, 8, 0xff0000));
        }
        while (this.enemySprites.length > this.gameState.enemies.length) {
            const sprite = this.enemySprites.pop();
            sprite?.destroy();
        }
        this.enemySprites.forEach((sprite, i) => {
            const enemy = this.gameState.enemies[i];
            sprite.setPosition(enemy.x + 8, enemy.y + 8);
        });

        // Update projectiles
        while (this.projectileSprites.length < this.gameState.projectiles.length) {
            this.projectileSprites.push(this.add.rectangle(0, 0, 4, 4, 0x0000ff));
        }
        while (this.projectileSprites.length > this.gameState.projectiles.length) {
            const sprite = this.projectileSprites.pop();
            sprite?.destroy();
        }
        this.projectileSprites.forEach((sprite, i) => {
            const proj = this.gameState.projectiles[i];
            sprite.setPosition(proj.x + 2, proj.y + 2);
        });
    }

    public applyGateChoice(choiceId: string) {
        const upgraded = applyThresholdUpgrade(this.offense, choiceId);
        if (hasOffenseImproved(this.offense, upgraded)) {
            this.offense = upgraded;
            this.gameState = applyGateChoice(this.gameState, choiceId);
            this.onOffenseChange?.(this.offense);
        }
    }

    public restart() {
        this.offense = getBaseOffense(1);
        this.gameState = restartRun();
        this.onOffenseChange?.(this.offense);
    }
}