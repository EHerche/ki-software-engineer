# Signal Forms: documentation/examples variant

This independent experiment uses branch `experiment/signal-docs` in `D:/bookmonkey-signal-docs`. It migrates only the shared create/edit book form. Collection filters retain Reactive Forms; dependencies, routes, API clients and parent HTTP orchestration are unchanged. No commits or pushes were requested.

## Documentation and implementation

Context7 resolved Angular and queried `/websites/angular_dev/v21` for model/FieldTree/schema validation, submit/reset, and numeric input behavior. The Angular MCP discovered the primary Angular-21 workspace only; its best practices were checked against this worktree's installed Angular **21.2.26** types and implementation.

The model is a fully initialized `signal<BookFormDraft>`, including subtitle and nullable page count. `form(model, schema)` creates the FieldTree and `FormField` binds all nine editable fields. Required schema metadata replaces native required attributes; trim validation preserves whitespace rejection and ISBN is required only in create mode. The edit ISBN remains a separate readonly display. Field errors and touched state are callable signals.

The native `(submit)` handler calls `preventDefault()` before the pending guard and the Signal Forms `submit()` helper. Before validation, malformed native Pages input is cleared and dispatches an input event so FormField synchronously sees null, preserving the previous numeric value accessor behavior. The helper touches fields and validates; its callback emits the normalized model with blank pages converted to 0. Parent `exhaustMap` and pending inputs continue to own HTTP lifetime and duplicate-write protection. `form().reset(value)` resets values plus touched/dirty state only for initial-value or mode changes. Explicit field projection avoids introducing book IDs or server metadata into the draft.

Installed declarations confirm `form`, `FormField`, `required` with `when`, `validate`, `submit`, and `FieldState.reset(value)` signatures. Installed numeric input handling maps an empty input to null. Angular 21 marks Signal Forms experimental.

Sources:

- [Overview and model binding](https://v21.angular.dev/guide/forms/signals/overview)
- [Complete model design](https://v21.angular.dev/guide/forms/signals/model-design)
- [Schema validation](https://v21.angular.dev/guide/forms/signals/validation)
- [State and reset](https://v21.angular.dev/guide/forms/signals/field-state-management)
- [Native submission example](https://v21.angular.dev/tutorials/signal-forms/5-add-submission)

## Verification record

- Development build passed: `node node_modules/@angular/cli/bin/ng.js build --configuration development`.
- Production build passed: `npm run build`; initial bundle 387.60 kB, within budgets.
- Strict test/fixture TypeScript passed: installed `tsc --noEmit --strict --skipLibCheck --target ES2022 --module preserve --moduleResolution bundler --experimentalDecorators tests/fixtures/books.ts tests/book-create.spec.ts tests/book-edit.spec.ts`.
- Targeted Prettier passed for all seven changed/new implementation, test and documentation files. Strict test/fixture TypeScript and git diff whitespace checks also passed after the final changes.
- The first development build failed with NG8022 because `[formField]` owns required attributes. Moving required metadata into the schema and removing the template attributes resolved all four diagnostics. No additional validation rules were added.
- Existing create/edit suites cover payloads, required/whitespace correction, empty optionals/pages, retry after failure, pending duplicate protection, cancel/navigation, and responsive themes (SF-2 through SF-6). Two added `SF-6 / Enter...` tests exercise invalid-to-valid submissions and assert no document navigation for create and edit.
- Reviewer identified an additional compatibility issue: Angular 21.2 native Signal Forms numeric parsing reports badInput as a parse error and retains the previous model value, whereas the previous numeric value accessor treated its empty DOM value as null. Four real-keyboard Chromium regressions (create/edit, initially blank/previous valid number) failed at save/navigation before the fix. Create scenarios also verify required title validation still blocks submission. The native normalization described above was applied after this observed RED. The final nine-suite browser run passed **286/286** cases: **143 Chromium + 143 WebKit**, one worker, retries disabled, in 3.7 minutes. This includes all four new malformed Pages cases and both Enter cases per browser. The run used this worktree's own Playwright-managed server at port 4202, a temporary ignored config and fixture baseURL substitution. The fixture was restored byte-for-byte, the temporary config removed and the server stopped after execution. The final log is ignored `tmp/signal-docs-final.log`; the observed RED log is `tmp/signal-docs-red.log`. Firefox is excluded by the user; the external demo and legacy Karma suites are excluded. Mocked HTTP tests do not verify live backend persistence.

Test synchronization was strengthened using evidence from the parallel comparison: after setting Pages, two animation frames allow pending model-to-DOM rendering to finish before real malformed-number typing. The mobile/theme create scenario explicitly blurs Title and waits for its validation message before clicking the moved submit button. These are render/layout boundaries with the original assertions retained; no fixed sleeps, retries or weakened expectations were introduced.

The actual final command used `node node_modules/@playwright/test/cli.js test` with `tests/book-create.spec.ts tests/book-edit.spec.ts tests/book-details.spec.ts tests/book-list.spec.ts tests/book-filters.spec.ts tests/book-pagination.spec.ts tests/book-roulette.spec.ts tests/bookshelf.spec.ts tests/theme.spec.ts --config tmp/playwright.docs.config.ts --project chromium --project webkit --workers 1`. The temporary config set `retries: 0` and `reuseExistingServer: false`; browser binaries came from `D:/ki-software-engineer/tmp/playwright-browsers`.

The independent final source review reported no remaining issues. This experiment demonstrates a verified implementation; one comparison does not establish general superiority of documentation-assisted prompting.
