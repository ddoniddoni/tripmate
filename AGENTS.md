# TripMate Repository Instructions for Codex

## 1. Purpose and instruction sources

This repository builds **TripMate**, a portfolio-grade collaborative travel itinerary editor.

Before implementing product, architecture, state, drag-and-drop, collaboration, map, accessibility, performance, or test changes, read:

- `docs/TRIPMATE_ENGINEERING_GUIDE.md`

For pull requests, follow:

- `.github/pull_request_template.md`

More specific `AGENTS.md` or `AGENTS.override.md` files closer to the working directory may add local rules. Do not contradict this root file unless a closer instruction or an explicit user request overrides it.

## 2. Communication and working protocol

- Communicate with the user in Korean unless another language is requested.
- Use English for code identifiers, file names, commit messages, and technical comments.
- Before editing, inspect `package.json`, nearby code, relevant tests and docs, and `git status --short`.
- Preserve all existing and user-authored uncommitted work.
- Never reset, clean, stash, discard, overwrite, or reformat unrelated changes without explicit permission.
- For a non-trivial task, provide a short plan with scope, expected files, acceptance criteria, and verification before editing.
- Do not ask questions whose answers are already defined in repository instructions or visible in the codebase.
- When a missing detail is non-blocking, make the smallest reasonable assumption and report it.
- Keep each task focused. Do not mix unrelated refactors, formatting sweeps, dependency upgrades, or cleanup.
- Prefer the smallest complete vertical slice over a broad partial implementation.
- Search for an existing component, utility, type, adapter, or pattern before adding another.
- Do not create abstractions solely for hypothetical reuse.
- Use official or primary documentation when integration behavior must be verified.
- When credentials or external services are unavailable, use typed adapters and deterministic mocks. Never invent credentials or claim live verification.
- Review the final diff for unintended files, debug output, secrets, dead code, and regressions.
- Never claim that a command, test, migration, browser check, or build passed unless it was run and succeeded.

## 3. Package manager and dependencies

Use **npm only**.

- `package-lock.json` is the only lockfile.
- Do not create or use Yarn, pnpm, or Bun lockfiles.
- Use `npm install <package>` and `npm install -D <package>`.
- Use `npm ci` in CI and clean reproducible environments.
- Never edit `package-lock.json` manually.
- Reuse installed dependencies before adding a new one.
- Approved stack dependencies may be added when required by the task.
- Any new unapproved production dependency requires a concise rationale and explicit user approval.
- Do not perform broad dependency upgrades inside feature or bug-fix work.
- Check maintenance status, bundle impact, and license suitability before adding a package.
- Do not install project tooling globally.

Expected scripts, when the related tooling exists:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

Do not add placeholder scripts that do not work. Preserve equivalent existing script names unless standardization is explicitly requested.

## 4. Approved project stack

Use installed repository versions. Do not pin or upgrade versions without a task-specific reason.

- Next.js App Router and React.
- TypeScript strict mode.
- Tailwind CSS with shadcn/ui or Radix primitives.
- dnd-kit for drag and drop.
- Zustand for shared local UI state.
- TanStack Query for ordinary server state.
- Liveblocks for collaborative document state, presence, and history.
- Mapbox behind project-owned adapters for map, search, and directions.
- React Hook Form and Zod for forms and validation.
- Vitest, React Testing Library, and MSW for unit/integration tests.
- Playwright for end-to-end tests.
- Supabase only when authentication, trip metadata, membership, persistence, or server authorization is required.

Prefer browser and framework capabilities when they are sufficient.

## 5. Architecture guardrails

Use the feature-oriented layout described in the engineering guide.

Core dependency direction:

```text
app -> features -> entities -> shared
```

