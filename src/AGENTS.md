# Shared source guidance

Follow the root guide and [architecture](../ARCHITECTURE.md).

- Use strict TypeScript and Angular template types; avoid `any` and unchecked error assertions.
- Constructors must not start requests, subscribe, or mutate external state. Dependency injection and lazy Observable composition are valid there; readonly field initialization can make composition clearer.
- Represent loading, success, and recoverable failure explicitly. Catch request errors inside switching streams so later user actions still work.
- Prefer one `AsyncPipe` subscription per screen state; it owns teardown on destruction. Any necessary imperative subscription needs explicit lifecycle cleanup.
- Keep substantial templates in external HTML. Templates render state and dispatch named actions; services own HTTP details.
- Extract repeated behavior with a concrete consumer, rather than adding speculative generic stores or abstractions.
- Preserve accessibility and responsive styling. Follow the root Prettier configuration: two spaces, single quotes, semicolons, LF, no trailing commas.
