---
name: context-recovery
description: Recover the current requirement or issue when an agent or skill lacks context, has no issue number, or needs to recall what to implement before tests, implementation, or refactoring.
---

# Context recovery

## Recover

1. Read the conversation and handoff for the original goal, accepted decisions, and later user changes. A complete requirement here is sufficient; an issue is optional.
2. If needed, inspect relevant task documents and Git branch, commit, or PR metadata for references. Code and tests show implementation progress, not the intended requirement.
3. Resolve an issue's repository from its explicit link or Git remotes. Read its description, criteria, and relevant comments through an available connector or authenticated CLI.
4. Without an issue number, search the identified repository using concrete task clues. Inspect plausible matches; never select an issue merely because it is recent, open, or assigned. Stop when context is sufficient or candidates remain ambiguous.
5. Apply explicit user clarifications. Surface conflicts, missing access, and uncertainty; never invent criteria or claim unread sources were verified. Ask for the specific missing information and pause only dependent work. Propose a requirements interview if new product decisions are needed.

## Return and reuse

Return a concise brief to the requesting agent or skill:

- **Source:** Verified conversation, document, or issue reference; label unread references.
- **Goal and criteria:** Intended outcome, explicit constraints, and existing criterion IDs; separate assumptions.
- **Scope:** Included work, exclusions, and workflow constraints.
- **Progress and next step:** Verified work, remaining work, and its connection to the requirement.
- **Gaps:** Conflicts, missing information, and implementation blockers.

Keep the brief in context unless persistence was requested. Reuse it before dependent tests, implementation, and refactoring; recover again after context loss or changed requirements. Include it or its sources in handoffs. Passing tests alone do not establish success.

Recovery does not authorize code changes, issue updates, or another workflow. Follow repository guidance; reading `REFACTORING.md` does not invoke its explicit-only workflow.
