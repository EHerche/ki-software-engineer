---
name: requirements-interview
description: Interview the user to turn a rough feature idea into a user story, Given/When/Then acceptance criteria, and technical notes before implementation. Use for unclear requirements, not already clear implementation requests.
---

# Requirements interview

## Interview

- Reuse the conversation and referenced requirements; skip questions already answered.
- Ask one focused question at a time and wait for the answer. Start with the idea if none was supplied.
- Adapt questions to clarify the user, goal, observable behavior, scope, exclusions, constraints, and relevant failure or recovery cases. Seek concrete examples and measurable limits where needed.
- Reflect important decisions, resolve conflicting answers, and label proposals and assumptions. Do not answer for the user or treat silence as agreement.
- Stop when success is testable. If asked to finish early, draft the result with explicit gaps.

## Deliver

Use [assets/user-story-template.md](assets/user-story-template.md) to structure the result. Replace placeholders with interview findings, omit irrelevant sections, and keep unconfirmed details explicit. Provide a concise draft containing:

1. **User story:** As a <user>, I want <capability>, so that <outcome>.
2. **Scope:** Included behavior and explicit exclusions.
3. **Acceptance criteria:** Stable IDs (AC-1, AC-2, ...), each using **Given** <starting state>, **When** <trigger>, **Then** <verifiable outcome>. Cover relevant boundaries and failures; trace criteria to answers or labeled proposals.
4. **Technical notes:** Confirmed constraints, dependencies, and verification considerations; separate recommendations from requirements.
5. **Open questions and assumptions:** Remaining decisions and whether they block implementation.

Ask whether the draft captures the intended behavior, incorporate corrections, and return the complete result. Mark it agreed only after confirmation; keep unresolved questions visible.

Finishing the interview does not itself authorize tests, implementation, file writes, or issue creation. Follow any separate authorization already given.
