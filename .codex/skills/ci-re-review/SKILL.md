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

- `ready-for-implementation` is the implementation approval signal. When it is present for the current requirements, implementation may start without another confirmation.
- An authorized human can grant approval by applying `ready-for-implementation` directly or by explicitly approving the current requirements in a comment. For **SUFFICIENT**, apply the label after such explicit approval, or preserve it if already present for the current requirements; remove `needs-clarification` if present.
- A **SUFFICIENT** verdict alone does not grant approval. Without human approval, leave `ready-for-implementation` unset and state **Awaiting human approval — implementation must not start** under **Next steps**.
- For **NEEDS IMPROVEMENT**, apply `needs-clarification` and remove `ready-for-implementation` if present. If requirements materially change after approval, remove `ready-for-implementation` and request renewed human approval for the changed scope.
- Preserve unrelated labels. Create missing analysis labels when permitted; otherwise report the blocked operation. Read the issue back to verify the labels and report actual failures.
- This skill performs analysis, comment updates, and labeling. It does not itself implement the issue. Applying `ready-for-implementation` after human approval may trigger a separate implementation workflow.
- Record the approval source under **Next steps**: the existing `ready-for-implementation` label or a reference to the explicit human approval comment. Bot-generated approval, silence, and approval of an earlier requirement version do not authorize setting the label for the current scope.
- Any downstream implementation workflow must check that `ready-for-implementation` is currently present before starting. No additional confirmation is required when that approval label is present. Skill wording alone cannot enforce the check in another workflow.

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
- If **SUFFICIENT:** report whether `ready-for-implementation` is present after human approval or approval is still pending; report any label blocker and suggest a feature branch name without creating it.
- If **NEEDS IMPROVEMENT:** report the applied label `needs-clarification` (or the actual blocker) and ask **specific questions** (not generic).
- Human approval: [`ready-for-implementation` present — implementation may start; reference the human approval comment if used, or **Awaiting human approval — implementation must not start**].

---
_Automated analysis._
