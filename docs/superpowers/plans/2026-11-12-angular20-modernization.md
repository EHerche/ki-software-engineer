# Angular 20 Modernization Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply Angular MCP best practices throughout the app without changing user-facing behavior.

**Architecture:** Preserve cold HTTP observables, switching request streams and typed reactive forms. Modernize component boundaries, local state, templates and route loading on Angular 20.

**Tech Stack:** Angular 20.2, TypeScript, RxJS 7.8, Playwright.

**Spec:** ../specs/2026-11-12-angular20-modernization-design.md

## Global Constraints

- Preserve routes, API contracts, UI and accessibility.
- No dependency upgrades or new state libraries.
- Keep one AsyncPipe subscription per request state.
- Preserve the pageSize input/default of 10 and immediate cancellation before the 300 ms search debounce.
- Preserve unrelated user changes.

## Review Focus

- Cover failure must reset when the existing component receives another URL.
- Device-theme changes must update the OnPush root without a user click.
- Search/filter changes must cancel requests and roulette previews.
- Editor input resets, pending-save teardown and focus restoration must survive migrations.
- Deep links and browser history must work with lazy route chunks.

### Task 1: Establish baseline and migrate Angular APIs

- [x] Run all application suites in Chromium before migration.
- [x] Run official control-flow, signals, inject and lazy-route schematics over src.
- [x] Review generated changes, including lifecycle-dependent input skips and tests that mutate decorator inputs directly.

### Task 2: Complete component modernization

- [x] Add OnPush throughout, remove redundant standalone flags, replace broad CommonModule imports with specific pipes.
- [x] Convert local state and derived values to signals/computed; keep typed reactive forms and RxJS orchestration.
- [x] Migrate collection filters to typed reactive controls without changing debounce behavior.
- [x] Adapt the reused-cover regression to read the signal input and force checking its parent through Angular's development debug API.
- [x] Compile and run focused image/theme/search/editor regressions, fixing any migration defects.

### Task 3: Validate and document

- [x] Run production/development builds and all application suites across available browsers.
- [x] Run strict test TypeScript, targeted Prettier and git diff whitespace checks.
- [x] Update ARCHITECTURE.md with final behavior and actual validation results.
- [x] Review the final diff for unrelated changes and remaining legacy APIs.

## Execution notes

Worktree creation was attempted but blocked by the sandbox's read-only .git permissions; execute in the existing workspace. The only pre-existing change is untracked .codex/config.toml. This is a behavior-preserving migration covered by existing regression tests, so do not add tests that merely mirror implementation syntax.
