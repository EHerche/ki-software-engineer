# Angular 20 modernization

Modernize the whole BookMonkey application using the Angular MCP best-practices guide. The user selected modernization on Angular 20 rather than a framework upgrade. Preserve the reading-room UI, routes, API contract, search timing/cancellation, filters, roulette, editing, image recovery, accessibility and theme persistence.

Use Angular's official migration schematics for native template control flow, signal inputs/queries, functional outputs, inject-based dependency injection and lazy routes. Add explicit OnPush change detection and signal-backed local state. Retain the existing RxJS request orchestration with one AsyncPipe subscription per screen and the typed reactive editor form; replacing these with a new store would add risk without a concrete need. Remote, mutable book-cover URLs remain ordinary images; there are no static raster assets requiring NgOptimizedImage.

Alternatives: a framework upgrade was declined; a cosmetic-only cleanup would leave the principal best-practice gaps. No dependency upgrades, visual redesign or backend changes are needed.

Validate with development/production builds, all local application Playwright suites, strict test TypeScript checking, targeted formatting and diff review. The pre-existing incomplete Karma target is a known limitation. Keep ARCHITECTURE.md aligned with the final runtime behavior.
