---
name: ci-re-review
description: Re-analyzes a GitHub issue after recent changes for requirement clarity, completeness, and implementation risk; updates an existing analysis comment or adds one titled "🔄 Updated Analysis". Use when re-reviewing issues in CI, GitHub Actions workflows that comment on issues, or when the user invokes ci-re-review.
disable-model-invocation: true
---

# CI RE Review

Re-analyze this GitHub issue after recent changes.

Context:
- REPO: ${{ github.repository }}
- ISSUE: ${{ github.event.issue.number || github.event.comment.issue_url }}

If an analysis comment already exists, update it; otherwise add a new comment titled "🔄 Updated Analysis".

## Preserve human contributions

- Read the current issue, relevant discussion, and latest analysis comment before drafting. Human edits to a bot-authored analysis comment are requirement input too.
- Incorporate human corrections, additions, decisions, and open questions into the updated or replacement comment. Preserve their meaning and relevant wording; do not regenerate solely from the issue body or discard edits to fit the template.
- Describe conflicting input under **Gaps** and ask a specific question. Do not silently choose an interpretation or treat an ambiguous edit as implementation approval.
- Immediately before writing, re-read the target comment and relevant discussion. Incorporate concurrent changes before writing. If safe reconciliation is not possible, leave the existing comment intact and report the blocker.
- Read the result back and verify that human contributions remain. If a write outcome is uncertain, read before retrying to avoid duplicates.

## Labels and human approval

- For **SUFFICIENT**, apply `ready-for-implementation` and remove `needs-clarification` if present.
- For **NEEDS IMPROVEMENT**, apply `needs-clarification` and remove `ready-for-implementation` if present.
- Preserve unrelated labels. Create missing analysis labels when permitted; otherwise report the blocked operation. Read the issue back to verify the labels and report actual failures.
- `ready-for-implementation` indicates requirement quality only. Neither this label nor a **SUFFICIENT** verdict authorizes implementation.
- This skill performs analysis, comment updates, and analysis labeling only. Do not start tests, implementation, branches, pull requests, or an implementation workflow as part of this skill.
- Implementation requires separate, explicit approval from an authorized human for the current requirements. Record a verifiable approval reference under **Next steps**, or state **Awaiting human approval — implementation must not start**. Bot comments, automated labels, silence, and approval of an earlier requirement version do not approve the current scope.
- Any downstream implementation workflow must independently verify human approval before starting. Skill wording alone cannot enforce that gate in another workflow. If applying an analysis label would automatically start implementation without that check, leave the label unapplied and report the workflow blocker.

You review the issue as a **software requirement**: clarity, completeness, and implementation risk.

**Check (briefly, in priority order):**
1. **Intent** — Who benefits, what changes, why it matters (user story or equivalent).
2. **Scope & acceptance** — What “done” means; measurable criteria; out-of-scope if relevant.
3. **Gaps** — Missing inputs: data, APIs, UX, NFRs (performance, security), env/constraints.
4. **Engineering impact** — Dependencies, affected areas, migrations, rollout/rollback.

**Comment format (use exactly these sections, keep each section short — bullets preferred):**

## 🤖 Automated issue analysis

**Verdict:** SUFFICIENT | NEEDS IMPROVEMENT  
**One-line summary:** [what this issue is really asking for]

### Requirement quality
- User story / intent: [OK | partial | missing] — [1–2 bullets]
- Acceptance / definition of done: [OK | partial | missing] — [1–2 bullets]

### Gaps (blockers first)
- [bullet list; empty if none]

### Implementation notes
- Dependencies & blast radius: [bullets]
- Risks / open decisions: [bullets]

### Next steps
- If **SUFFICIENT:** report the applied label `ready-for-implementation` (or the actual blocker) and suggest a feature branch name without creating it.
- If **NEEDS IMPROVEMENT:** report the applied label `needs-clarification` (or the actual blocker) and ask **specific questions** (not generic).
- Human approval: [reference to explicit approval for the current requirements, or **Awaiting human approval — implementation must not start**].

---
_Automated analysis._
