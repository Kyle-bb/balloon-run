import Phaser from 'phaser';

export class ParticleManager {
  private scene: Phaser.Scene;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createTextures();
    this.createEmitters();
  }

  private createTextures() {
    // Create a simple white pixel texture for particles
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 2, 2);
    graphics.generateTexture('particle', 2, 2);
    graphics.destroy();
  }

  private createEmitters() {
    // Create explosion particle emitter
    this.explosionEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      lifespan: 600,
      alpha: { start: 1, end: 0 },
      quantity: 10,
      blendMode: 'ADD'
    });
    this.explosionEmitter.stop();
  }

  explodeAt(x: number, y: number, color: number = 0xffffff) {
    // Create colored particles for explosion
    const emitter = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 20, max: 100 },
      scale: { start: 0.3, end: 0 },
      lifespan: 800,
      alpha: { start: 0.8, end: 0 },
      quantity: 8,
      tint: color,
      blendMode: 'ADD'
    });

    emitter.explode(8, x, y);

    // Auto-destroy after particles die
    this.scene.time.delayedCall(1000, () => {
      emitter.destroy();
    });
  }

  shootEffect(x: number, y: number) {
    // Small muzzle flash
    const emitter = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 10, max: 30 },
      scale: { start: 0.2, end: 0 },
      lifespan: 200,
      alpha: { start: 0.6, end: 0 },
      quantity: 3,
      tint: 0xffff00,
      blendMode: 'ADD'
    });

    emitter.explode(3, x, y);

    this.scene.time.delayedCall(300, () => {
      emitter.destroy();
    });
  }

  powerUpEffect(x: number, y: number) {
    // Sparkly effect for power-ups
    const emitter = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 30, max: 80 },
      scale: { start: 0.4, end: 0 },
      lifespan: 1000,
      alpha: { start: 1, end: 0 },
      quantity: 6,
      tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff],
      blendMode: 'ADD'
    });

    emitter.explode(6, x, y);

    this.scene.time.delayedCall(1200, () => {
      emitter.destroy();
    });
  }
}