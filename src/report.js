const pct = value => value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
const ms = value => value === null ? 'n/a' : `${value.toFixed(1)}ms`;

export function printSummary(result) {
  const m = result.metrics;
  console.log(`\nai-devkit ${result.version} (${result.mode}) — ${m.queryCount} queries`);
  console.log(`hit@1 ${pct(m.hitAt1)} | hit@3 ${pct(m.hitAt3)} | hit@5 ${pct(m.hitAt5)}`);
  console.log(`zero results ${pct(m.zeroResultRate)} | irrelevant top-3 ${pct(m.irrelevantTop3Rate)} | judgment coverage ${pct(m.top3JudgmentCoverage)}`);
  console.log(`wall latency p50 ${ms(m.wallLatencyP50Ms)} | p95 ${ms(m.wallLatencyP95Ms)} | suite ${result.elapsedMs.toFixed(1)}ms`);
  console.log(`seeded via memory store in ${result.seedTimeMs.toFixed(1)}ms`);
}

export function resultDocument(result) {
  return {
    schemaVersion: 1,
    tool: 'ai-devkit',
    version: result.version,
    mode: result.mode,
    fixtureRevision: result.fixtureRevision,
    generatedAt: new Date().toISOString(),
    metrics: result.metrics,
    seedTimeMs: result.seedTimeMs,
    elapsedMs: result.elapsedMs,
    cases: result.runs.map(run => ({
      id: run.item.id, need: run.item.need, variant: run.item.variant,
      resultIds: run.ids, wallMs: run.wallMs, strategy: run.output.strategy ?? null,
    })),
  };
}
