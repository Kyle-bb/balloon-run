# Balloon Defense QA Checklist

- [ ] `/balloon-run` route is reachable through `AppRoutes` and renders the BalloonRun page.
- [ ] Title "Balloon Defense" and description appear immediately on first render.
- [ ] Keyboard movement works with **A/D** and **Arrow keys** (horizontal only).
- [ ] Auto-fire shoots upward from player position (and extra shooters if upgraded).
- [ ] Enemy spawning: balloons spawn from top of screen in waves, moving downward.
- [ ] Layered balloons: balloons have multiple layers (1-5), size scales with current layer.
- [ ] Balloon collision: projectiles reduce balloon layer count, balloons pop when layer reaches 0.
- [ ] Stage progression: stages complete when all balloons in wave are popped.
- [ ] Upgrade selection: 3 random upgrades offered at stage completion, must choose one.
- [ ] Upgrade effects: damage, fire rate, multi-shot, extra shooters, piercing, explosive.
- [ ] HUD displays: stage number, balloons remaining, score, health, offense stats.
- [ ] Lose condition triggers when health reaches `0` and restart button appears.
- [ ] Restart fully resets game state to stage 1 with base offense.
- [ ] Event queues (`audio`, `fx`) are drained every frame and do not grow indefinitely.
- [ ] Debug event feed is shown only when `import.meta.env.DEV` is true.
- [ ] No permanent lint weakening was introduced; any ESLint fallback is temporary and auto-disables when dependencies are present.

## Balance Testing
- [ ] Stage 1 easy: mostly 1-layer balloons, 5 balloons, forgiving pace
- [ ] Stage 2 mild pressure: introduces 2-layer balloons, 6 balloons, noticeable but manageable
- [ ] Stage 3 fair challenge: adds 3-layer balloons, 7 balloons, requires upgrades/movement
- [ ] Upgrades noticeable: damage +2, fire rate -150ms, multi-shot/extra shooters clearly help
- [ ] Game over feels fair: player can survive first few stages with basic movement
