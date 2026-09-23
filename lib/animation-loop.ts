/** One outstanding timer/frame at a time, with no catch-up after suspension. */
export type AnimationScheduler = {
  now: () => number;
  setTimer: (callback: () => void, delay: number) => number;
  clearTimer: (id: number) => void;
  requestFrame: (callback: (time: number) => void) => number;
  cancelFrame: (id: number) => void;
};

export function startAnimationLoop(
  onFrame: (delta: number) => void,
  interval: number,
  scheduler: AnimationScheduler = {
    now: () => performance.now(),
    setTimer: (callback, delay) => window.setTimeout(callback, delay),
    clearTimer: (id) => window.clearTimeout(id),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
  },
) {
  let stopped = false;
  let timer: number | null = null;
  let frame: number | null = null;
  let lastTime = scheduler.now();
  const schedule = () => {
    if (stopped) return;
    timer = scheduler.setTimer(() => {
      timer = null;
      if (stopped) return;
      frame = scheduler.requestFrame((time) => {
        frame = null;
        if (stopped) return;
        const delta = Math.min(interval * 1.5, Math.max(0, time - lastTime));
        lastTime = time;
        onFrame(delta);
        schedule();
      });
    }, Math.max(0, interval - (scheduler.now() - lastTime)));
  };
  schedule();
  return () => {
    stopped = true;
    if (timer !== null) scheduler.clearTimer(timer);
    if (frame !== null) scheduler.cancelFrame(frame);
  };
}
