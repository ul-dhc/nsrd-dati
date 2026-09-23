import assert from 'node:assert/strict';
import test from 'node:test';
import { startAnimationLoop } from '../lib/animation-loop.ts';

function fakeScheduler() {
  let time = 0;
  let nextId = 0;
  let peakPending = 0;
  const pending = new Map();
  const enqueue = (callback, at, frame) => {
    const id = ++nextId;
    pending.set(id, { callback, at, frame });
    peakPending = Math.max(peakPending, pending.size);
    return id;
  };
  const scheduler = {
    now: () => time,
    setTimer: (callback, delay) => enqueue(callback, time + delay, false),
    clearTimer: (id) => pending.delete(id),
    requestFrame: (callback) => enqueue(callback, time + 16, true),
    cancelFrame: (id) => pending.delete(id),
  };
  const step = () => {
    const [id, item] = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
    pending.delete(id);
    time = Math.max(time, item.at);
    item.callback(item.frame ? time : undefined);
  };
  return { scheduler, pending, step, get peakPending() { return peakPending; }, advanceTo(value) { time = value; } };
}

test('30 simulated minutes keep one pending callback and a bounded mobile frame rate', () => {
  const fake = fakeScheduler();
  let frames = 0;
  const stop = startAnimationLoop(() => { frames++; }, 80, fake.scheduler);
  while (fake.scheduler.now() < 30 * 60 * 1000) fake.step();
  assert.ok(frames > 18000 && frames < 22500, `unexpected frame count: ${frames}`);
  assert.equal(fake.peakPending, 1);
  stop();
  assert.equal(fake.pending.size, 0);
});

test('suspension does not produce a large animation jump or catch-up work', () => {
  const fake = fakeScheduler();
  const deltas = [];
  const stop = startAnimationLoop((delta) => deltas.push(delta), 80, fake.scheduler);
  fake.step();
  fake.advanceTo(10 * 60 * 1000);
  fake.step();
  assert.deepEqual(deltas, [120]);
  assert.equal(fake.pending.size, 1);
  stop();
});

test('repeated pause/resume cancels both timer and frame phases', () => {
  const fake = fakeScheduler();
  let frames = 0;
  for (let i = 0; i < 1000; i++) {
    const stop = startAnimationLoop(() => { frames++; }, 80, fake.scheduler);
    if (i % 2) fake.step();
    const staleCallback = [...fake.pending.values()][0].callback;
    stop();
    staleCallback(fake.scheduler.now());
    assert.equal(fake.pending.size, 0);
  }
  assert.equal(frames, 0);
  assert.equal(fake.peakPending, 1);
});

test('cancellation from a frame callback does not restart the loop', () => {
  const fake = fakeScheduler();
  const stop = startAnimationLoop(() => stop(), 80, fake.scheduler);
  fake.step();
  fake.step();
  assert.equal(fake.pending.size, 0);
});
