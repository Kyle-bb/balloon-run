# Balloon Defense 2.0 QA Checklist

- [ ] `/balloon-run` route is reachable through `AppRoutes` and renders the BalloonRun page.
- [ ] Title "Balloon Defense 2.0" and updated description appear immediately on first render.
- [ ] Keyboard movement works with **A/D** and **Arrow keys** (horizontal only).
- [ ] Auto-fire shoots upward from player position (and extra shooters if upgraded).
- [ ] Enemy spawning: balloons spawn from top of screen in waves, moving downward.
- [ ] Layered balloons: balloons have multiple layers (1-5), size scales with current layer.
- [ ] Balloon collision: projectiles reduce balloon layer count, balloons pop when layer reaches 0.
- [ ] Special balloon types: boss balloons (crown), fast balloons, armored balloons, explosive balloons.
- [ ] Stage progression: stages complete when all balloons in wave are popped.
- [ ] Upgrade selection: 3 random upgrades offered at stage completion, must choose one.
- [ ] Upgrade effects: damage, fire rate, multi-shot, extra shooters, piercing, explosive.
- [ ] Power-up spawning: colored circles appear randomly, collect for temporary bonuses.
- [ ] Power-up effects: health (+30 HP), damage (+1), speed (+50), multishot (+1).
- [ ] Sound effects: shooting, balloon pops, explosions, base hits, power-ups, upgrades.
- [ ] Particle effects: explosions on balloon death, muzzle flash on shooting, power-up collection.
- [ ] HUD displays: stage number, balloons remaining, score, health, offense stats, active power-ups.
- [ ] Lose condition triggers when health reaches `0` and restart button appears.
- [ ] Restart fully resets game state to stage 1 with base offense.
- [ ] Event queues (`audio`, `fx`) are drained every frame and do not grow indefinitely.
- [ ] Debug event feed is shown only when `import.meta.env.DEV` is true.
- [ ] No permanent lint weakening was introduced; any ESLint fallback is temporary and auto-disables when dependencies are present.

## Balance Testing
- [ ] Stage 1 easy: mostly 1-layer balloons, 5 balloons, forgiving pace
- [ ] Stage 2 mild pressure: introduces 2-layer balloons, 6 balloons, noticeable but manageable
- [ ] Stage 3 fair challenge: adds 3-layer balloons, 7 balloons, requires upgrades/movement
- [ ] Stage 4+ new enemies: boss balloons, fast balloons, armored, explosive variants
- [ ] Upgrades noticeable: damage +2, fire rate -150ms, multi-shot/extra shooters clearly help
- [ ] Power-ups impactful: health restores significant HP, damage/speed provide clear advantages
- [ ] Sound feedback: all actions have appropriate audio cues
- [ ] Visual effects: explosions and particles enhance gameplay without being distracting
- [ ] Game over feels fair: player can survive first few stages with basic movement
