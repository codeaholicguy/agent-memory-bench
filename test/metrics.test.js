import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMetrics, percentile } from '../src/metrics.js';

test('metrics keep relevance, noise, coverage, and latency separate', () => {
  const metrics = calculateMetrics([
    { judgments: new Map([['good', 2], ['bad', 0]]), ids: ['bad', 'good', 'unknown'], wallMs: 10 },
    { judgments: new Map([['missing', 2]]), ids: [], wallMs: 30 },
  ]);
  assert.deepEqual(metrics, {
    queryCount: 2, hitAt1: 0, hitAt3: 0.5, hitAt5: 0.5, zeroResultRate: 0.5,
    irrelevantTop3Rate: 0.5, top3JudgmentCoverage: 2 / 3,
    wallLatencyP50Ms: 10, wallLatencyP95Ms: 30,
  });
});

test('unjudged results are not called irrelevant', () => {
  const metrics = calculateMetrics([{ judgments: new Map([['good', 2]]), ids: ['unknown'], wallMs: 1 }]);
  assert.equal(metrics.irrelevantTop3Rate, null);
  assert.equal(metrics.top3JudgmentCoverage, 0);
});

test('percentiles use nearest rank', () => {
  assert.equal(percentile([30, 10, 20], 50), 20);
  assert.equal(percentile([], 95), null);
});
