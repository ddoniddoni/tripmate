## Summary

<!-- What changed and why? Keep this PR focused on one outcome. -->

-

## Changed files

<!-- Group important files by purpose. Do not list generated or irrelevant files. -->

- `path/to/file`:

## Validation

<!-- Record only commands and checks actually run. Use PASS, FAIL, or NOT RUN with a reason. -->

- `npm run lint` — NOT RUN
- `npm run typecheck` — NOT RUN
- `npm run test` — NOT RUN
- `npm run test:e2e` — NOT RUN
- `npm run build` — NOT RUN

## Data and security impact

<!-- Note migrations, RLS, permissions, environment variables, provider access, or write "None". -->

- None

## Remaining risks / manual QA

<!-- Include known limitations, browsers/devices not checked, external-service behavior, and follow-up items. -->

-

## Not run

<!-- List relevant checks that could not be executed and explain why. Do not claim they passed. -->

-

## Checklist

- [ ] This PR targets `develop` for routine work, or is an intentional `develop` → `main` release PR.
- [ ] The branch uses an approved prefix: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`, or `chore/`.
- [ ] The PR contains one focused change.
- [ ] The PR title follows Conventional Commits.
- [ ] Relevant lint, typecheck, and tests were run and recorded accurately.
- [ ] Database migrations were reapplied and RLS verified when applicable.
- [ ] iOS and Android development builds were verified for Expo native dependency changes when applicable.
- [ ] No secrets, local environment files, unrelated changes, or generated test artifacts are included.
- [ ] Remaining risks and manual QA are documented honestly.
