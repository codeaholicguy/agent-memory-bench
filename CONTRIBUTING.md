# Contributing eval cases

The most valuable contribution is a small, sanitized search miss that represents how a developer or coding agent actually asked for stored knowledge.

## Add a case

1. Fork and clone the repository.
2. Copy `fixtures/community/example.yaml.template` to `fixtures/community/<short-topic>.yaml`.
3. Replace the example with the memory that should have been found, the original query, and realistic distractors.
4. Use globally unique, descriptive IDs prefixed by your topic.
5. Run `npm ci && npm run validate && npm test`.
6. Open a pull request describing why the expected memory answers the query.

Keep content free of secrets, personal data, private organization names, customer data, and proprietary code. Generalize details while preserving the retrieval challenge.

Fixture memories are written through the real `ai-devkit memory store` command. Titles must be 10-100 characters and content 50-5000 characters. Deliberate near-duplicate distractors are welcome when their content is distinct. Exact duplicate titles or content in the same scope are rejected by ai-devkit's deduplication; that failure is benchmarked product behavior, not something the harness bypasses.

## Judgment guide

- `2`: ideal answer to the information need.
- `1`: relevant supporting information, but incomplete.
- `0`: explicitly irrelevant or misleading despite sharing vocabulary.

Do not label every other memory `0`. Unjudged means “not reviewed”; the benchmark reports judgment coverage separately.

Use one of these query variants:

- `natural-language`: the original sentence or question.
- `keyword`: a terse search formulation.
- `paraphrase`: the same need expressed with different vocabulary.
- `identifier-exact`: an issue key, command, error code, symbol, or other exact identifier.

Multiple variants may share a `need`. Add only variants that exercise a genuinely different retrieval behavior; contributors do not need to supply all four.

## Review checklist

- The relevant memory actually answers the query.
- The wording resembles a real developer or agent request.
- Distractors are plausible, not toy negatives.
- IDs and content are stable and sanitized.
- Thresholds or old result files are not changed merely to accommodate a regression.

When a case lands, the main-branch workflow evaluates the latest ai-devkit release and publishes the metric table to the workflow summary. Maintainers periodically check in reviewed version results and update the README leaderboard.
