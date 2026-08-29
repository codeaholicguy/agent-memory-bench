import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

export function storeArgs(memory) {
  const args = ['memory', 'store', '--title', memory.title, '--content', memory.content];
  if (memory.tags?.length) args.push('--tags', memory.tags.join(','));
  args.push('--scope', memory.scope ?? 'global');
  return args;
}

export function parseStoreOutput(stdout) {
  let value;
  try { value = JSON.parse(stdout); } catch { throw new Error('ai-devkit memory store did not emit valid JSON'); }
  if (!value || value.success !== true || typeof value.id !== 'string' || !value.id) throw new Error('ai-devkit memory store JSON schema changed');
  return value.id;
}

async function storeMemory({ bin, cwd, memory, timeoutMs }) {
  const stdout = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...storeArgs(memory)], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let error = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { out += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { error += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`store timed out after ${timeoutMs}ms`)); }, timeoutMs);
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve(out) : reject(new Error(`store for ${memory.id} exited ${code}: ${error.trim()}`));
    });
  });
  return [memory.id, parseStoreOutput(stdout)];
}

async function concurrentMap(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

export async function seedMemories({ bin, projectDir, memories, concurrency = 6, timeoutMs = 10000 }) {
  const started = performance.now();
  const pairs = [];
  // Let the first real store invocation initialize the database before concurrent writes begin.
  if (memories.length) pairs.push(await storeMemory({ bin, cwd: projectDir, memory: memories[0], timeoutMs }));
  pairs.push(...await concurrentMap(memories.slice(1), concurrency, memory => storeMemory({ bin, cwd: projectDir, memory, timeoutMs })));
  return { idMap: new Map(pairs), seedTimeMs: performance.now() - started };
}

export function remapCases(cases, idMap) {
  return cases.map(item => ({
    ...item,
    judgments: item.judgments.map(judgment => {
      const memoryId = idMap.get(judgment.memoryId);
      if (!memoryId) throw new Error(`No stored UUID for fixture memory ${judgment.memoryId}`);
      return { ...judgment, memoryId };
    }),
  }));
}
