---
name: refactor-angular
description: Refactor Angular components on request using project conventions, SOLID, and reactive composition. Preserve behavior after Green.
---

# Refactor Angular

Perform the Refactor step after `$implement-to-green` or another implementation workflow. Improve demonstrated structural problems while preserving observable behavior; completing Green or loading these instructions does not automatically start a refactor.

## Establish scope and baseline

- Accept specified components or the Green handoff. Default to the recent implementation and only the direct collaborators necessary for its cleanup; do not expand into a feature-wide or application-wide rewrite.
- Read applicable `AGENTS.md` files, architecture guidance, requirements, current changes, production consumers, tests, and prior verification results. Preserve unrelated work and the current accepted behavior, including behavior added after historical refactoring records.
- Inspect the installed Angular version and existing patterns. Use Context7 for framework-specific API questions, resolving the library ID before querying and checking version compatibility. General structural review does not require documentation queries.
- Reuse current test evidence only while relevant code, tests, configuration, and environment are unchanged; otherwise establish the baseline with targeted checks. Separate assertion failures from infrastructure blockers.
- When runnable baseline tests pass, proceed with focused refactoring despite documented infrastructure blockers, recording partial verification. Pause affected refactoring on actual baseline assertion failures and report the needed correction; do not mix feature fixes into cleanup. Continue independent work where justified.

## Record concrete findings

- Identify an observed structural problem, its maintenance impact, the smallest useful change, and behavior-preserving acceptance criteria. Do not manufacture findings to satisfy a checklist; a clean implementation may need no changes.
- Follow the repository's explicit review-and-refactor workflow. In BookMonkey, record the current scope, baseline evidence, findings, and acceptance criteria in a new section of `REFACTORING.md` before editing production code. Preserve completed historical records and do not replay their old findings or restrictions against newer accepted features.
- An explicit refactoring request authorizes changes within its scope. Ask only when unresolved intent or a material scope change blocks a decision; do not add a routine approval gate for every extraction.

## Refactor to project standards

- Keep one production component per file and follow local naming and companion-file conventions. Keep substantial templates external; small inline templates and local helper types may remain when consistent with the project.
- Keep methods and pipelines at consistent abstraction levels. Separate high-level orchestration from detailed transformations using focused, well-named helpers where this clarifies responsibilities. Keep lifecycle methods focused without extracting every expression into a method.
- Apply SOLID pragmatically: keep responsibilities cohesive; prefer composition and focused extension points; preserve substitutable public contracts; keep collaborator interfaces narrow; and inject dependencies at the appropriate boundary. Introduce an abstraction only for a demonstrated consumer or coupling problem, not one class or interface per principle.
- Preserve established ownership: HTTP services construct requests, screens compose local state and dispatch actions, and presentation components render inputs and emit events. Keep domain or transport details out of templates and avoid moving all local state into a speculative shared service or store.
- Prefer typed reactive composition over nested subscriptions and duplicated mutable state. Preserve subscription count, laziness, request timing, concurrency policy, cancellation, error recovery, and lifecycle teardown. Do not replace an operator merely because another is more familiar; switching reads and suppressing duplicate writes have different semantics.
- Follow local subscription ownership, such as one `AsyncPipe` subscription per screen state, with explicit cleanup for necessary imperative subscriptions. Constructors must not start requests, subscribe, or mutate external state; dependency injection and lazy Observable assembly are valid and do not by themselves require rewriting.
- Preserve component inputs/outputs, selectors, routes, API contracts, validation, error/loading states, accessibility, focus behavior, and responsive styling. Update references and consumers when moving files. Retain established framework and forms patterns rather than performing broad migrations; avoid new dependencies and unrelated cleanup.

## Preserve tests and verify

- Preserve behavioral tests and expectations. Allow mechanical import or setup updates required by structural moves, documenting why coverage is unchanged. Add focused characterization tests before changing a meaningful uncovered seam; avoid tests that merely mirror the new structure. Treat disputed behavior as a requirement question, not permission to weaken assertions.
- Before each run, check the current diff, prior results, and unresolved findings. Choose the smallest check that can resolve new uncertainty; do not repeat unchanged blockers or already-valid checks.
- Run targeted regressions during edits, then verify application unit and UI regression suites across configured projects/browsers and repository-required build, compilation, and formatting checks. Reuse valid evidence covering the final state and exclude unrelated external demo tests.
- Resolve regressions introduced by the refactor and rerun affected checks. Do not restart every suite without a relevant change or unresolved concern. Review the final diff against the recorded findings and acceptance criteria, including unintended public-contract or behavior changes.
- Distinguish passing, failing, blocked, and unexecuted checks. Missing runners, unavailable browsers, zero discovered tests, or skipped cases do not prove behavior preservation. With blockers, report partial verification rather than fully verified Green.
- Record actual results, remaining findings, and blockers in the repository's refactoring record when required. Update architecture guidance when responsibilities, file relationships, or data flow change. Stop once the scoped cleanup is complete; do not automatically start another phase.

## BookMonkey defaults

- Preserve the current typed RxJS state streams, input-driven presentation components, HTTP client boundary, and scoped source rules. Preserve debounce, cancellation, retry, save concurrency, form validation, immutable fields, navigation, and theme behavior relevant to the changed code.
- Discover the current mocked-API application suites, including editing and theme coverage where applicable; do not rely on a live API or external demo sites. The documented Jasmine/Karma setup has missing dependencies: check current evidence, report blocked unit verification, and do not install packages or claim `npm test` passes.

## Hand off

Return the findings addressed, structural changes and their purpose, any mechanical test adjustments or added coverage, and actual commands/results with project coverage. State remaining limitations and whether verification is complete or partial. If no useful refactor was found, explain that result without creating churn. Keep additional reporting in the response unless persistence is requested or required by the repository workflow.