- Lower layers must not import higher layers.
- Default to Server Components.
- Add `"use client"` only at the smallest interactive boundary.
- Never import secrets, database clients, or server-only modules into client code.
- Avoid duplicate sources of truth across Liveblocks, TanStack Query, Zustand, URL state, and form state.
- Do not copy TanStack Query data into Zustand.
- Do not keep a second local copy of a Liveblocks collaborative document.
- Keep high-frequency drag preview and map viewport state local.
- Commit one domain mutation on drag end rather than writing on every pointer move.
- Route and place providers must be accessed through typed, mockable adapters.
- Validate external and untrusted data with Zod.
- Keep domain mutations typed and testable.
- Use stable IDs, never array indexes as list keys.

## 6. Code quality rules

- Keep TypeScript strict.
- Avoid `any`; use `unknown` and narrow it.
- Avoid non-null assertions and unsafe casts.
- Use literal unions or discriminated unions for roles and state machines.
- Prefer pure functions for domain calculations.
- Do not use effects for values that can be derived during render.
- Clean up subscriptions, timers, observers, event listeners, and map instances.
- Do not suppress lint, TypeScript, or hook warnings without a documented reason.
- Remove debug logs, commented-out code, temporary flags, and unused exports.
- Avoid `dangerouslySetInnerHTML`. If explicitly required, sanitize content and test the boundary.
- Add comments for decisions and invariants, not obvious syntax.
- Do not use broad formatting changes to hide a small functional diff.

## 7. Security and data rules

- Keep `.env.example` updated with variable names and descriptions only.
- Never commit secrets or real `.env` values.
- Only intentionally public values may use the `NEXT_PUBLIC_` prefix.
- Keep Liveblocks secret keys and database service-role credentials server-only.
- Validate route-handler input.
- Enforce trip membership and role authorization on the server.
- UI role checks are not a security boundary.
- Use synthetic users and travel data in fixtures.
- Do not log access tokens, secrets, invitation tokens, or precise personal travel data.
- Treat share and invitation links as sensitive.
- Do not call paid external services in ordinary unit or integration tests.

When a database is used:

- Apply schema changes through repository migrations.
- Never rely on ad hoc production edits.
- Enable and verify row-level security for user-owned and membership-controlled data.
- Keep owner, editor, and viewer policies aligned with product permissions.
- Test clean migration reapplication and relevant RLS scenarios before push or PR.
- Never expose a service-role key to browser code.

## 8. Testing and verification

Test behavior and risk, not implementation trivia.

- Domain changes require focused unit tests.
- UI changes require behavior-oriented component/integration tests when practical.
- Drag, map, collaboration, permissions, and core journey changes require relevant Playwright coverage or explicitly reported manual QA.
- Bug fixes should include a regression test when practical.
- Prefer accessible roles and labels over implementation selectors.
- Add `data-testid` only when no stable accessible selector exists.
- Do not weaken or delete a failing test merely to make a change pass.
- Do not overuse snapshots.
- Mock network boundaries deterministically.

Use the narrowest meaningful checks, then broaden for risky changes:

- Documentation only: review content, commands, and links.
- TypeScript/domain logic: targeted tests, `npm run lint`, `npm run typecheck`.
- UI component: targeted tests, lint, typecheck, and manual interaction when possible.
- Drag/map/editor state: targeted tests plus relevant E2E flow.
- Collaboration: two-context automated test or explicit two-browser manual QA.
- Dependency/configuration: lint, typecheck, tests, and `npm run build`.
- Database/RLS: clean migration reapplication plus role-based policy verification.
- Expo native dependency, if Expo is ever introduced: iOS and Android development builds, not Expo Go only.

If a command is unavailable or blocked, report it under **Not run** with the reason.

## 9. Git Flow and branch rules

These rules apply only after a Git repository has been initialized.

- `develop` is the integration branch for everyday development.
- `main` is the stable release branch.
- Routine work starts from the latest `develop` on a short-lived task branch.
- Task branch names must communicate intent and use one of:
  - `feature/*`
  - `fix/*`
  - `docs/*`
  - `refactor/*`
  - `test/*`
  - `chore/*`
