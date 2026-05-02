import Phaser from 'phaser';
import {
    createInitialState,
    GameState,
    getBaseOffense,
    OffensiveStats,
    spawnBalloon,
    createUpgrades,
    applyUpgrade,
    startNextStage,
    restartGame,
    drainEvents,
} from './index';

const WORLD_W = 800;
const WORLD_H = 600;

export class BalloonRunScene extends Phaser.Scene {
    private gameState!: GameState;
    private offense!: OffensiveStats;
    private playerSprite!: Phaser.GameObjects.Rectangle;
    private groundSprite!: Phaser.GameObjects.Rectangle;
    private enemySprites: Phaser.GameObjects.Circle[] = [];
    private projectileSprites: Phaser.GameObjects.Triangle[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    private onGameStateChange?: (state: GameState) => void;
    private onOffenseChange?: (offense: OffensiveStats) => void;
    private lastNotifiedState?: GameState;
    private flashTimer: number = 0;

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
        this.offense = getBaseOffense();

        // Background - sky gradient
        this.add.rectangle(WORLD_W / 2, WORLD_H / 4, WORLD_W, WORLD_H / 2, 0x87CEEB); // Light blue sky
        this.add.rectangle(WORLD_W / 2, WORLD_H * 3 / 4, WORLD_W, WORLD_H / 2, 0xE0F6FF); // Lighter blue bottom

        // Ground/base line
        this.groundSprite = this.add.rectangle(WORLD_W / 2, WORLD_H - 10, WORLD_W, 20, 0x8B4513); // Brown ground

        // Create player sprite - cannon/turret
        this.playerSprite = this.add.rectangle(this.gameState.player.x, this.gameState.player.y, 32, 16, 0x2c3e50); // Increased from 20x12 to 32x16
        const barrel = this.add.rectangle(this.gameState.player.x, this.gameState.player.y - 8, 8, 24, 0x34495e); // Increased barrel from 6x16 to 8x24
        this.playerSprite.setData('barrel', barrel);

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = this.input.keyboard!.addKeys('A,D') as any;

        // Update initial state
        this.onGameStateChange?.(this.gameState);
        this.onOffenseChange?.(this.offense);
        this.lastNotifiedState = { ...this.gameState };
    }

    update(time: number, delta: number) {
        const dt = delta / 1000; // delta is in ms

        // Handle input
        const input = { left: false, right: false, firing: true, touchDirection: this.gameState.input.touchDirection };
        if (this.cursors.left.isDown || this.input.keyboard!.addKey('A').isDown) input.left = true;
        if (this.cursors.right.isDown || this.input.keyboard!.addKey('D').isDown) input.right = true;
        this.gameState.input = input;
        const oldState = { ...this.gameState };
        this.gameState = this.tick(this.gameState, this.offense, dt);

        // Handle flash effect for base hits
        if (this.gameState.events.fx.includes('base_hit')) {
            this.flashTimer = 300; // Flash for 300ms
        }

        // Update sprites
        this.updateSprites();

        // Notify React only if UI-relevant state changed
        if (this.shouldNotifyStateChange(oldState, this.gameState)) {
            this.onGameStateChange?.(this.gameState);
            this.lastNotifiedState = { ...this.gameState };
        }
    }

