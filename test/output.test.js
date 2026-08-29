import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchOutput } from '../src/runner.js';

test('CLI JSON is a strict parse contract', () => {
  const parsed = parseSearchOutput(JSON.stringify({ results: [{ id: 'mem-a', score: 1 }], totalMatches: 1, query: 'dto', strategy: 'broad' }));
  assert.equal(parsed.results[0].id, 'mem-a');
  assert.equal(parsed.strategy, 'broad');
});

test('rejects invalid CLI JSON shapes', () => {
  for (const output of ['nope', '{}', '{"results":[{}],"totalMatches":1,"query":"x"}']) {
    assert.throws(() => parseSearchOutput(output));
  }
});
