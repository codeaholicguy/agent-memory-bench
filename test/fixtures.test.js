import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadFixture, validateFixture } from '../src/fixtures.js';

const valid = {
  schemaVersion: 1,
  name: 'test',
  memories: [{ id: 'mem-a', title: 'Response DTO policy', content: 'Return response DTOs from public API endpoint handlers to protect internal domain fields.' }],
  cases: [{ id: 'case-a', need: 'response-dto', variant: 'natural-language', query: 'What should endpoints return?', judgments: [{ memoryId: 'mem-a', relevance: 2 }] }],
};

test('validates a graded fixture', () => assert.doesNotThrow(() => validateFixture(valid, 'test')));

test('rejects dirty community cases', () => {
  for (const fixture of [
    { ...valid, memories: [...valid.memories, valid.memories[0]] },
    { ...valid, cases: [{ ...valid.cases[0], variant: 'chatty' }] },
    { ...valid, cases: [{ ...valid.cases[0], judgments: [{ memoryId: 'missing', relevance: 2 }] }] },
    { ...valid, cases: [{ ...valid.cases[0], judgments: [{ memoryId: 'mem-a', relevance: 3 }] }] },
    { ...valid, cases: [{ ...valid.cases[0], judgments: [{ memoryId: 'mem-a', relevance: 0 }] }] },
  ]) assert.throws(() => validateFixture(fixture, 'test'));
});

test('enforces memory store title and content limits before running', () => {
  for (const memory of [
    { ...valid.memories[0], title: 'short' },
    { ...valid.memories[0], title: 'x'.repeat(101) },
    { ...valid.memories[0], content: 'too short' },
    { ...valid.memories[0], content: 'x'.repeat(5001) },
  ]) assert.throws(() => validateFixture({ ...valid, memories: [memory] }, 'test'));
});

test('loads YAML from disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'memory-bench-test-'));
  try {
    const file = join(dir, 'case.yaml');
    writeFileSync(file, 'schemaVersion: 1\nname: sample\nmemories: []\ncases: []\n');
    assert.equal(loadFixture(file).name, 'sample');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