    private tick(state: GameState, offense: OffensiveStats, dt: number): GameState {
        if (state.isGameOver) {
            // Clear all active balloons and projectiles on game over
            return drainEvents({
                ...state,
                enemies: [],
                projectiles: []
            });
        }
        if (state.isStageComplete || state.pendingUpgrades) return drainEvents(state);

        let next = { ...state, events: { ...state.events } };

        // Player movement (horizontal only)
        const inputX = (next.input.right ? 1 : 0) - (next.input.left ? 1 : 0) + next.input.touchDirection.x;
        next.player.x = Math.max(0, Math.min(WORLD_W - 16, next.player.x + inputX * next.player.speed * dt));

        next.timers = { enemySpawnMs: next.timers.enemySpawnMs + dt * 1000, fireCooldownMs: next.timers.fireCooldownMs + dt * 1000 };

        // Spawn balloons - faster spawns for early stages
        const spawnRateMs = Math.max(400, 1200 - next.currentStage * 150); // Stage 1: 1050ms -> 800ms, Stage 2: 900ms, Stage 3: 750ms
        if (next.timers.enemySpawnMs > spawnRateMs && next.balloonsRemaining > 0) {
            next.timers.enemySpawnMs = 0;
            const balloon = spawnBalloon(next.currentStage);
            balloon.id = next.ids.enemy++;
            next.enemies = [...next.enemies, balloon];
            next.balloonsRemaining--;
        }

        // Shooting
        if (next.timers.fireCooldownMs >= offense.fireRateMs) {
            next.timers.fireCooldownMs = 0;
            const shooters = [{ x: 0 }]; // Center
            if (offense.extraShooters >= 1) shooters.push({ x: -20 }); // Left
            if (offense.extraShooters >= 2) shooters.push({ x: 20 }); // Right

            shooters.forEach(shooter => {
                for (let i = 0; i < offense.multiShot; i++) {
                    const spread = offense.multiShot > 1 ? (i - (offense.multiShot - 1) / 2) * 0.2 : 0;
                    next.projectiles = [...next.projectiles, {
                        id: next.ids.projectile++,
                        x: next.player.x + shooter.x,
                        y: next.player.y,
                        vx: spread * offense.projectileSpeed,
                        vy: -offense.projectileSpeed,
                        damage: offense.projectileDamage,
                        ttl: 2000,
                        piercing: offense.piercing,
                        explosive: offense.explosive,
                    }];
                }
            });
        }

        // Update projectiles
        next.projectiles = next.projectiles
            .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, ttl: p.ttl - dt * 1000 }))
            .filter((p) => p.ttl > 0 && p.x >= 0 && p.x <= WORLD_W && p.y >= 0 && p.y <= WORLD_H);

        // Update enemies
        next.enemies = next.enemies
            .map((e) => ({ ...e, y: e.y + e.speed * dt }))
            .filter((e) => e.y < WORLD_H + 20); // Remove off-screen

        // Collision detection
        next.projectiles.forEach((p) => {
            next.enemies.forEach((e) => {
                if (Math.abs(p.x - e.x) < 12 && Math.abs(p.y - e.y) < 12) {
                    e.currentLayer -= p.damage;
                    if (!p.piercing) p.ttl = 0; // Remove projectile unless piercing
                    if (e.currentLayer <= 0) {
                        next.score += e.type.points;
                        next.events.audio.push('balloon_pop');
                        next.events.fx.push('explosion');
                    }
                }
            });
        });

        // Remove popped balloons
        const aliveEnemies: Enemy[] = [];
        next.enemies.forEach((e) => {
            if (e.currentLayer > 0) {
                aliveEnemies.push(e);
            }
        });
        next.enemies = aliveEnemies;

        // Check stage complete
        if (next.balloonsRemaining === 0 && next.enemies.length === 0) {
            next.isStageComplete = true;
            next.pendingUpgrades = createUpgrades();
        }

        // Player hit by balloons reaching bottom
        next.enemies.forEach((e) => {
            if (e.y >= WORLD_H - 20) { // Balloon reached bottom
                next.player.hp -= 3; // Reduced from 5 to 3 for more forgiving gameplay
                e.currentLayer = 0; // Remove balloon
                next.events.fx.push('base_hit'); // Add visual feedback event
                if (next.player.hp <= 0) {
                    next.isGameOver = true;
                    next.events.audio.push('game_over');
                }
            }
        });
        return next;
    }

    private updateSprites() {
        // Update flash effect
        this.flashTimer -= 16; // Assuming 60fps
        if (this.flashTimer > 0) {
            this.groundSprite.setFillStyle(0xff0000); // Red flash
        } else {
            this.groundSprite.setFillStyle(0x8B4513); // Normal brown
        }

        // Update player
        this.playerSprite.setPosition(this.gameState.player.x, this.gameState.player.y);
        const barrel = this.playerSprite.getData('barrel') as Phaser.GameObjects.Rectangle;
        if (barrel) {
            barrel.setPosition(this.gameState.player.x, this.gameState.player.y - 8);
        }

        // Update enemies - make them look like balloons
        while (this.enemySprites.length < this.gameState.enemies.length) {
            const balloon = this.add.circle(0, 0, 16, 0xff0000); // Increased from 12 to 16
            // Add a small string/tail
            const string = this.add.rectangle(0, 0, 2, 12, 0x000000); // Made string thicker and longer
            // Add highlight/shine effect
            const highlight = this.add.circle(0, 0, 6, 0xffffff, 0.3); // White highlight
            balloon.setData('string', string);
            balloon.setData('highlight', highlight);
            this.enemySprites.push(balloon);
        }
        while (this.enemySprites.length > this.gameState.enemies.length) {
            const sprite = this.enemySprites.pop();
            const string = sprite?.getData('string') as Phaser.GameObjects.Rectangle;
            const highlight = sprite?.getData('highlight') as Phaser.GameObjects.Circle;
            string?.destroy();
            highlight?.destroy();
            sprite?.destroy();
        }
        this.enemySprites.forEach((sprite, i) => {
            const enemy = this.gameState.enemies[i];
            const baseSize = 12 + enemy.type.layers * 6; // Increased base size (was 8 + layers * 4)
            const currentSize = baseSize * (0.6 + enemy.currentLayer * 0.4 / enemy.type.layers); // Shrink as layers are lost

            sprite.setPosition(enemy.x, enemy.y);
            sprite.setFillStyle(enemy.type.color);
            sprite.setRadius(currentSize);

            // Update string position
            const string = sprite.getData('string') as Phaser.GameObjects.Rectangle;
            if (string) {
                string.setPosition(enemy.x, enemy.y + currentSize + 6);
            }

            // Update highlight position
            const highlight = sprite.getData('highlight') as Phaser.GameObjects.Circle;
            if (highlight) {
                highlight.setPosition(enemy.x - currentSize * 0.3, enemy.y - currentSize * 0.3);
                highlight.setRadius(currentSize * 0.4);
            }
        });

        // Update projectiles - make them look like darts/arrows
        while (this.projectileSprites.length < this.gameState.projectiles.length) {
            // Create arrow shape: triangle pointing up - made larger
            const arrow = this.add.triangle(0, 0, 0, -10, -5, 5, 5, 5, 0xffff00); // Increased from -6, -3, 3 to -10, -5, 5
            this.projectileSprites.push(arrow);
        }
        while (this.projectileSprites.length > this.gameState.projectiles.length) {
            const sprite = this.projectileSprites.pop();
            sprite?.destroy();
        }
        this.projectileSprites.forEach((sprite, i) => {
            const proj = this.gameState.projectiles[i];
            sprite.setPosition(proj.x, proj.y);
            // Rotate to face upward
            sprite.setRotation(Math.PI);
        });
    }

    private shouldNotifyStateChange(oldState: GameState, newState: GameState): boolean {
        return (
            oldState.pendingUpgrades !== newState.pendingUpgrades ||
            oldState.isGameOver !== newState.isGameOver ||
            oldState.score !== newState.score ||
            oldState.currentStage !== newState.currentStage ||
            oldState.balloonsRemaining !== newState.balloonsRemaining ||
            oldState.player.hp !== newState.player.hp ||
            oldState.player.maxHp !== newState.player.maxHp
        );
    }

    public applyUpgrade(upgradeId: string) {
        if (!this.gameState.pendingUpgrades) return;
        this.offense = applyUpgrade(this.offense, upgradeId);
        this.gameState = startNextStage(this.gameState);
        // Handle health upgrade specially
        if (upgradeId === 'health') {
            this.gameState.player.maxHp += 20;
            this.gameState.player.hp += 20;
        }
        this.onOffenseChange?.(this.offense);
        this.onGameStateChange?.(this.gameState);
        this.lastNotifiedState = { ...this.gameState };
    }

    public restart() {
        this.offense = getBaseOffense();
        this.gameState = restartGame();
        this.onOffenseChange?.(this.offense);
        this.onGameStateChange?.(this.gameState);
        this.lastNotifiedState = { ...this.gameState };
    }

    public setTouchDirection(x: number) {
        this.gameState.input.touchDirection.x = x;
    }
}