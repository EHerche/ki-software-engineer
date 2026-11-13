# BookMonkey agent guide

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the application structure, data flow, and environment limitations. Keep it aligned with changes to runtime behavior. This is an Angular 21 workshop app with an external Bookmonkey API, not a production backend.

Instructions in `src/AGENTS.md` apply to source changes; `src/app/books/AGENTS.md` adds book-specific guidance. Preserve unrelated changes and avoid dependency upgrades or new state libraries unless requested.

## Commands

- `npm start`: frontend at http://localhost:4200.
- `npx bookmonkey-api`: separately starts the external API at port 4730; browser tests mock it.
- `npm run build`: production build; font inlining requires access to Google Fonts.
- `node node_modules/@angular/cli/bin/ng.js build --configuration development`: development compilation.
- `npx playwright test tests/book-details.spec.ts tests/book-list.spec.ts`: application regression tests across configured browsers.
- `npx prettier --check <changed-files>`: targeted formatting check. Format only changed files.
- `npm test`: all Vitest unit, Angular component and integration tests, once, in jsdom (two workers).
- `npm run test:unit` / `npm run test:components`: run the two test levels separately; `npm run test:watch` watches both.
- `npm run test:integration`: real container/form/API-client interactions against the HTTP test adapter. Watch mode includes this group too.
- `npm run test:e2e`: Playwright UI tests in Chromium with two workers. Keep Firefox/WebKit excluded unless requested.
- See [docs/testing.md](docs/testing.md) for test naming, scope and commands. Specs remain excluded from the application build.

Do not run `recreate-tags.sh` as a development or validation step: it deletes and pushes tags.

## Explicit refactoring workflow

Run the review-and-refactor workflow only when the user explicitly invokes it in chat, for example: **Apply REFACTORING.md to the latest generated code.** Loading this file alone must not start a refactor. Normal coding rules still apply to other requested work.

When invoked, inspect the latest code and current diff, document concrete issues and acceptance criteria in [REFACTORING.md](REFACTORING.md), apply the agreed changes, then review the resulting diff and run relevant checks. Record actual results and outstanding blockers; do not mark blocked checks as passed.

<!-- context7 -->

Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words)
4. Answer using the fetched docs
<!-- context7 -->
