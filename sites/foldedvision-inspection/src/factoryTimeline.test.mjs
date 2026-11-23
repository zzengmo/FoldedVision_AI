import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTimeline, initialTimeline, timelineReducer, DURATIONS } from './factoryTimeline.mjs';
const jobs = [{ name: 'PCB', route: 'reject' }, { name: 'Lens', route: 'review' }, { name: 'Ring', route: 'review' }, { name: 'PCB2', route: 'pass' }];
const cycleTime = Object.values(DURATIONS).reduce((a, b) => a + b, 0);
test('cycles every saved case and records the policy route exactly once', () => {
  let s = initialTimeline();
  for (let i = 0; i < 4; i++) s = advanceTimeline(s, cycleTime, jobs);
  assert.equal(s.jobIndex, 0); assert.equal(s.cycle, 4); assert.equal(s.phase, 'ready');
  assert.deepEqual(s.records.map(r => r.route), ['pass', 'review', 'review', 'reject']);
});
test('pause freezes elapsed time and resume with speed preserves stage', () => {
  let s = advanceTimeline(initialTimeline(), 2000, jobs);
  s = timelineReducer(s, { type: 'toggle' });
  assert.equal(advanceTimeline(s, 100000, jobs), s);
  s = timelineReducer(timelineReducer(s, { type: 'toggle' }), { type: 'speed', speed: 2 });
  s = advanceTimeline(s, 500, jobs);
  assert.equal(s.phase, 'feeding'); assert.equal(s.elapsed, 1600);
});
test('manual mode waits for a route and preserves the chosen route', () => {
  let s = { ...initialTimeline(), mode: 'manual' };
  assert.equal(advanceTimeline(s, cycleTime, jobs).phase, 'ready');
  s = timelineReducer(s, { type: 'start' }); s = advanceTimeline(s, 8000, jobs);
  assert.equal(s.phase, 'decision');
  s = timelineReducer(s, { type: 'route', route: 'review' }); s = advanceTimeline(s, 4000, jobs);
  assert.equal(s.phase, 'feedback'); assert.equal(s.records[0].route, 'review'); assert.equal(s.records[0].recommended, 'reject');
  s = advanceTimeline(s, 5000, jobs);
  assert.equal(s.elapsed, DURATIONS.feedback); assert.equal(s.jobIndex, 0); assert.equal(s.records.length, 1);
});
test('reset and case selection clear stale routes; reduced motion starts paused', () => {
  let s = advanceTimeline(initialTimeline(), cycleTime - 2000, jobs);
  s = timelineReducer(s, { type: 'select', index: 2 });
  assert.equal(s.route, null); assert.equal(s.elapsed, 0);
  s = timelineReducer(s, { type: 'reset' });
  assert.equal(s.playing, false); assert.equal(s.records.length, 0); assert.equal(initialTimeline(true).playing, false);
});
