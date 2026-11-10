---
name: finalize-requirements
description: Verify implemented acceptance criteria, run tests and build, and update and close the GitHub issue when delivery is confirmed.
---

# Finalize Requirements

Finish the requirements workflow with verification and traceability. Accept an issue reference and available requirements, Green, or Refactor handoffs. Finalisation verifies and reports delivery; it does not silently change production code, tests, or acceptance criteria.

## Recover the delivery contract

- Resolve the repository and issue from explicit instructions, the handoff, and verified project context such as Git remotes and branch/PR references. Do not select an issue merely because it is recent or assigned. If the target is missing or ambiguous, continue independent local verification and ask before any issue write. Do not create a replacement issue.
- Read the issue body, relevant comments, original acceptance criteria, and later agreed changes. Preserve criterion and scenario IDs. Distinguish approved requirements from proposals and expose conflicts or unread sources rather than inventing their content. If no approved criteria can be recovered, mark the contract unverified and ask before declaring delivery.
- Read applicable `AGENTS.md` files, architecture guidance, the current implementation and diff, tests, runner/build configuration, and prior verification results. Determine the actual delivery state: local changes, committed work, or merged changes. An issue's closed state does not prove that its requirements were delivered.

## Reconcile criteria with implementation

- Map every criterion and Given/When/Then scenario, including all Then/And outcomes, to implementation evidence and test or other direct verification evidence. Inspect the actual behavior; passing tests alone do not prove untested requirements.
- Mark each criterion **satisfied**, **unsatisfied**, or **unverified**, with concrete evidence and gaps. Preserve exclusions and unresolved questions. Do not rewrite a criterion to match the implementation or mark a proposal as approved.
- Use a concise coverage table in the report:

| Criterion / scenario | Implementation evidence | Verification evidence | Result / gap |
| -------------------- | ----------------------- | --------------------- | ------------ |

- If a requirement is unmet, coverage is missing, or intent remains ambiguous, report the needed correction for the earlier workflow stages. Do not automatically implement fixes, add or weaken tests, repair dependencies, or start refactoring during finalisation.

## Check back and verify

- Before each run, check what changed and which evidence remains valid. Reuse trustworthy results only when they cover the same final code, tests, configuration, and environment. Historical documentation or an unsupported claim of passing tests is not current execution evidence.
- Run the application's unit and UI regression suites across configured projects/browsers, the production build, and repository-required compilation and formatting checks. Reuse valid final-state results to avoid unnecessary reruns; disclose fresh versus reused evidence and exclude unrelated external demo tests.
- Record exact commands, actual outcomes and project coverage, the tested commit and branch where available, and relevant uncommitted/untracked feature changes. Do not describe a dirty working tree as identical to its HEAD commit or assume local results establish merged, deployed, or live-backend behavior.
- Distinguish assertion/build failures, missing coverage, infrastructure blockers, and unexecuted checks. Zero discovered tests, skipped cases, or a development build alone do not establish successful production verification. Report unchanged shared blockers once rather than repeatedly rerunning them.
- Keep finalisation pending when any criterion is unsatisfied/unverified or required verification fails or is blocked. An explicit user waiver may exempt a named infrastructure blocker; record its source and scope, never label it passed, and still require evidence that every acceptance criterion is satisfied. Do not waive assertion or source-build failures through this exception.

## Update GitHub and close when eligible

- A request to finalise with this skill authorizes the verification report and eligible issue closure without a second routine confirmation. Respect explicit review-only, no-write, or leave-open instructions. Loading the skill or finishing an earlier phase alone does not authorize issue writes.
- Prefer connected GitHub tools that support the intended ordinary-issue operation. Use an available authenticated CLI only for operations the connector cannot perform. Use structured body arguments or a body file for multiline CLI content; never place report text into shell commands through unsafe interpolation.
- Re-read the current issue and comments before writing. If the requirements changed during verification, reconcile the affected evidence first. Preserve the original body, criterion IDs, title, labels, assignees, milestone, and unrelated discussion.
- Add a concise verification comment with the implementation summary, criterion coverage, test/build evidence, actual local/committed/merged delivery state, and outstanding work or explicit waivers. Include available repository, commit, PR, and report links; use GitHub-usable file references rather than local filesystem links. Do not invent links for uncommitted changes.
- Reuse an equivalent report already present for the same tested state and evidence instead of posting a duplicate. Read back a new report to verify its content before attempting closure.
- Close an open issue with state reason **completed** only when every criterion is satisfied and each required check either passes or has an explicit waiver for its infrastructure blocker. Verified local implementation is sufficient by default; honor any stricter delivery requirement already agreed. If eligibility is not met, publish the actual verification status and leave it open.
- Leave already-closed issues closed; do not silently reopen them or post duplicate completion reports. If evidence contradicts the closed state, report that discrepancy without pretending delivery is confirmed.
- Read back the issue after a state change and verify the resulting state and reason. If a write times out or its outcome is uncertain, inspect the current remote state/comment before retrying. Stop repeated unchanged failures and report authentication, permissions, connectivity, or unsupported operations as pending; local success is not proof of a GitHub update.

## BookMonkey defaults

- Discover the current mocked-API application regression suites, including list, details, editing, and theme coverage, and configured browsers. Do not use the live Bookmonkey API or external demo tests as application regression evidence.
- Run or reuse current evidence for `npm run build` and the required source/test checks. The documented Jasmine/Karma target has missing dependencies: check current evidence, report blocked unit verification honestly, and do not install packages or claim `npm test` passes. Keep closure pending without an explicit waiver of that blocker.

## Completion summary

Return the issue link, delivery state, criterion coverage and gaps, actual test/build results and reused evidence, confirmed GitHub report and issue state, and remaining work. Distinguish **verified delivery**, **incomplete or blocked verification**, and **GitHub update pending** as applicable. Link the published report when available, cite any waiver explicitly, and never claim closure without read-back confirmation. Keep local reporting in the response unless persistence is requested.
