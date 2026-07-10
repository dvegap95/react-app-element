---
name: npm-trusted-publishing
description: Add npm OIDC trusted publishing to an existing GitHub Actions CI workflow. Use when making a package publishable, first npm publish, setting up CI/CD release pipelines, configuring publish.yml or ci.yml, npm registry publishing, trusted publishers, README install consistency, or removing NPM_TOKEN secrets.
paths:
  - ".github/workflows/**"
  - "package.json"
  - "README.md"
---

# npm Trusted Publishing (OIDC) for CI/CD

Unified pattern: **extend the project's existing CI workflow** with a `publish` job that runs **after tests pass**, using **npm OIDC trusted publishing** (no long-lived `NPM_TOKEN`).

## When to use

- User wants npm publish from GitHub Actions
- User mentions trusted publishing, OIDC, or removing npm tokens
- User wants tag-based releases (`v*`) plus optional manual publish
- User asks to make CI/CD "publishable"
- Package has **never been published** — prepare repo + give first local publish instructions

## Step 0 — Detect publish state (always do this first)

```bash
npm view PACKAGE_NAME version
```

| Result | Branch |
|---|---|
| **404 Not Found** | Follow **Never published** flow below |
| Version returned | Package exists — skip first local publish, configure/verify Trusted Publisher only |

Also grep README for `npm install PACKAGE_NAME`. If the package is not on npm but README claims it is, **fix README** before anything else (see `references/first-publish-local.md`).

---

## Never published — full flow

When the package is **not on npm yet**, the agent prepares everything; the user does **one interactive local publish**; then CI takes over.

### Agent prepares (automate)

1. **Verify name** — `npm view PACKAGE_NAME` → 404
2. **`package.json`** — metadata for visibility: `description`, `author`, `license`, `keywords`, `homepage`, `bugs`, `repository` (`git+https://...`), `files`, `prepublishOnly`, `prepack`, `sideEffects`
3. **README** — honest Install section (source install primary; note "not on npm yet") — see `references/first-publish-local.md`
4. **CI workflow** — add OIDC `publish` job to existing workflow (for use **after** first publish)
5. **Verify** — `npm ci && npm test && npm run build && npm pack --dry-run && npm publish --dry-run`
6. **Commit and push** preparation changes

### User performs (print these instructions verbatim)

After pushing prep changes, tell the user:

> **First publish must be local (one time).** CI OIDC publishing only works after the package exists on npm and Trusted Publisher is configured.

```bash
npm login                    # browser / passkey — no long-lived token
cd path/to/REPO && git pull
npm ci && npm test && npm run build
npm publish                  # scoped public: npm publish --access public
npm view PACKAGE_NAME version
```

Then on npmjs.com → package **Settings → Trusted publishing → GitHub Actions**:

| Field | Value |
|---|---|
| Organization or user | GitHub owner |
| Repository | Repo name |
| Workflow filename | Exact CI file name (e.g. `ci.yml`) |
| Allowed actions | `npm publish` |

Future releases: `git tag vX.Y.Z && git push origin vX.Y.Z`, or Actions → CI → Run workflow → **Publish**.

### After first publish succeeds

- [ ] Update README Install to `npm install PACKAGE_NAME` as primary (keep source fallback)
- [ ] Confirm Trusted Publisher fields match workflow filename
- [ ] Test CI publish via tag or manual dispatch

Full detail: `references/first-publish-local.md`

---

## Core rules (do not deviate)

1. **No `NPM_TOKEN` / `NODE_AUTH_TOKEN` on the publish job.** OIDC only.
2. **Publish only after CI passes** — `publish` job `needs:` the test/build job.
3. **Publish triggers** (both supported):
   - Push tag matching `v*` (e.g. `v0.1.0`)
   - `workflow_dispatch` with boolean input `publish` (default `false`)
4. **Workflow filename on npm must match exactly** — if publish lives in `ci.yml`, npm Trusted Publisher → workflow filename is `ci.yml` (not the path).
5. **GitHub-hosted runners only** (`ubuntu-latest`). Self-hosted runners are unsupported.
6. **Node 24 + latest npm CLI** on the publish job (`npm install -g npm@latest`). Requires npm ≥ 11.5.1.
7. **`id-token: write`** permission on the publish job only (or job-level).
8. **Do not pass `--provenance`** — OIDC publishes provenance automatically.
9. **`cache: false`** on publish job `setup-node` (release builds should not use dependency cache).
10. **Remove legacy token-based `publish.yml`** if migrating — one trusted publisher per package, one canonical workflow filename.
11. **Never claim `npm install` works in README until the package is on the registry.**

## Workflow integration strategy

### Prefer: merge into existing CI workflow

Locate `.github/workflows/ci.yml` (or the project's main CI file). **Do not replace** existing test/lint/build steps. Add:

- `tags: ['v*']` under `on.push` (if missing)
- `workflow_dispatch` input `publish` (boolean, default `false`)
- A new `publish` job that `needs:` the existing test job

### Avoid: separate publish-only workflow

Only create a standalone `publish.yml` if the repo has no sensible CI file to extend. If you do, npm Trusted Publisher must list `publish.yml` as the workflow filename.

## Implementation checklist (already on npm)

### 1. Inspect the project

- [ ] Read existing `.github/workflows/*.yml`
- [ ] Read `package.json` — confirm `name`, `version`, `files`, `repository`, build script
- [ ] Confirm package builds before publish
- [ ] Check if `publish.yml` with `NPM_TOKEN` exists → migrate to OIDC pattern

### 2. Patch the CI workflow

Apply `references/workflow-publish-job.yml`. Adapt `EXISTING_TEST_JOB` to the actual test job id.

### 3. Ensure `package.json` publish metadata

See **Never published** section and `references/first-publish-local.md`.

### 4. Document Trusted Publisher setup in README

See `references/trusted-publisher-checklist.md`.

### 5. Release instructions

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Or: Actions → workflow → Run workflow → enable **Publish**.

### 6. Verify

- [ ] `npm publish --dry-run` succeeds
- [ ] CI passes on PR/push without publishing
- [ ] Tag or manual dispatch publishes successfully
- [ ] `npm view PACKAGE_NAME version` matches

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `ENEEDAUTH` in CI | Trusted Publisher not configured | Complete first local publish + npm Trusted Publisher setup |
| `ENEEDAUTH` | Workflow filename mismatch | Must match exactly (e.g. `ci.yml`) |
| `ENEEDAUTH` | `NODE_AUTH_TOKEN` set on publish job | Remove all token env vars from publish job |
| README vs registry mismatch | Claiming npm install before publish | Apply never-published README template |
| `403 Forbidden` on first publish | Wrong npm account or scoped private | `npm login` as owner; `--access public` for scoped |

## What NOT to do

- Do not add `secrets.NPM_TOKEN` to the publish job
- Do not publish on every `push` to `main`
- Do not tell users to run CI publish before first local publish exists on npm
- Do not create duplicate publish workflows unless retiring the old one

## Reference files

- `references/first-publish-local.md` — **never published**: repo prep + user local publish instructions
- `references/workflow-publish-job.yml` — copy-paste publish job + triggers
- `references/trusted-publisher-checklist.md` — npm Trusted Publisher setup checklist
