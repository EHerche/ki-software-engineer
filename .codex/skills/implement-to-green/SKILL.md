---
name: implement-to-green
description: Implement minimal production code to pass failing tests when Green-phase development is requested. Preserve valid tests.
---

# Implement to Green

Turn failing tests into working production behavior, verify Green, and stop before a separate refactoring phase. Follow `$scaffold-red-tests` when its handoff is available; failing tests from another source are also valid input.

## Read the contract

- Accept test files, failure output, and any Red-phase handoff. Read the tests and their setup, fixtures, actions, assertions, and expected errors; failure messages alone do not establish the full contract.
- Reuse the original story, acceptance criteria, scope, and latest user decisions from the conversation or referenced sources. Preserve criterion and scenario IDs. Recover missing context when needed; do not invent unread requirements or treat a proposed interface as an agreed product decision.
- When only tests are available and their intent is clear, use their expectations as the working contract and state that limitation. Ask a focused question for material ambiguity or conflicts that cannot be resolved from available evidence; continue independent work.
- Read applicable `AGENTS.md` files, architecture guidance, the current diff, production interfaces, test configuration, installed dependencies, and prior results. Preserve unrelated changes. Use Context7 for framework-specific guidance, resolving the library ID before querying and checking compatibility with the installed version.

## Diagnose the failures

- Reuse trustworthy failure evidence only while relevant code, tests, configuration, and environment are unchanged. Otherwise run the smallest relevant test selection to establish the current failure.
- Distinguish missing or incorrect production behavior, missing production contracts, test-code defects, and infrastructure failures. A missing production export may require implementation; a missing runner dependency does not establish a product defect.
- Map each supplied test to its required behavior and acceptance criterion when available. Identify existing coverage, already-passing cases, and pre-existing regressions. Do not create a new failure when behavior already passes.
- If infrastructure prevents execution, report the blocker once, continue clear implementation work where useful, and retain an unverified status. Do not install dependencies or repair runner configuration unless separately requested.

## Implement the minimum complete behavior

- Make the smallest production change that satisfies the contract and fits the existing architecture. Implement missing public interfaces where their intended contract is clear; resolve material design ambiguity before dependent changes.
- Cover all stated outcomes, including applicable boundaries and error handling. Minimal means sufficient behavior, not fixture-specific values, test-environment branches, fake success responses, or bypassed application logic.
- Preserve existing public contracts and behavior outside the requested feature. Avoid speculative abstractions, unrelated cleanup, dependency upgrades, and new state libraries. Keep required runtime documentation aligned with behavior changes under repository guidance.
- Iterate from observed failures: implement, run the affected tests, inspect results, and correct production behavior or proven test defects. Address regressions caused by the change; report unrelated failures without expanding scope into unrelated repairs.

## Preserve valid tests

- Do not change a test merely because it fails or is inconvenient to satisfy. Establish a concrete test-code defect or a contradiction with the agreed requirement before correcting it; an unexpected production result is not proof that the test is wrong.
- For a proven defect, make the smallest correction to the test or fixture, preserve intended coverage and criterion IDs, and record the evidence and before/after expectation or setup. Rerun the corrected case and affected regressions. Ask when the intended expectation remains ambiguous.
- Never skip or delete cases, remove or weaken valid assertions, focus the suite, mark failures expected, lower coverage requirements, or alter snapshots merely to obtain Green. Do not modify fixture behavior to perform the feature on behalf of production code.

## Check back and verify Green

- Before each run, check the requirements, current diff, prior results, and remaining failures. Identify what changed or remains unverified and choose the smallest run that resolves it. Avoid repeating unchanged blockers or already-settled checks.
- Once targeted tests pass, verify all application unit and UI regression suites using the configured projects/browsers, plus repository-required build, compilation, and formatting checks. Reuse current results that already cover the final state; run remaining checks once. Exclude unrelated external demo tests and disclose the suite selection.
- If final verification exposes a regression, diagnose and correct it, rerun affected checks, and invalidate earlier results only where the new change could affect them. Do not restart every suite without a relevant change or unresolved concern.
- Inspect actual outcomes: zero discovered tests, skipped cases, compilation failures, unavailable browsers, or blocked runners do not prove Green. Report passing, failing, blocked, and unexecuted checks separately, with commands and actual project coverage.
- Declare Green only when all required application suites and required checks pass against the final state. Otherwise report partial verification and exact blockers; do not describe a targeted pass as all tests passing. Stop before automatic refactoring or unrelated improvements.

## BookMonkey defaults

- Use the existing mocked-API application tests and `tests/fixtures/books.ts`; do not depend on the live Bookmonkey API or external demo sites for regression verification.
- The documented Jasmine/Karma setup has missing dependencies. Check current evidence, report affected unit verification as blocked, and do not install packages or claim that `npm test` passes.
- Follow the scoped source guidance and keep `ARCHITECTURE.md` aligned when runtime behavior changes. Reading `REFACTORING.md` does not invoke its explicit-only workflow.

## Hand off

Return a concise report containing:

- Production files changed and the behavior implemented.
- Every corrected test or fixture, the defect evidence, and the correction; state when tests were unchanged.
- Criterion/scenario coverage mapped to test locations and observed outcomes. Keep missing coverage or unresolved requirements visible; passing tests alone do not prove untested criteria.
- Commands, projects, and actual results for passing, failing, blocked, and unexecuted checks, distinguishing reused evidence from fresh runs.
- Whether Green is verified or verification is partial, with remaining blockers and the next required step.

Keep the report in the response unless persistence was requested. Completing Green does not automatically start another phase, publish changes, or update external work items.
