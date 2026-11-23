// Presentation clock. Routes replay saved case policy; they are not live inference.
export const DURATIONS = { ready: 1400, feeding: 2600, scanning: 2200, decision: 3000, routing: 3800, feedback: 3200 };
export const PHASES = Object.keys(DURATIONS);
export function initialTimeline(reduced = false) {
  return { phase: 'ready', elapsed: 0, jobIndex: 0, cycle: 0, route: null, records: [], mode: 'auto', playing: !reduced, speed: 1 };
}
export function advanceTimeline(state, milliseconds, jobs) {
  if (!state.playing || !Number.isFinite(milliseconds) || milliseconds <= 0) return state;
  let next = { ...state, elapsed: state.elapsed + milliseconds * state.speed };
  for (let guard = 0; guard < 100; guard++) {
    if (next.mode === 'manual' && ['ready', 'decision'].includes(next.phase)) return { ...next, elapsed: 0 };
    if (next.mode === 'manual' && next.phase === 'feedback') return { ...next, elapsed: Math.min(next.elapsed, DURATIONS.feedback) };
    const duration = DURATIONS[next.phase];
    if (next.elapsed < duration) return next;
    next.elapsed -= duration;
    if (next.phase === 'feedback') {
      next = { ...next, phase: 'ready', jobIndex: (next.jobIndex + 1) % jobs.length, cycle: next.cycle + 1, route: null };
    } else {
      const phase = PHASES[PHASES.indexOf(next.phase) + 1];
      next = { ...next, phase };
      if (phase === 'routing') next.route = jobs[next.jobIndex].route;
      if (phase === 'feedback') {
        const job = jobs[next.jobIndex];
        next.records = [{ id: next.cycle, name: job.name, route: next.route, recommended: job.route }, ...next.records].slice(0, 4);
      }
    }
  }
  return next;
}
export function timelineReducer(state, action) {
  switch (action.type) {
    case 'tick': return advanceTimeline(state, action.delta, action.jobs);
    case 'toggle': return { ...state, playing: !state.playing };
    case 'speed': return { ...state, speed: action.speed };
    case 'mode': return { ...state, mode: action.mode, playing: true };
    case 'select': return { ...state, jobIndex: action.index, phase: 'ready', elapsed: 0, route: null, cycle: state.cycle + 1 };
    case 'start': return { ...state, phase: 'feeding', elapsed: 0, playing: true };
    case 'route': return state.phase === 'decision' ? { ...state, route: action.route, phase: 'routing', elapsed: 0, playing: true } : state;
    case 'reset': return { ...initialTimeline(), mode: state.mode, speed: state.speed, playing: false };
    default: return state;
  }
}
