import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const variants = new Set(['natural-language', 'keyword', 'paraphrase', 'identifier-exact']);
const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
};

export function validateFixture(value, source) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.memories) || !Array.isArray(value.cases)) {
    throw new Error(`${source}: expected schemaVersion 1, memories, and cases`);
  }
  text(value.name, `${source}: name`);
  const memories = new Set();
  for (const memory of value.memories) {
    text(memory.id, `${source}: memory id`); text(memory.title, `${memory.id}: title`); text(memory.content, `${memory.id}: content`);
    if (memories.has(memory.id)) throw new Error(`${source}: duplicate memory ${memory.id}`);
    memories.add(memory.id);
    if (memory.tags !== undefined && (!Array.isArray(memory.tags) || memory.tags.some(tag => typeof tag !== 'string'))) throw new Error(`${memory.id}: invalid tags`);
  }
  const cases = new Set();
  for (const item of value.cases) {
    text(item.id, `${source}: case id`); text(item.need, `${item.id}: need`); text(item.query, `${item.id}: query`);
    if (cases.has(item.id)) throw new Error(`${source}: duplicate case ${item.id}`);
    cases.add(item.id);
    if (!variants.has(item.variant)) throw new Error(`${item.id}: invalid variant`);
    if (!Array.isArray(item.judgments) || !item.judgments.some(j => j.relevance > 0)) throw new Error(`${item.id}: needs a relevant judgment`);
    const judged = new Set();
    for (const judgment of item.judgments) {
      if (!memories.has(judgment.memoryId)) throw new Error(`${item.id}: unknown memory ${judgment.memoryId}`);
      if (![0, 1, 2].includes(judgment.relevance)) throw new Error(`${item.id}: relevance must be 0, 1, or 2`);
      if (judged.has(judgment.memoryId)) throw new Error(`${item.id}: duplicate judgment ${judgment.memoryId}`);
      judged.add(judgment.memoryId);
    }
  }
  return value;
}

export function loadFixture(file) {
  return validateFixture(parse(readFileSync(file, 'utf8')), file);
}

export function loadFixtures(directory) {
  const files = readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && /\.ya?ml$/.test(entry.name))
    .map(entry => join(entry.parentPath, entry.name)).sort();
  const loaded = files.map(loadFixture);
  const merged = { schemaVersion: 1, name: 'all', memories: [], cases: [], files };
  for (const fixture of loaded) { merged.memories.push(...fixture.memories); merged.cases.push(...fixture.cases); }
  return validateFixture(merged, directory);
}
