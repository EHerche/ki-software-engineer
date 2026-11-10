---
name: requirements-interview
description: Interview the user to turn a rough feature idea into a user story, Given/When/Then acceptance criteria, and technical notes, then publish it as a GitHub issue after final approval. Use for unclear requirements, not already clear implementation requests.
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

Ask whether the draft captures the intended behavior and incorporate corrections. Explain with that final confirmation request that the approved story will be published as a GitHub issue in the identified repository. Mark it agreed only after confirmation; keep unresolved questions visible.

## Publish after final approval

- Always publish the final approved story as a GitHub issue. The user's final approval authorizes this publication; do not ask for a second publication confirmation. Honor any explicit instruction to withhold publication.
- Resolve the target repository from the user's instructions or the current project's Git remote. Ask only if the destination remains missing or ambiguous.
- Prefer the connected GitHub tools. Use an available authenticated GitHub CLI only when the connector cannot perform the operation.
- Before creating an issue, check open and closed issues for the same title and feature. Reuse an existing issue if it already contains the agreed story; do not create a duplicate or silently overwrite a different scope.
- Use a concrete feature title and a self-contained body with the approved user story, scope, acceptance criteria, technical notes, and remaining questions. Preserve stable AC IDs and proposal labels. Make repository documentation links usable from GitHub.
- Read the created or reused issue back and verify its title and content. Finish with the issue URL and a concise summary. A chat response or local planning file alone does not complete this workflow.
- If a write times out or its outcome is uncertain, search for the issue before retrying. If publication is blocked by authentication, permissions, or connectivity, report the actual blocker and leave publication pending; do not claim success or substitute a local file.

Final approval authorizes publishing the agreed story, not tests, implementation, or unrelated file writes. Follow any separate authorization already given.
