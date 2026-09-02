import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createFixtureProject } from '../src/project.js';

test('semantic fixture config preserves the isolated memory path', () => {
  const project = createFixtureProject({ memory: { semantic: true } });
  try {
    const config = JSON.parse(readFileSync(join(project.projectDir, '.ai-devkit.json'), 'utf8'));
    assert.deepEqual(config.memory, { path: project.dbPath, semantic: true });
  } finally {
    project.close();
  }
});
