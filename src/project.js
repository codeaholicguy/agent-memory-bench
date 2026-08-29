import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export function createFixtureProject(extraConfig = {}) {
  const projectDir = mkdtempSync(join(tmpdir(), 'agent-memory-bench-'));
  const dbPath = join(projectDir, 'memory.db');
  writeFileSync(join(projectDir, '.ai-devkit.json'), JSON.stringify({
    version: '0.56.0', environments: [], phases: [], memory: { path: dbPath }, ...extraConfig,
  }, null, 2));
  return { projectDir, dbPath, close: () => rmSync(projectDir, { recursive: true, force: true }) };
}
