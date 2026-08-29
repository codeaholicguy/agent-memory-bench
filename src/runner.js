import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { calculateMetrics } from './metrics.js';

export function parseSearchOutput(stdout) {
  let value;
  try { value = JSON.parse(stdout); } catch { throw new Error('ai-devkit memory search did not emit valid JSON'); }
  if (!value || !Array.isArray(value.results) || typeof value.totalMatches !== 'number' || typeof value.query !== 'string') throw new Error('ai-devkit memory search JSON schema changed');
  if (!value.results.every(item => item && typeof item.id === 'string')) throw new Error('ai-devkit search result is missing an id');
  return value;
}

function searchArgs(item) {
  const args = ['memory', 'search', '--query', item.query, '--limit', '5'];
  if (item.scope) args.push('--scope', item.scope);
  if (item.contextTags?.length) args.push('--tags', item.contextTags.join(','));
  return args;
}

export async function searchCli({ bin, cwd, item, timeoutMs = 5000 }) {
  const started = performance.now();
  const stdout = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...searchArgs(item)], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let error = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { out += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { error += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`search timed out after ${timeoutMs}ms`)); }, timeoutMs);
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`search exited ${code}: ${error.trim()}`)); });
  });
  return { output: parseSearchOutput(stdout), wallMs: performance.now() - started };
}

export async function runSuite({ bin, projectDir, cases, budgetMs = 60000, onResult }) {
  const started = performance.now(); const runs = [];
  for (const item of cases) {
    if (performance.now() - started > budgetMs) throw new Error(`eval exceeded ${budgetMs}ms budget`);
    const run = await searchCli({ bin, cwd: projectDir, item });
    const record = { item, output: run.output, wallMs: run.wallMs, ids: run.output.results.map(result => result.id), judgments: new Map(item.judgments.map(j => [j.memoryId, j.relevance])) };
    runs.push(record); onResult?.(record);
  }
  return { runs, metrics: calculateMetrics(runs), elapsedMs: performance.now() - started };
}