- Examples:
  - `feature/cross-day-dnd`
  - `fix/map-selection-loop`
  - `test/collaboration-presence`
- A branch and PR contain one focused change.
- Do not mix unrelated refactors, dependency updates, or formatting sweeps.
- Normal task PRs target `develop`.
- Stable releases are promoted through a dedicated PR from `develop` to `main`.
- Do not commit directly to `develop` or `main`.
- Do not force-push, rewrite shared history, or run destructive Git commands without explicit permission.

Use Conventional Commits:

```text
type(scope): subject
```

Supported types:

```text
feat
fix
docs
refactor
test
chore
build
ci
perf
revert
```

Examples:

```text
feat(itinerary): support cross-day drag and drop
fix(map): prevent marker selection feedback loop
test(collaboration): cover viewer read-only behavior
perf(editor): isolate selection subscriptions
```

Before push or PR creation, run relevant lint, typecheck, and tests.

Additional required verification:

- Database changes require migration reapplication and RLS verification.
- Expo native dependency changes, if Expo is introduced, require iOS and Android development-build verification.
- Dependency or build configuration changes require a production build when feasible.

### Git action safety

Repository initialization, branch creation, commit, push, tag, release, merge, rebase, and PR creation occur **only when the user explicitly requests that exact action**.

- An implementation request is not permission to initialize Git, create a branch, commit, push, or open a PR.
- Inspecting status and diffs is allowed.
- Do not stage with `git add .`; stage only files relevant to the requested commit.
- Never include secrets, local environment files, generated test artifacts, or unrelated changes.
- If the working tree is dirty, preserve it. Do not discard changes to switch branches.

## 10. PR and final-report requirements

PR titles follow Conventional Commits and describe one focused outcome.

Every PR description and Codex final report must accurately include:

1. **Summary** — what changed and why.
2. **Changed files** — important files grouped by purpose.
3. **Validation** — exact commands run and actual results.
4. **Data and security impact** — migrations, RLS, permissions, environment variables, providers, or `none`.
5. **Remaining risks / manual QA** — known limitations and unverified behavior.
6. **Not run** — relevant verification not executed and why.

Never write "all tests passed" when only a subset ran. Never imply manual QA occurred when it did not.

Use this final-report shape:

```md
## Summary

- ...

## Changed files

- `path/to/file.ts`: ...

## Validation

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run test -- <target>` — PASS
- `npm run build` — NOT RUN: reason

## Data and security impact

- ...

## Remaining risks / manual QA

- ...

## Not run

- ...
```

## 11. Definition of done

A task is complete only when:

- Requested behavior is implemented without unrelated scope.
- Relevant existing behavior is not knowingly broken.
- Types are safe and external data is validated.
- Loading, empty, error, offline, and permission implications were considered.
- Keyboard and accessibility implications were considered.
- Tests were added or updated for meaningful risk.
- Relevant commands were run and accurately reported.
- No secrets, debug output, unrelated files, or generated artifacts are included.
- The final diff was reviewed.
- Documentation changed when behavior, architecture, environment, or commands changed.
- Remaining risks and manual QA are stated honestly.

## 12. Code review rules

Prioritize review findings in this order:

1. Data loss, broken itinerary invariants, or incorrect cross-day ordering.
2. Missing server authorization, secret exposure, or unsafe RLS.
3. Duplicate sources of truth across Liveblocks, TanStack Query, Zustand, URL, and forms.
4. Collaboration, reconnect, stale state, or undo/redo corruption.
5. Drag cancellation, empty-day, keyboard, and concurrent-edit edge cases.
6. Timeline/map feedback loops and excessive provider calls.
7. Broad rerenders, leaked listeners, or client/server boundary regressions.
8. Missing loading, error, offline, read-only, or accessibility behavior.
9. Missing tests or inaccurate validation claims.
10. Unrelated changes that make the PR difficult to review.

Provide concrete, actionable findings with file and line references. Distinguish confirmed bugs from risks and optional suggestions.
