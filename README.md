# Agent Memory Bench

A community-maintained, black-box benchmark for agent memory retrieval—and a transparent view into how [ai-devkit](https://github.com/codeaholicguy/ai-devkit) improves over time.

The benchmark asks realistic developer questions about decisions, conventions, fixes, commands, and identifiers. It invokes the same `ai-devkit memory store` and `ai-devkit memory search` commands users and coding agents invoke, against an isolated project database. It does not import ai-devkit internals, SQLite libraries, or schema definitions, and never reads `~/.ai-devkit/memory.db`.

## Leaderboard

| ai-devkit | fixture set | hit@1 | hit@3 | hit@5 | zero results | irrelevant top-3 | judged coverage | wall p50 | wall p95 | seed time | Δ hit@3 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.56.0 | expanded-100 | 43.0% | 45.0% | 45.0% | 5.0% | 0.0% | 22.5% | 942.0ms | 1008.8ms | 33.2s | baseline |
| 0.57.0 | expanded-100 | 45.0% | 45.0% | 45.0% | 5.0% | 0.0% | 22.5% | 937.8ms | 1003.0ms | 32.0s | +0.0 pp |
| 0.57.1 | expanded-100 | 81.0% | 91.0% | 96.0% | 1.0% | 2.9% | 50.2% | 939.1ms | 1039.1ms | 36.0s | +46.0 pp |
| 0.58.0 | expanded-100 | 81.0% | 91.0% | 96.0% | 1.0% | 2.9% | 50.2% | 1057.7ms | 1370.8ms | 34.9s | +0.0 pp |
| 0.59.0 | expanded-100 | 81.0% | 91.0% | 96.0% | 1.0% | 2.9% | 50.2% | 978.9ms | 1051.7ms | 33.7s | +0.0 pp |
| 0.59.0+semantic | expanded-100 | 88.0% | 97.0% | 98.0% | 0.0% | 4.7% | 42.3% | 1709.9ms | 1795.9ms | 76.4s | +6.0 pp |
| 0.60.0 | expanded-100 | 81.0% | 91.0% | 96.0% | 1.0% | 2.9% | 50.2% | 949.8ms | 1032.0ms | 33.9s | +0.0 pp |
| 0.60.0+semantic | expanded-100 | 88.0% | 97.0% | 98.0% | 1.0% | 2.5% | 55.5% | 1668.6ms | 1752.2ms | 74.8s | +0.0 pp |

The 0.57.1 jump reflects the full-text retrieval improvements (#204) reaching the CLI for the first time: 0.57.0 pinned `@ai-devkit/memory` 0.16.0 from npm, which predates #204 due to a missed version bump; 0.57.1 pins 0.17.0 with the fix.

The 0.58.0 and unqualified 0.59.0/0.60.0 rows use the default lexical configuration. Hybrid semantic search (#208) remains disabled by default. Rows labeled `+semantic` require the opt-in `memory.semantic: true` project setting and measure hybrid retrieval; the 0.59.0 semantic row's Δ hit@3 is relative to the 0.59.0 lexical row.

The 0.60.0 rows report Δ hit@3 against the corresponding 0.59.0 configuration. Hybrid noise reduction (#212) leaves recall unchanged while reducing judged-irrelevant top-three results from 4.7% to 2.5% and increasing judgment coverage from 42.3% to 55.5% in semantic mode.

All leaderboard rows use the same 25-need, 100-query, 100-memory `expanded-100` fixture set. The earlier 40-query 0.56.0 run remains in [`results/0.56.0.json`](results/0.56.0.json) for historical reference; the comparable re-baseline is [`results/0.56.0-with-new-fixtures.json`](results/0.56.0-with-new-fixtures.json). No composite score is reported: recall, empty responses, judged noise, coverage, and latency expose different trade-offs and remain independently reviewable.

## Run it

Requires Node.js 20.20 or newer.

```bash
npm ci
npm run validate

# Release mode: installs and evaluates the requested npm release.
npm run bench -- --version 0.56.0
npm run bench                         # defaults to @latest

# Write a versioned result document.
npm run bench -- --version 0.56.0 --output results/0.56.0.json

# Opt in to semantic retrieval for this isolated fixture project.
# This downloads/verifies the global model, embeds the corpus, and checks hybrid readiness.
npm run bench -- --version 0.60.0 --semantic --output results/0.60.0-semantic.json
```

Release installations are cached under ignored `.cache/` directories. Results record the package's resolved version.
The semantic model is cached globally under `~/.ai-devkit/models`; subsequent semantic runs reuse the verified download. Semantic mode adds `memory.semantic: true` only to the temporary fixture project's config, runs `memory reembed` after seeding, and refuses to benchmark unless status reports every fixture embedding current and an explained probe reports hybrid retrieval.

### Evaluate an ai-devkit pull request

Build the ai-devkit worktree, then point the benchmark at its actual CLI:

```bash
AI_DEVKIT_BIN=/path/to/ai-devkit/packages/cli/dist/cli.js \
  npm run bench -- --label feature-memory-search
```

This is the intended PR gate for ai-devkit developers. It uses a temporary project's `.ai-devkit.json`, seeds through that build's store command, and invokes the built CLI once per query.

### Debug one miss

```bash
npm run debug -- --version 0.56.0 --case retry-natural --explain
npm run debug -- --query "How do we safely change a production table?" --explain
```

`--explain` shows parsed result objects, wall time, and strategy metadata when the installed CLI exposes it. Search output JSON is a tested compatibility contract. Version 0.56.0 emits JSON by default; the harness uses that equivalent because that release does not accept an explicit `--json` option.

## What is measured

- hit@1, hit@3, and hit@5: whether any grade 1 or 2 memory appears by that rank.
- zero-result rate.
- judged-irrelevant-top-3 rate: grade 0 results divided only by explicitly judged top-three slots.
- top-three judgment coverage: how much of the returned top three has been reviewed.
- wall latency p50/p95: process spawn, Node startup, argument/config parsing, retrieval, and JSON output.
- seed time: wall time to store the complete corpus through the CLI with up to six concurrent processes.

Grades are `2` ideal, `1` supporting, and `0` explicitly irrelevant. Unjudged results are never silently called irrelevant.

The store path creates the database and real schema on first use, normalizes fixture input, and returns generated memory UUIDs. The runner maps fixture IDs to those UUIDs before scoring. Memories receive real store timestamps; concurrent seeding means timestamps reflect their actual batch execution rather than a synthetic fixed date.

## Fixtures

- [`fixtures/core/`](fixtures/core/) and the reviewed community fixtures form the maintained baseline: 25 information needs, 100 query cases, and 100 realistic memories with deliberate distractors.
- [`fixtures/community/`](fixtures/community/) is optimized for small, reviewable additions. Copy `example.yaml.template` to a `.yaml` file, use globally unique IDs, and keep one miss or tightly related need per file.
- [`fixtures/schema.json`](fixtures/schema.json) documents schema version 1 and store limits. `npm run validate` additionally enforces cross-file uniqueness, valid references, grades, variants, title length 10-100, content length 50-5000, and at least one relevant judgment per case.

See [CONTRIBUTING.md](CONTRIBUTING.md) to add a real-world miss.
