# Plexa Engineering Workflow And Release Governance

## Core Philosophy
Plexa owns memory, knowledge, data, truth, audit history and approved learning.

OpenAI owns planning, review, fact checking, risk detection, learning proposals and architecture thinking.

Cursor owns building, small safe code changes, implementation, testing fixes and code generation.

`main` owns stable production code only.

## Golden Rules
- Never push directly to `main`.
- Always work on a feature branch.
- Never refactor unrelated code during bug fixes.
- Always choose the smallest safe change.
- Never change knowledge schemas, creator profiles, prompt rules, fact-check logic or reporter weighting without approval.
- No automatic learning into live systems. Use the proposal queue.
- Do not silently create assumptions. State missing context, confidence and risks.
- Ask before changing architecture when uncertain.

## Required Pre-Edit Explanation
Before modifying code, Cursor should state:
- What is broken.
- Which file causes it.
- Root cause.
- Smallest possible fix.
- Possible impact areas.
- Testing approach.

## Pre-Main Release Gate
Before merge, run:
- `npm run release:gate`
- Critical flow smoke tests.
- Admin-only access checks.
- Environment variable checks.
- OpenAI integration checks.
- Database/store checks.
- Context loading checks.
- Responsive UI checks.
- Dev Gateway `Release Check / QA Review`.

## Merge Rules
Code can only reach `main` when:
- TypeScript passes.
- Lint passes.
- Build passes.
- Unit/API tests pass.
- Smoke tests pass.
- OpenAI Release QA returns `SAFE TO MERGE`.
- Bazza approves.

## Release Summary Required
Before merge, produce:
- Changed files list.
- Release summary.
- Risk areas.
- Test results.
- Rollback plan.
- OpenAI Release QA output.
- Approval user.

## Rollback Rules
Every release must include:
- Rollback steps.
- Affected systems.
- Database changes.
- Environment changes.

## Audit Rules
Store release date, changed files, feature branch, test results, review output, approval user and rollback plan.
