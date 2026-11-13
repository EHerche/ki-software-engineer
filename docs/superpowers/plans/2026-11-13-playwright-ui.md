# Playwright UI Test Implementation Plan

**Goal:** Complete the task-specific UI test example using the existing app suite.

**Architecture:** Reuse mocked books fixtures and add a collection page object.
Keep assertions in native Playwright specs and record Given/When/Then report steps.

**Tech Stack:** Angular 21, TypeScript, Playwright Test.

**Spec:** [Approved scope](../specs/2026-11-13-playwright-ui-design.md).

## Constraints and review focus

Execute inline. Run Chromium only, with two workers. Preserve existing tests and
dependencies. Check restored results after completed searches, exact accessible
field names, route outcomes, and exclusion of the external starter demo.

## Implementation

- [x] Add `tests/AGENTS.md` scoped to specs, pages, fixtures and utilities.
- [x] Add `tests/pages/books.page.ts` with collection locators and user actions.
- [x] Extend `tests/book-list.spec.ts` with five BDD scenarios: rendering, title
      search/clear button, title search/empty input, details, and creation.
- [x] Add Chromium and report npm commands; keep the existing browser projects.
- [x] Exclude `tests/example.spec.ts` and disable automatic HTML report opening.
- [x] Run the full Chromium suite, strict test TypeScript, formatting and diff checks.
- [x] Review the report and record actual validation results.

## Execution notes

The first targeted run exposed an incorrect exact field name in the new creation
navigation test. The failure snapshot confirmed `Title *`; the selector was
corrected without changing the app. PowerShell/npm consumed the forwarded worker
option, so the resource limit is now explicit in the npm script. No production
code changes require a build or a legacy Karma run.

Validation: all 148 Chromium cases passed with two workers, including all five
new journeys. Firefox and WebKit were not run. Strict TypeScript passed using
ESNext modules, bundler resolution and experimental decorators. Targeted Prettier
and `git diff --check` passed; the architecture file retains its pre-existing
formatting outside the new paragraph.

Windows sandbox server teardown stalled after the test cases. Separate report
directories did not resolve that issue. Process inspection identified the exact
`npm start` process tree owned by the test; ending that tree with elevated
`taskkill` allowed Playwright to exit successfully and write the HTML report.
The final run used `--output=tmp/task4-test-results` and
`PLAYWRIGHT_HTML_OUTPUT_DIR=tmp/task4-playwright-report`; the report was copied to
the normal `playwright-report/` directory for `npm run test:e2e:report`.

## Whole-app extension

- [x] Add shared form, details, shell and composed collection component objects.
- [x] Adopt BDD steps in creation, details, editing, shelf and theme journeys
      without removing their existing assertions.
- [x] Add visible combined filtering/sorting, paginated preview/editor-cancel
      context restoration and roulette/details navigation journeys.
- [x] Add a test-local POST/PUT/GET library and lifecycle journeys in both themes.
- [x] Add strict `tests/tsconfig.json` and `npm run test:e2e:types`.
- [x] Document the coverage matrix, page objects, commands and limits in
      `tests/README.md`; align the architecture guide and scoped instructions.
- [x] Run and inspect the full Chromium suite: 153 passed in 50.9 seconds,
      two workers, zero unexpected/flaky/skipped cases; ten application specs.

The full run completed outside the sandbox, including normal server shutdown.
Review identified that the lifecycle's final search could assert against the
already-visible edited title before its request completed. The scenario now waits
for the specific `title_like=Revised` response before reopening the book; only the
two affected lifecycle cases need repeating after that strengthening.

The strengthened lifecycle cases both passed in the targeted rerun (6.6 seconds);
its report is in `tmp/whole-app-lifecycle-report/` so the full 153-case report
remains available through the normal report command. Strict test TypeScript,
changed-file formatting and diff whitespace checks pass. No reportable issues
remained in the final diff review; existing assertions were retained.
