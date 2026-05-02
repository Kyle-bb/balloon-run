export class SoundManager {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context on first user interaction
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
    const ctx = this.initAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  playShoot() {
    this.playTone(800, 0.1, 'square', 0.05);
  }

  playBalloonPop() {
    this.playTone(300, 0.2, 'sawtooth', 0.1);
  }

  playExplosion() {
    // Multi-tone explosion
    this.playTone(200, 0.3, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.1), 50);
    setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.08), 100);
  }

  playBaseHit() {
    this.playTone(100, 0.5, 'sawtooth', 0.2);
  }

  playUpgrade() {
    // Ascending tones
    this.playTone(400, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(500, 0.1, 'sine', 0.1), 100);
    setTimeout(() => this.playTone(600, 0.2, 'sine', 0.15), 200);
  }

  playGameOver() {
    // Descending tones
    this.playTone(300, 0.2, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(250, 0.2, 'sawtooth', 0.15), 200);
    setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.2), 400);
  }

  playStageComplete() {
    // Victory fanfare
    this.playTone(523, 0.15, 'sine', 0.1); // C
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.1), 150); // E
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.15), 300); // G
  }

  playPowerUp() {
    this.playTone(1000, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(1200, 0.1, 'sine', 0.1), 100);
    setTimeout(() => this.playTone(1400, 0.2, 'sine', 0.15), 200);
  }
}