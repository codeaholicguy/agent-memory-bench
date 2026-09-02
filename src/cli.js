#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFixtures } from './fixtures.js';
import { createFixtureProject } from './project.js';
import { finalizeSemantic, prepareSemantic, remapCases, seedMemories } from './seeding.js';
import { installRelease, resolveDevBin } from './tool.js';
import { runSuite } from './runner.js';
import { printSummary, resultDocument } from './report.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const flags = process.argv.slice(3);
const command = process.argv[2] ?? 'run';
const option = name => { const at = flags.indexOf(name); return at >= 0 ? flags[at + 1] : undefined; };
const has = name => flags.includes(name);

async function main() {
  const fixture = loadFixtures(join(root, 'fixtures'));
  if (command === 'validate') {
    console.log(`Validated ${fixture.files.length} fixture file(s), ${fixture.memories.length} memories, ${fixture.cases.length} cases.`);
    return;
  }
  if (!['run', 'debug'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const requestedVersion = option('--version') ?? 'latest';
  const devBin = resolveDevBin();
  if (devBin && !existsSync(devBin)) throw new Error(`AI_DEVKIT_BIN does not exist: ${devBin}`);
  const tool = devBin ? { bin: devBin, version: option('--label') ?? 'dev', mode: 'dev' } : installRelease(requestedVersion, root);
  const selectedCase = option('--case'); const query = option('--query');
  if (selectedCase && query) throw new Error('Use either --case or --query');
  let cases = fixture.cases;
  if (selectedCase) cases = cases.filter(item => item.id === selectedCase);
  if (selectedCase && cases.length === 0) throw new Error(`Unknown case: ${selectedCase}`);
  if (query) cases = [{ id: 'ad-hoc', need: 'ad-hoc', variant: 'natural-language', query, judgments: [] }];
  if (command === 'debug' && !selectedCase && !query) throw new Error('debug requires --case or --query');
  const semantic = has('--semantic');
  const project = createFixtureProject(semantic ? { memory: { semantic: true } } : {});
  try {
    if (semantic) await prepareSemantic({ bin: tool.bin, projectDir: project.projectDir });
    const seeded = await seedMemories({ bin: tool.bin, projectDir: project.projectDir, memories: fixture.memories });
    if (semantic) await finalizeSemantic({ bin: tool.bin, projectDir: project.projectDir, expectedCount: fixture.memories.length, probeQuery: cases[0].query });
    cases = remapCases(cases, seeded.idMap);
    const suite = await runSuite({ bin: tool.bin, projectDir: project.projectDir, cases, budgetMs: Number(option("--budget-ms") ?? 300000), onResult: has('--explain') ? run => {
      console.log(`\n${run.item.id}: ${run.item.query}`);
      console.log(JSON.stringify({ strategy: run.output.strategy ?? null, wallMs: run.wallMs, results: run.output.results }, null, 2));
    } : undefined });
    const result = { ...suite, ...tool, seedTimeMs: seeded.seedTimeMs, fixtureRevision: 'core-v1' };
    printSummary(result);
    if (option('--output')) {
      const output = resolve(option('--output')); mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, `${JSON.stringify(resultDocument(result), null, 2)}\n`);
      console.log(`Wrote ${output}`);
    }
  } finally { project.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
