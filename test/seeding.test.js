import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStoreOutput, remapCases, storeArgs } from '../src/seeding.js';

test('builds real memory store CLI arguments', () => {
  assert.deepEqual(storeArgs({ title: 'Store response DTOs', content: 'Public endpoints return response DTOs to protect internal domain fields.', tags: ['API', 'dto'], scope: 'project:web' }), [
    'memory', 'store', '--title', 'Store response DTOs', '--content',
    'Public endpoints return response DTOs to protect internal domain fields.',
    '--tags', 'API,dto', '--scope', 'project:web',
  ]);
});

test('parses generated IDs from store JSON', () => {
  assert.equal(parseStoreOutput('{"success":true,"id":"uuid-1","message":"stored"}'), 'uuid-1');
  assert.throws(() => parseStoreOutput('{"success":true}'));
  assert.throws(() => parseStoreOutput('not json'));
});

test('remaps fixture judgments to generated UUIDs', () => {
  const cases = [{ id: 'case-a', judgments: [{ memoryId: 'fixture-a', relevance: 2 }, { memoryId: 'fixture-b', relevance: 0 }] }];
  const remapped = remapCases(cases, new Map([['fixture-a', 'uuid-a'], ['fixture-b', 'uuid-b']]));
  assert.deepEqual(remapped[0].judgments, [{ memoryId: 'uuid-a', relevance: 2 }, { memoryId: 'uuid-b', relevance: 0 }]);
  assert.throws(() => remapCases(cases, new Map()));
});
