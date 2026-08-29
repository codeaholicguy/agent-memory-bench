export function percentile(values, rank) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((rank / 100) * sorted.length) - 1)];
}

export function calculateMetrics(runs) {
  const count = runs.length;
  const hit = limit => count === 0 ? 0 : runs.filter(run =>
    run.ids.slice(0, limit).some(id => (run.judgments.get(id) ?? 0) > 0),
  ).length / count;
  const slots = runs.flatMap(run => run.ids.slice(0, 3).map(id => run.judgments.get(id)));
  const judged = slots.filter(grade => grade !== undefined);
  return {
    queryCount: count,
    hitAt1: hit(1), hitAt3: hit(3), hitAt5: hit(5),
    zeroResultRate: count === 0 ? 0 : runs.filter(run => run.ids.length === 0).length / count,
    irrelevantTop3Rate: judged.length === 0 ? null : judged.filter(grade => grade === 0).length / judged.length,
    top3JudgmentCoverage: slots.length === 0 ? 0 : judged.length / slots.length,
    wallLatencyP50Ms: percentile(runs.map(run => run.wallMs), 50),
    wallLatencyP95Ms: percentile(runs.map(run => run.wallMs), 95),
  };
}
