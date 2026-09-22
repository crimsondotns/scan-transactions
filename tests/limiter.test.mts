import test from 'node:test';
import assert from 'node:assert/strict';
import { limitedFetch, setLimiterTiming } from '../src/limiter.ts';

setLimiterTiming({ gapMs: 1, basePauseMs: 10 });

test('429 is retried after a pause; caller only sees the final response', async () => {
  let calls = 0;
  (globalThis as { fetch: unknown }).fetch = async () => {
    calls++;
    const status = calls < 3 ? 429 : 200;
    return { ok: status === 200, status, headers: { get: () => null }, json: async () => ({}) };
  };
  const res = await limitedFetch('https://x.invalid/a');
  assert.equal(res.status, 200);
  assert.equal(calls, 3);
});

test('concurrency is capped at 2', async () => {
  let inFlight = 0;
  let peak = 0;
  (globalThis as { fetch: unknown }).fetch = async () => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({}) };
  };
  await Promise.all(Array.from({ length: 6 }, (_, i) => limitedFetch(`https://x.invalid/${i}`)));
  assert.equal(peak, 2);
});
