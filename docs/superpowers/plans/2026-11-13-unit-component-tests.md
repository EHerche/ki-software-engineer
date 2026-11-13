# Unit and component test plan and results

The user requested actual unit and component tests in addition to the existing
mocked-API UI suite. Use the Angular 21 unit-test builder with Vitest/jsdom, retain
the zone-based application, and keep browser verification limited to Chromium.
No production behavior change or dependency upgrade is needed. Install only the
missing compatible test development dependencies.

| Criterion | Given / When / Then                                                                                                                                                               | Test mapping                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| UC-1      | Given URL parameters, when normalizing/serializing/comparing them, then retain valid criteria and reject unsupported context                                                      | `book-collection-query.unit.spec.ts`, 24 cases  |
| UC-2      | Given user text, when checking required content, then reject blank/whitespace and accept meaningful text                                                                          | `book-form.model.unit.spec.ts`, 8 cases         |
| UC-3      | Given API calls, when subscribing and receiving responses, then construct correct requests, preserve protected fields and reject invalid page metadata                            | `book-api-client.unit.spec.ts`, 24 cases        |
| UC-4      | Given presentation inputs, when rendering/interacting/changing inputs, then show correct fallback, page boundaries and selection events                                           | Cover/pagination/item component specs, 13 cases |
| UC-5      | Given a preview, when navigating its controls or changing its book, then maintain dialog events, description and focus boundaries                                                 | Preview component spec, 7 cases                 |
| UC-6      | Given create/edit form inputs, when editing/submitting/cancelling or receiving save-state changes, then validate, emit normalized data and preserve/reset the draft appropriately | Form component spec, 9 cases                    |

- [x] Read scoped instructions, current code, installed builder schema and
      Angular-21 documentation through Context7 and Angular MCP.
- [x] Configure Vitest/jsdom with two workers and distinct commands/globs.
- [x] Add the eight specs and independent fixtures/DOM helpers.
- [x] Run tests against existing implementation; do not force artificial failures.
- [x] Fix the test-only header-map TypeScript inference and explicitly render
      fixtures after async form actions. The first complete execution was 82
      passed / 3 failed; all three failures were stale validation DOM assertions.
- [x] Verify `npm test`: 85 passed in eight files; `test:unit`: 56 passed in three
      files; `test:components`: 29 passed in five files.
- [x] Verify development and production compilation; production initial bundle
      387.60 kB, within budgets.
- [x] Verify the existing Chromium UI suite: 153 passed in 49.0 seconds, two
      workers, no Firefox/WebKit execution. Both test TypeScript checks and
      dependency-tree validation pass.
- [x] Document actual test levels and update stale current Karma guidance while
      preserving historical validation records.

No application source behavior was changed. Unit/component tests verify the
isolated layers; jsdom does not establish actual browser layout, and mocked HTTP
does not establish the external API or database contract. Existing browser tests
remain the regression layer for container orchestration and complete user flows.

Final review: eight source specs use explicit Vitest imports and preserve all
production code. Angular's builder discovers only the two intended spec naming
patterns; Playwright remains independent. Targeted formatting, documentation links
and diff whitespace checks pass. The complete verified total is 238 cases across
the three levels. No coverage percentage or live-backend verification is claimed.
