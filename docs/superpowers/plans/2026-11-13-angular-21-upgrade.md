# Angular 21 Upgrade Implementation Plan

**Goal:** Upgrade Angular 20 to the newest stable Angular 21 packages without migrating forms or changing application behavior.

**Architecture:** Use official `ng update` package groups and migrations. Preserve zone-based change detection, reactive forms, existing routes, API orchestration and tests. Upgrade third-party Angular packages only where their peers require it.

**Tech Stack:** Angular, Material/CDK, NgRx Signals/Toolkit, TypeScript 5.9.2, Node 24.22.1, Playwright.

**Spec:** User request in this session (2026-11-13).

## Constraints and review focus

- No signal-forms migration, unrelated refactoring, dependency cleanup, blanket `--force`, or test-runner migration.
- Preserve the pre-existing untracked signal-forms plan.
- Check all installed Angular-related package peers before updating, including optional peers.
- Check official Angular 21 documentation through Context7 and installed target package metadata.
- Verify builds and every application Playwright suite across Chromium, Firefox and WebKit; report legacy Karma failures separately.

## Execution

- [x] Inspect repository instructions, architecture, Node/TypeScript and installed Angular-related peers.
- [x] Resolve target releases and compatible third-party packages from npm metadata and Angular 21 documentation.
- [x] Run official `ng update` for core/CLI, SSR, Material/CDK and NgRx, including compatible Toolkit in the same dependency transaction.
- [x] Review migration diff; retain existing forms and behavior. Do not opt into optional modernization migrations.
- [x] Run development build, production build, all application tests, legacy test command and dependency validation.
- [x] Update architecture/version documentation and record actual commands, migration results and blockers.

## Actual outcome

Angular 21.2.26 and its current 21.x tooling are installed; all applicable required official migration collections completed without source changes. Development/production builds, dependency validation, test TypeScript, tooling build and formatting pass. Chromium passes 137/137; WebKit passes 137/137 in the complete serial rerun after two initial parallel failures. The original full run was 404/411. Firefox had five failures and was excluded from further verification at the user's request. The existing missing karma-jasmine dependency blocks the legacy suite. See [the upgrade report](../../upgrades/angular-21.md) for commands, full peer audit and limitations.
