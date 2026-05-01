# BalloonRun QA Checklist

- [ ] `/balloon-run` route is reachable through `AppRoutes` and renders the BalloonRun page.
- [ ] Goal text appears immediately on first render.
- [ ] Keyboard movement works with **WASD** and **Arrow keys**.
- [ ] Touch controls render on small screens and update movement direction.
- [ ] Enemy spawning, auto-projectiles, score, health, and progression all update during play.
- [ ] Progress bar and numeric progress-to-threshold text are visible.
- [ ] Person-gate appears at threshold and **must** be explicitly chosen before progression continues.
- [ ] Lose condition triggers when health reaches `0` and restart button appears.
- [ ] Restart fully resets run state and clears all movement/touch input state.
- [ ] Event queues (`audio`, `fx`) are drained every frame and do not grow indefinitely.
- [ ] Debug event feed is shown only when `import.meta.env.DEV` is true.
- [ ] No permanent lint weakening was introduced; any ESLint fallback is temporary and auto-disables when dependencies are present.
