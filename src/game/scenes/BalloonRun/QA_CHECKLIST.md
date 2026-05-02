# Balloon Defense 2.0+ QA Checklist

- [ ] `/balloon-run` route is reachable through `AppRoutes` and renders the BalloonRun page.
- [ ] Title "Balloon Defense 2.0" and updated description appear immediately on first render.
- [ ] Keyboard movement works with **A/D** and **Arrow keys** (horizontal only).
- [ ] Auto-fire shoots upward from player position (and extra shooters if upgraded).
- [ ] Enemy spawning: balloons spawn from top of screen in waves, moving downward.
- [ ] Layered balloons: balloons have multiple layers (1-5), size scales with current layer.
- [ ] Balloon collision: projectiles reduce balloon layer count, balloons pop when layer reaches 0.
- [ ] Special balloon types: boss balloons (crown), fast balloons, armored balloons, explosive balloons.
- [ ] Money system: earn currency by defeating balloons, amount based on balloon difficulty.
- [ ] Starting money: players start with 50 money at game start.
- [ ] Stage progression: stages require all balloons defeated, last longer now (8+ balloons per stage).
- [ ] Upgrade system: shown with costs, cannot purchase without enough money.
- [ ] Upgrade costs: range from 75 (damage) to 200 (piercing/explosive).
- [ ] Upgrade effects work as intended: damage, fire rate, multi-shot, extra shooters, piercing, explosive.
- [ ] Difficulty scaling: spawn rates and enemy speeds increase as stage progresses; scales with weapon strength.
- [ ] Power-up spawning: colored circles appear randomly, collect for temporary bonuses.
- [ ] Power-up effects: health (+30 HP), damage (+1), speed (+50), multishot (+1).
- [ ] Sound effects: shooting, balloon pops, explosions, base hits, power-ups, upgrades, error buzzer.
- [ ] Particle effects: explosions on balloon death, muzzle flash on shooting, power-up collection.
- [ ] HUD displays: stage, balloons remaining, money balance, score, health, offense stats.
- [ ] Lose condition triggers when health reaches `0` and restart button appears.
- [ ] Restart fully resets game state to stage 1 with 50 starting money and base offense.
- [ ] Event queues (`audio`, `fx`) are drained every frame and do not grow indefinitely.

## Difficulty & Economy Testing
- [ ] Stage 1 easy: mostly 1-layer balloons, 8 balloons, earn ~150-250 money
- [ ] Stage 2 mild pressure: introduces 2-layer balloons, 10 balloons, faster spawns, harder to farm
- [ ] Stage 3 fair challenge: adds 3-layer balloons, 12 balloons, requires careful spending
- [ ] Early-game decision: can afford basic upgrades (damage/health) or must farm for expensive ones (piercing/explosive)
- [ ] Mid-game affordability: stronger weapons give more points, enabling better upgrade purchases
- [ ] Upgrades force tradeoffs: can't buy everything, must choose strategically
- [ ] Spawn scaling: enemies spawn faster as stage increases, more intense than previous version
- [ ] Enemy speed scales: faster per stage, noticeable difficulty jump
- [ ] New balloon types appear when affordable at higher stages, challenging player abilities
