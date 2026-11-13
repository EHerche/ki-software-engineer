# Playwright UI test instructions

These instructions apply only to `tests/**`, including specs, page objects,
fixtures and utilities. Read the root `AGENTS.md` and `ARCHITECTURE.md` first.

## BookMonkey task scope

- Keep the existing `tests/` structure. Use one spec per feature and place page
  objects in `tests/pages/`; reuse `tests/fixtures/books.ts` for API data and mocks.
- Use `book-lifecycle.spec.ts` for journeys spanning multiple routes. Compose
  collection controls, preview, roulette and shell objects rather than inventing
  separate pages for features that live on the collection route.
- For create/edit/read journeys use `mockBookLibrary` from
  `tests/fixtures/book-library.ts`. Its library and write log are fresh per test;
  keep expected payload assertions in the spec.
- Describe user journeys with `test.describe` and Given/When/Then `test.step`
  blocks. Native Playwright is sufficient; do not add a Gherkin dependency.
- Put reusable locators and user actions in a feature page object. Keep scenario
  assertions and API overrides in the spec so expected outcomes remain visible.
- Prefer accessible `getByRole` and `getByLabel` locators. Use `getByTestId` for
  elements without a stable accessible locator. Do not add redundant IDs to
  already labelled controls or select by styling classes in new user journeys.
- Do not rewrite specialized existing timing, layout or component-contract tests
  merely to adopt page objects or BDD naming.

## Deterministic scenarios

- Import `test` and `expect` from the shared books fixture. Install route overrides
  before navigation; use `booksResponse` for collection pagination metadata.
- Mock backend and cover responses. No live API, external websites, shared book
  mutations, real credentials or test-order dependencies.
- Use awaited web assertions such as `toBeVisible`, `toHaveText`, `toHaveURL`,
  `toHaveValue` and `toHaveCount`; avoid fixed sleeps and immediate DOM snapshots.
- Exercise visible outcomes after search and clearing, not just input values.
  Wait for a completed filtered result before testing restoration.
- Cover happy paths, empty results, request errors/retry and relevant form
  validation. Check authorization only when an actual authorization flow exists;
  BookMonkey currently has no login or route guards.
- Preserve existing request cancellation, pagination, editing, creation, shelf,
  roulette and theme coverage. Do not weaken assertions to obtain a passing run.

## Validation for this task

- Run Chromium only with two workers: `npm run test:e2e`.
- For collection work only: `npm run test:e2e -- tests/book-list.spec.ts`.
- Firefox and WebKit remain configured for future use but must not be run for
  this task unless the user requests them.
- If using the existing browser cache in PowerShell, set
  `$env:PLAYWRIGHT_BROWSERS_PATH='D:\ki-software-engineer\tmp\playwright-browsers'`.
- Review `playwright-report/index.html`; open it with `npm run test:e2e:report`.
  Report actual test counts and blockers, and format only changed files.
- Run `npm run test:e2e:types` for strict test TypeScript checking. See
  `tests/README.md` for the coverage matrix, page objects and report workflow.
