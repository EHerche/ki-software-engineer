# Test pyramid execution and migration record

The user explicitly requested moving from the broad browser suite to the test
pyramid. Keep critical journeys and actual browser behavior at the top, replace
detail matrices on lower levels, preserve application behavior, and run Chromium
only. No new packages or production refactor is needed.

- [x] Inspect existing specs, container orchestration and scoped rules; verify
      current Angular TestBed/Vitest guidance via Context7 and Angular MCP.
- [x] Enable `*.integration.spec.ts` and a separate `test:integration` command.
- [x] Build a test harness with real templates/forms/API client and controlled
      route events plus HttpTestingController; retain real routing/history tests
      in the browser because harness navigation is controlled.
- [x] Establish replacement integration coverage before reducing browser cases:
      debounce, cancellation, route teardown, page correction, error recovery,
      mutations, duplicate submission protection and roulette candidate loading.
- [x] Move theme preference/storage/listener details into unit tests and native
      bad-number normalization into component tests with an explicit jsdom limit.
- [x] Reduce active browser specs from 153 to 20; remove redundant create/edit/
      filter specs, keeping their critical journey in the lifecycle spec. No
      `.skip` or hidden legacy suite is used. The detailed mapping is in
      `docs/testing.md`.
- [x] Keep native Enter, real Back/Reload, actual animation under both motion
      settings, keyboard/focus, CSS contrast and selected layout matrices.
- [x] Verify all 20 Chromium cases: passed in 16.0 seconds with two workers.
- [x] Verify the final 147 lower-level cases and TypeScript.
- [x] Complete final formatting, report and documentation-link checks. The current
      HTML report confirms 20 expected Chromium cases, zero failures/flaky/skipped
      cases; source and browser TypeScript checks pass. All 147 lower-level cases
      pass in the final combined run (13 files). No production build was repeated
      because runtime source, dependencies and production build options did not
      change.

Initial integration failures were test harness issues: required edit inputs must
be set before rendering, and retries must wait for Signal Forms' submit action to
finish, not only for the HTTP error. These were corrected in tests. A rewritten
browser helper lost a non-ASCII button character; it now reuses the existing
roulette object and the complete browser rerun passed.

Target distribution: 63 unit + 31 isolated component + 53 integration + 20 browser
= 167 cases. Grouped by pyramid layer this is 94 isolated / 53 integration / 20
browser. Counts are not a coverage percentage or proof of every legacy
combination; duplicated matrices are intentionally consolidated. Production
behavior and dependencies remain unchanged.
