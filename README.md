# Agent Memory Bench

A community-maintained, black-box benchmark for agent memory retrieval—and a transparent view into how [ai-devkit](https://github.com/codeaholicguy/ai-devkit) improves over time.

The benchmark asks realistic developer questions about decisions, conventions, fixes, commands, and identifiers. It invokes the same `ai-devkit memory store` and `ai-devkit memory search` commands users and coding agents invoke, against an isolated project database. It does not import ai-devkit internals, SQLite libraries, or schema definitions, and never reads `~/.ai-devkit/memory.db`.

## Leaderboard

| ai-devkit | fixture set | hit@1 | hit@3 | hit@5 | zero results | irrelevant top-3 | judged coverage | wall p50 | wall p95 | seed time | Δ hit@3 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.56.0 | expanded-100 | 43.0% | 45.0% | 45.0% | 5.0% | 0.0% | 22.5% | 942.0ms | 1008.8ms | 33.2s | baseline |
| 0.57.0 | expanded-100 | 45.0% | 45.0% | 45.0% | 5.0% | 0.0% | 22.5% | 937.8ms | 1003.0ms | 32.0s | +0.0 pp |

Both leaderboard rows use the same 25-need, 100-query, 100-memory `expanded-100` fixture set. The earlier 40-query 0.56.0 run remains in [`results/0.56.0.json`](results/0.56.0.json) for historical reference; the comparable re-baseline is [`results/0.56.0-with-new-fixtures.json`](results/0.56.0-with-new-fixtures.json). No composite score is reported: recall, empty responses, judged noise, coverage, and latency expose different trade-offs and remain independently reviewable.

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
```

Release installations are cached under ignored `.cache/` directories. Results record the package's resolved version.

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
