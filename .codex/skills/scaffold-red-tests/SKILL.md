---
name: scaffold-red-tests
description: Generate and verify failing unit/UI tests from Given/When/Then criteria when Red-phase testing is requested. Stop before production code.
---

# Scaffold Red Tests

Generate tests for the required behavior, attempt to verify why they fail, and hand off for implementation. Use the repository's test stack; Jasmine and Playwright are examples, not required dependencies.

## Establish the requirement

- Reuse the story, criteria, scope, and technical constraints from the conversation or referenced document, including output from `$requirements-interview`. Read referenced requirements before using them; do not invent unread content.
- Preserve acceptance-criterion IDs. If absent, assign stable `AC-1`, `AC-2`, etc. in the test mapping without rewriting the source. Give multiple scenarios under one criterion distinct labels while preserving its ID.
- Resolve test-blocking ambiguity with a focused question. Use `$requirements-interview` if product decisions are still needed; continue with independent, testable scenarios. Do not turn assumptions into confirmed requirements.
- An interview ending does not automatically invoke this skill or authorize test writes. Follow the user's separate request to generate tests; do not repeat an already completed interview.

## Inspect the repository

- Read applicable `AGENTS.md` files and architecture guidance. Inspect the current diff, relevant production interfaces, existing tests, fixtures, runner configuration, installed dependencies, and documented commands.
- Discover the existing unit and UI frameworks and where specs belong. Use Context7 for framework-specific APIs or configuration, resolving the library ID before querying documentation. Check compatibility with the installed version; do not introduce a new framework by default.
- Reuse matching coverage instead of adding duplicates. Check targeted existing tests when feasible to distinguish pre-existing failures from new ones. Do not run unrelated demo suites as feature validation.
- In BookMonkey, reuse `tests/fixtures/books.ts` for mocked-API Playwright coverage. The documented Jasmine/Karma target has missing dependencies; verify available evidence and report runner failures as infrastructure blockers.

## Map and scaffold tests

- Map every Given/When/Then scenario to at least one named test at an appropriate layer. Use unit tests for isolated logic and contracts, UI tests for observable user journeys, and both when each contributes meaningful coverage. Explain the layer choice briefly in the handoff.
- Include the criterion ID and scenario label in each new test title. Map existing tests by their current title without renaming unrelated coverage. Expand concrete scenario examples into separately identifiable cases.
- Translate Given into fixtures and preconditions, When into the actual application action, and Then/And into assertions for every stated outcome. Keep the outcomes of one scenario together; separate independent scenarios. Avoid adding acceptance criteria that were not supplied.
- Write specs against real production interfaces or UI. For a missing public contract, record the minimum interface the test expects as a proposal; do not create production stubs or speculative architecture to make it compile. Ask only when a material contract decision blocks useful tests.
- Mock external dependencies and use deterministic test data. Reuse local fixture patterns; unit spies may replace collaborators, but must not replace the behavior being tested. UI fixtures must not synthesize the feature's UI or perform its behavior for the application.
- For Jasmine, use executable `it` cases with behavioral expectations. For Playwright, use user-facing locators, awaited assertions, isolated state, and mocked external requests. Avoid arbitrary sleeps; use the repository's clock or synchronization patterns where needed.
- Do not use unconditional failures, assertions disconnected from the requirement, empty test bodies, TODO-only scaffolds, focused tests, skipped/pending tests, or expected-failure annotations to manufacture Red. Never weaken existing tests or force correct behavior to fail.
- Change only tests and necessary test fixtures. Do not write production code or stubs, change dependency manifests or lockfiles, install packages, repair runner configuration, or update snapshots to bypass assertions. Report setup work separately.

## Check back before running

- Before each run, check the requirements, current diff, and prior results. Identify what changed or remains unverified, then choose the smallest run that resolves it.
- Reuse results while relevant code, tests, configuration, and environment are unchanged. Rerun or broaden checks only for relevant changes or unresolved evidence; do not repeat confirmed Red results or unchanged runner blockers.

## Verify Red

- Discover the new cases and run targeted tests using the existing configuration. Use commands scoped to the relevant files or cases; report the browser/project actually exercised. Run relevant test compilation or formatting checks when available.
- Inspect the failure output rather than treating a nonzero exit code as proof of Red. Correct defects in the generated tests and rerun affected checks; do not fix production behavior.
- Classify each mapped test using observed evidence:
  - **Verified failing:** The scenario executed and an assertion or application interaction failed because required behavior is missing or incorrect. Record the expected behavior and observed failure, including the failing step.
  - **Already passing:** The scenario executed successfully. Keep valid coverage and explain that the tested behavior already exists; do not force a failure.
  - **Unverified:** The scenario could not execute or its outcome is inconclusive. Identify missing production contracts, compilation/discovery errors, test defects, infrastructure failures, or unavailable execution separately. A missing import or runner is not a verified behavior failure.
- If a shared runner blocker prevents execution, report it once and mark affected cases unverified. Still scaffold meaningful tests where the contract is clear. Do not claim completion of Red while required scenarios remain unverified.
- Preserve all relevant coverage even when some scenarios are already passing. Stop after tests and evidence; do not begin Green or refactoring.

## Hand off

Return the requirement source, changed test files, and an acceptance-criterion coverage table. Include a row for each test or uncovered scenario with:

| Criterion / scenario | Layer and reason | File and test title | Command / project | Status | Observed failure or blocker |
| -------------------- | ---------------- | ------------------- | ----------------- | ------ | --------------------------- |

Distinguish tests written from tests executed. Summarize gaps, proposed contracts, exact setup blockers, and the next production behavior to implement. Keep the report in the response unless persistence was requested. Do not describe unverified cases as confirmed Red or imply that passing tests establish untested acceptance criteria.
