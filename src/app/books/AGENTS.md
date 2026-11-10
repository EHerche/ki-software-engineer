# Books feature guidance

Follow the root and `src/AGENTS.md` guides. Review [ARCHITECTURE.md](../../../ARCHITECTURE.md) and [REFACTORING.md](../../../REFACTORING.md) for context.

- `BookApiClient` owns endpoint/query construction and returns cold HTTP Observables. Keep the `Book` contract and existing routes unchanged.
- List and details components own their request orchestration and local discriminated state types. Keep expected HTTP failures inline with retry; details distinguishes 404 from retryable failures.
- A new search action cancels both pending debounce and active requests immediately. Typed searches wait 300 ms; initial load, clear, and retry do not wait. Never allow an older response to replace newer results.
- `BookItemComponent` and `BookCoverComponent` only render inputs. The cover component owns image failure state and resets it when its cover changes.
- Preserve the list's `pageSize` input/default of 10, detail deep links and browser history behavior, keyboard navigation, and responsive layouts.
- Add mocked-API Playwright coverage for behavior changes; never depend on the live API or external demo tests for feature regression coverage.
