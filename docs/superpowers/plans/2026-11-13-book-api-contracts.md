# Book API contracts and editor baseline — 2026-11-13

Task 1 is complete with concerns described below. No production code or real backend data changed.

## Evidence scope

Inspected cached `bookmonkey-api` **3.3.0**, resolved `json-server` **0.17.4** at
`C:/Users/eherchenhahn/AppData/Local/npm-cache/_npx/54da212763966c3b/node_modules/`.
The repository launches an external, unpinned package with `npx bookmonkey-api`;
these results describe the inspected package, not a guarantee about every running server or future npx resolution.

Primary sources in that package are `server.js`, `middlewares/book-validation.js`,
`middlewares/guards.js`, and `public/index.html`; JSON Server's
`lib/server/router/plural.js` and `lodash-id/src/index.js` establish paging and duplicate-ID behavior.
Context7 did not resolve Bookmonkey documentation, so package source and executable middleware were used.

The reproducible probe is
`.superpowers/sdd/2026-11-13-book-features/task-1-contract-probe.cjs`.
It uses `createServer({ books: syntheticBooks, users: [] })`, an in-memory database,
and a random loopback port. It never opens or mutates bundled/live book data.
Set `BOOKMONKEY_PACKAGE` to a different package directory to repeat against that installation.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'tmp/playwright-browsers'
node .superpowers/sdd/2026-11-13-book-features/task-1-contract-probe.cjs
```

Result: **10 POST cases and 17 paging cases passed**, plus an actual cross-origin
Chromium fetch reading `X-Total-Count: 17` with a ten-item response body.
Raw responses and parameters are in adjacent `task-1-contract-evidence.json`;
`task-1-contract-probe.log` records the run. A controlled Node child-process wrapper
returned exit code 0. The expected duplicate-ID case logs a server error to stderr;
PowerShell's initial combined-stream invocation classified that stderr as an error despite passing assertions.

## Create contract and decisions for dependent tasks

| Question                | Verified behavior / implementation decision                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint                | Unguarded `POST /books`, JSON content type, no auth or owner value required. Guarded prefixed endpoints have other rules and are outside the current client.                                                                                   |
| Backend required fields | Only present, string-valued `isbn` and `title`; absent/numeric values return 400 with mapped `errors`. Publisher/abstract are not backend-required.                                                                                            |
| UI required fields      | Keep the user-required non-whitespace ISBN, title, publisher, and abstract. No added checksum, price, URL or page-range rule. Backend is less strict, so there is no incompatibility.                                                          |
| ID generation and type  | Middleware explicitly sets `req.body.id = req.body.isbn`. A nonempty ISBN is returned as a string ID; a caller-supplied ID is overwritten. This is observed server behavior, never a client identity rule. Always navigate with `returned.id`. |
| Empty-string edge       | Empty ISBN/title are accepted by the backend; empty ID then triggers JSON Server string-ID generation. Whitespace ISBN/title are also accepted. Required UI validation prevents those submissions.                                             |
| userId                  | Omitted input yields omitted response/storage property. Supplied input is retained; no value is generated or required on `/books`. Do not copy a fixture owner or manufacture one.                                                             |
| Success                 | 201 with saved resource JSON, including the returned ID; JSON Server also sends Location.                                                                                                                                                      |
| Duplicate ID            | Same ISBN as an existing matching ID returns **500**, text containing `Insert failed, duplicate id`; the existing record and collection size remain unchanged. It is not a 409 contract.                                                       |
| Duplicate ISBN          | Uniqueness is enforced by ID. A legacy record with a different ID but the same ISBN permits another POST (201). No reliable ISBN uniqueness guarantee or client preflight follows.                                                             |
| Save retry              | Keep draft and show the ordinary inline error; only a deliberate new submission repeats POST. No automatic retry. Cancellation does not promise rollback.                                                                                      |

Use the following exact client input type, preserving the existing `Book` contract:

```typescript
export type CreateBookInput = BookChanges & Pick<Book, 'isbn'>;
export type CreatedBook = Omit<Book, 'userId'> & { userId?: number };
```

`CreateBookInput` comprises the existing eight editable fields plus ISBN; it excludes
ID and userId. The form sends its optional text values as empty strings and an empty
page count as 0; price remains a string. The create HTTP method must explicitly
construct/allowlist this payload. `CreatedBook` accurately models the response to this
complete client payload without inventing an owner. A minimal response `{ id: string }`
is also sufficient if the only consumer immediately navigates. Do not claim the
untouched `Book` response type proves runtime presence of userId on later GET requests.

## Pagination and roulette contract

- Use **1-based `_page` and `_limit`**, response body array and HTTP response header
  `X-Total-Count`. The count is calculated after all search/publisher filters and before paging.
  `Access-Control-Expose-Headers: X-Total-Count, Link` and reflected allow-origin were
  observed; a real second-origin Chromium page could read the count through Fetch.
- Keep q/escaped field `_like`/publisher `_like` filters unchanged on every page.
  Combined `q=Match`, `author_like=ada`, `publisher_like=target press` selected 17 of 29
  seed books, traversed as 10 and 7 items, each ID exactly once.
- An out-of-range page returns `[]` with the same filtered total. No-match results return
  `[]` and count 0. Exact page length is never a next-page indicator. The verified count
  contract makes an offset/lookahead fallback unnecessary.
- Sorting happens before slicing. Comma-separated multi-column sorting works:
  `_sort=numPages,id&_order=desc,asc`. Use an ascending ID secondary key for explicit
  title/author/page sorting, retaining the requested primary order. All five supported
  explicit sorting modes traversed the whole filtered set without duplicate IDs.
  Repeated requests yielded the same page. Default order is stable insertion order for
  unchanged data; preserve that existing default rather than silently changing its meaning.
- Roulette can load all pages with identical filters, sorting and fixed limit until the
  verified total is covered, deduplicate by ID, and choose only after successful completion.
  Errors/cancellation must prevent a partial-set draw. No durable candidate cache is required.
- These are separate HTTP reads: concurrent external changes can shift pages or counts.
  There is no server snapshot or transaction across a traversal. An ID tie-breaker and
  deduplication do not remove this limitation; do not claim snapshot consistency.

## Existing edit acceptance criteria and tests

Criteria were read from [issue #1](https://github.com/EHerche/ki-software-engineer/issues/1)
on 2026-11-13. No issue writes were performed. Existing tests in `tests/book-edit.spec.ts`
already cover the requirements; no artificial failing test was introduced.

| Criterion                  | Existing test title(s)                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 eight editable fields | `prefills all eight editable fields and shows the protected ISBN`; `saves every editable field with original ISBN and IDs and retains the changes on reload and in the collection` |
| AC-2 protected ISBN        | Same two tests; save test also tampers with the read-only DOM and checks original payload ISBN.                                                                                    |
| AC-3 original ID/userId    | `saves every editable field with original ISBN and IDs and retains the changes on reload and in the collection`                                                                    |
| AC-4 required validation   | `blocks empty required fields and accepts corrected values`; `blocks whitespace-only required fields and accepts corrected values`                                                 |
| AC-5 corrected values      | Same two validation cases, including preventing save while other required values remain invalid.                                                                                   |
| AC-6 open/prefill editor   | `prefills all eight editable fields and shows the protected ISBN`; shared `openEditor` uses Enter and checks Title focus.                                                          |
| AC-7 persisted save        | `saves every editable field with original ISBN and IDs and retains the changes on reload and in the collection` uses a stateful mock.                                              |
| AC-8 cancel                | `cancels without writing or changing details and reopens with original values`                                                                                                     |
| AC-9 failure/retry         | `retains all input after a 400/403/404/503/network save failure and allows retry` (five cases).                                                                                    |

Additional existing coverage checks pending disablement/duplicate submits, absent subtitle,
empty optional values/page count 0, navigation teardown, and both themes at 375/1440 px.

**Actual baseline:** all **17 Chromium cases passed**, no skips, failures, or flakes,
exit code **0**, **5.77 seconds**. JSON evidence is
`.superpowers/sdd/2026-11-13-book-features/task-1-edit-results.json`.

The requested normal command `npx playwright test tests/book-edit.spec.ts --project=chromium --reporter=line`
ran all 17 cases, then stalled during managed webServer teardown. A direct-CLI retry
with two workers and 90-second global timeout confirmed `17 passed`, but reported
`Timed out waiting 90s for the teardown for plugin setup to run`.
The definitive successful run reused the running frontend at :4200 with temporary
`tmp/task-1-playwright.config.ts`, which imports the existing config, preserves test
settings, omits managed webServer, and writes JSON:

```powershell
node node_modules/@playwright/test/cli.js test tests/book-edit.spec.ts --project=chromium --workers=2 --config=tmp/task-1-playwright.config.ts
```

This isolates an infrastructure teardown issue; it is not an application assertion
failure. Browser tests mock the API and prove UI behavior only; the independent real
middleware probe establishes the backend evidence above. No build, all-browser
regression or legacy Karma pass is claimed for this evidence-only task.
