import { applyGateChoice, applyThresholdUpgrade, createInitialState, getBaseOffense, hasOffenseImproved, queueProgress, restartRun } from '../index';

describe('BalloonRun core invariants', () => {
  it('person-gate blocks progression until explicit choice', () => {
    const initial = createInitialState();
    const gated = queueProgress(initial, initial.nextThreshold);
    expect(gated.pendingGate).not.toBeNull();

    const stillBlocked = queueProgress(gated, 1000);
    expect(stillBlocked.pendingGate).not.toBeNull();
    expect(stillBlocked.nextThreshold).toBe(initial.nextThreshold);

    const continued = applyGateChoice(stillBlocked, 'damage');
    expect(continued.pendingGate).toBeNull();
    expect(continued.nextThreshold).toBeGreaterThan(initial.nextThreshold);
  });

  it('threshold upgrades always improve at least one offensive stat', () => {
    const before = getBaseOffense(2);
    for (const choice of ['damage', 'rate', 'speed']) {
      const after = applyThresholdUpgrade(before, choice);
      expect(hasOffenseImproved(before, after)).toBe(true);
    }
  });

  it('restart fully resets run state', () => {
    let state = createInitialState();
    state.input.up = true;
    state.input.touchDirection.x = 1;
    state.progression = 99;
    state.player.hp = 25;

    const reset = restartRun();
    expect(reset).toEqual(createInitialState());
  });
});
