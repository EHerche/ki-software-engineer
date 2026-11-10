# Books feature refactoring

## Invocation and scope

The user requested creation of these instructions and explicitly asked to implement the accepted plan on 2026-11-10. Future runs start only after an explicit chat invocation such as **Apply REFACTORING.md to the latest generated code.** Automatically loading `AGENTS.md` does not invoke this workflow.

Review baseline: commit `f9aae02` (book details), including the existing collection screen. Preserve routes, API methods/query parameters, the `Book` contract, `pageSize` input/default, responsive styling, and details behavior. Use Angular 20 and the existing RxJS stack, with inline recovery. No new dependencies, store, global toast handler, Karma repair, or deployment changes.

## Findings and target patterns

| Finding in baseline                                                                                              | Maintenance impact                                                                                        | Target / acceptance                                                                                                         | Status   |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| `src/app/books/book-list.component.ts`: `searchTimeout: any`, `onSearchChange`, direct `loadBooks` subscriptions | Complete timers survive clear/destruction; older requests can overwrite newer data or clear loading early | One typed state stream; outer switching cancels timers and HTTP immediately; 300 ms only for typing; teardown on navigation | Complete |
| Same file: `loadBooks` error callback only logs                                                                  | Initial failure resembles empty results; later failure may display old results                            | Distinct inline error state with retry; empty UI only for successful empty responses; recover after subsequent actions      | Complete |
| List and details `template` metadata                                                                             | Large markup blocks obscure request logic and make reviews difficult                                      | External HTML templates, preserving layout and accessibility                                                                | Complete |
| `book-item.component.ts` and `book-details.component.ts`: cover/fallback markup                                  | Duplicate behavior; cards lack broken-image fallback                                                      | Feature-local cover component with cover/title inputs, common missing/broken fallback, reset on cover change                | Complete |
| `book-details.component.ts`: stream resets `coverFailed`                                                         | Request orchestration depends on unrelated mutable presentation state                                     | Cover state lives in the presentation component; lazy readonly request composition retains cancellation/404/retry behavior  | Complete |
| `ARCHITECTURE.md`: route, tests, and list descriptions predate details                                           | Guidance contradicts current code                                                                         | Update architecture and scoped instructions to describe the actual result                                                   | Complete |

The baseline details constructor **assembles a lazy Observable; it does not eagerly fetch**. Moving composition into readonly fields improves readability, not a constructor request bug. Existing API and toast service constructors only inject dependencies and need no rewrite.

## Validation and review

- [x] Development compilation and targeted formatting pass.
- [x] Existing details scenarios remain covered, including 404, server/network retry, missing/broken cover, deep links, cancellation, keyboard and mobile behavior.
- [x] New list tests cover loading, successful empty results, search, immediate clear, failures/retry, cancellation, and navigation teardown.
- [x] Shared cover behavior and reset on changed input are verified.
- [x] Final diff reviewed against every finding; no unrelated dependency or configuration changes.

Baseline: development compilation passes and 30 details cases are discoverable across Chromium, Firefox, and WebKit. Browser execution was initially blocked by absent browser binaries; provisioning resolved this as recorded below. Legacy Karma fails because `karma-jasmine` is missing. Production compilation fails while fetching Google Fonts under restricted network access. These are separate from application assertions.

## Completed implementation and review (2026-11-10)

- Added root/source/books agent guidance with inherited rules and an explicitly invoked refactoring workflow; preserved the supplied Context7 instructions.
- List now uses one lazy typed state stream with immediate cancellation of timers/HTTP on new actions and AsyncPipe teardown. Initial/clear/retry bypass the delay; typed input waits 300 ms. Loading and error states contain no previous results, and only successful empty responses render the empty UI.
- List/details markup moved to external HTML. Details keeps route-ID cancellation, direct navigation/history, 404 handling and retry; its request stream no longer mutates image state.
- Added the feature-local cover component with required cover/title inputs, fallback, and reset on cover change; both card and details consume it. Removed the stale card comment and narrowed its router import to RouterLink.
- Retained all 10 details scenarios; extracted shared API/book/image fixtures and added 15 list scenarios. The cover input contract test deliberately uses Angular's development debug API to update the parent while checking the same cover instance recovers.
- Reviewed runtime code, extracted templates, tests, instruction inheritance, and architecture links against every finding. Routes, API client/model, package manifests/lockfile, global providers, and build/test configuration are unchanged. No outstanding introduced defects were found in this review; live API behavior remains outside mocked coverage.

| Check                                                   | Result                                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Development compilation                                 | Passed: `node node_modules/@angular/cli/bin/ng.js build --configuration development`                                                                                     |
| Strict TypeScript check of fixture and both test suites | Passed: installed `tsc --noEmit --strict --skipLibCheck --target ES2022 --module preserve --moduleResolution bundler --experimentalDecorators` with the three test files |
| Chromium application suites                             | **25 passed**, no retries (4.9 s)                                                                                                                                        |
| Firefox and WebKit application suites                   | **50 passed**, no retries (44.8 s)                                                                                                                                       |
| Total application regression cases                      | **75 passed**: 25 per configured browser                                                                                                                                 |
| Targeted Prettier check                                 | Passed for all 14 changed/new files                                                                                                                                      |
| Documentation links and `git diff --check`              | Passed                                                                                                                                                                   |
| Visual review                                           | Chromium mobile details screenshot inspected; cover, full abstract, metadata and layout remain readable                                                                  |

Tests ran with two workers and API/image/font interception, without a live Bookmonkey server. Chromium results are in ignored `tmp/refactoring-playwright-chromium.log`; Firefox/WebKit results are in `tmp/refactoring-playwright-cross-browser.log`. Browser binaries are in ignored `tmp/playwright-browsers`; set `PLAYWRIGHT_BROWSERS_PATH` to that absolute directory when reusing them. Downloads required approved network access. A sandboxed combined run was interrupted after its 25 Chromium cases completed because Firefox launch stalled; the approved elevated Firefox/WebKit run passed all 50 cases. These environment workarounds required no tracked configuration changes.

Remaining pre-existing validation limitations: the legacy Karma target lacks `karma-jasmine`, and the sandboxed production build cannot fetch Google Fonts. Neither was repaired or represented as passing. External Playwright starter/demo tests were excluded because they do not check this application.
