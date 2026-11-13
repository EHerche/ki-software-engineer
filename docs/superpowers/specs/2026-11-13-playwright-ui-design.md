# Task 4: Playwright UI tests

The user approved extending the existing test structure and requested Chromium
only to reduce runtime and resource use.

Keep `tests/` rather than migrating to `e2e/`. Add a scoped instruction file and a
small collection page object. Use native Given/When/Then steps without a Gherkin
dependency. Accessible roles and labels already identify the controls, so no
application template changes or redundant test IDs are required.

The alternatives were a full directory migration or rewriting all existing specs
around page objects. Both add churn without additional behavior coverage for this
task. Retain specialized existing tests and mocked API fixtures.

Acceptance: show both fixture books, filter by title, restore the full collection
using either the clear button or an empty input, and navigate from the collection
to details and creation. Existing empty/error/retry and validation tests remain.
Run the complete application suite in Chromium with two workers, check test
TypeScript and changed-file formatting, and generate an HTML report. Exclude the
external Playwright starter demo from application discovery. Firefox and WebKit
stay configured but are not executed. No application behavior or dependencies
change.

## Approved whole-app extension

The user subsequently requested completing the whole-app approach and explaining
coverage and usage. Compose objects for filters, pagination, preview, roulette
and the shell with page objects for details and creation/shared editing forms.
Add BDD steps to representative journeys across every existing feature while
preserving specialized regression assertions. Add missing cross-feature flows:
create/read/edit/reload/rediscover in both themes, combined filtering with visible
sort order, paginated preview/details/cancel/return, and roulette/details/return.
Document the coverage matrix, mock boundaries, commands and report workflow in
`tests/README.md`; provide a repeatable strict test TypeScript command. The user
continues to authorize Chromium only, with two workers and no dependency changes.
