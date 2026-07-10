---
name: npm-trusted-publishing
description: Add npm OIDC trusted publishing to an existing GitHub Actions CI workflow. Use when making a package publishable, setting up CI/CD release pipelines, configuring publish.yml or ci.yml, npm registry publishing, trusted publishers, or removing NPM_TOKEN secrets.
paths:
  - ".github/workflows/**"
  - "package.json"
---

# npm Trusted Publishing (OIDC) for CI/CD

Unified pattern: **extend the project's existing CI workflow** with a `publish` job that runs **after tests pass**, using **npm OIDC trusted publishing** (no long-lived `NPM_TOKEN`).

## When to use

- User wants npm publish from GitHub Actions
- User mentions trusted publishing, OIDC, or removing npm tokens
- User wants tag-based releases (`v*`) plus optional manual publish
- User asks to make CI/CD "publishable"

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

## Workflow integration strategy

### Prefer: merge into existing CI workflow

Locate `.github/workflows/ci.yml` (or the project's main CI file: `test.yml`, `build.yml`, etc.). **Do not replace** existing test/lint/build steps. Add:

- `tags: ['v*']` under `on.push` (if missing)
- `workflow_dispatch` input `publish` (boolean, default `false`)
- A new `publish` job that `needs:` the existing test job

Keep the existing job name (usually `test`, `ci`, or `build`) — only reference it in `needs:`.

### Avoid: separate publish-only workflow

Only create a standalone `publish.yml` if the repo has no sensible CI file to extend. If you do, npm Trusted Publisher must list `publish.yml` as the workflow filename.

## Implementation checklist

### 1. Inspect the project

- [ ] Read existing `.github/workflows/*.yml`
- [ ] Read `package.json` — confirm `name`, `version`, `files`, `repository`, build script
- [ ] Confirm package builds (`npm run build` or equivalent) before publish
- [ ] Check if `publish.yml` with `NPM_TOKEN` exists → migrate to OIDC pattern

### 2. Patch the CI workflow

Apply the template from `references/workflow-publish-job.yml`. Adapt:

| Placeholder | Replace with |
|---|---|
| `EXISTING_TEST_JOB` | Actual first job id (e.g. `test`, `ci`) |
| `WORKFLOW_FILENAME` | Actual file name (e.g. `ci.yml`) — for README/docs only |
| `node-version` in test job | Project's existing Node version (keep unchanged) |
| Build/test commands | Project's existing commands in publish job |

Add to workflow `on:` block if missing:

```yaml
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      publish:
        description: Publish to npm after tests pass (requires npm Trusted Publisher)
        type: boolean
        default: false
```

Publish job `if:` condition (standard):

```yaml
if: >
  needs.EXISTING_TEST_JOB.result == 'success' &&
  (
    startsWith(github.ref, 'refs/tags/v') ||
    (github.event_name == 'workflow_dispatch' && inputs.publish == true)
  )
```

### 3. Ensure `package.json` publish metadata

Required for provenance and npm discovery:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/OWNER/REPO.git"
  },
  "files": ["dist"],
  "scripts": {
    "prepublishOnly": "npm run build"
  }
}
```

Also verify: `description`, `license`, `keywords`, `homepage`, `bugs`, `author`, `main`/`module`/`types`/`exports` pointing at built output.

Scoped public packages: add `"publishConfig": { "access": "public" }`.

### 4. Document one-time npm setup (in README or release docs)

Tell the user to configure **npm Trusted Publisher** at  
`https://www.npmjs.com/package/PACKAGE_NAME` → **Settings → Trusted publishing → GitHub Actions**:

| Field | Value |
|---|---|
| Organization or user | GitHub owner (user or org) |
| Repository | Repo name |
| Workflow filename | **Exact workflow file name** (e.g. `ci.yml`) |
| Allowed actions | `npm publish` |

**First publish:** if the package does not exist on npm yet, one interactive `npm login` + `npm publish` is required before Trusted Publisher can be configured.

**Optional hardening:** package Settings → Publishing access → require 2FA and disallow tokens.

### 5. Release instructions

**Tag release (recommended):**
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

**Manual publish:** Actions → select workflow → Run workflow → enable **Publish** → Run.

### 6. Verify

- [ ] `npm publish --dry-run` locally succeeds
- [ ] CI passes on PR/push without publishing
- [ ] After tag or manual dispatch, publish job runs and completes
- [ ] `npm view PACKAGE_NAME version` returns expected version

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `ENEEDAUTH` | Trusted Publisher mismatch or missing | Verify workflow filename, owner, repo on npmjs.com |
| `ENEEDAUTH` | `NODE_AUTH_TOKEN` set on publish job | Remove all token env vars from publish job |
| `ENEEDAUTH` | npm CLI too old | `npm install -g npm@latest` on publish job |
| Publish on every push | `if:` condition wrong | Ensure tag/dispatch guard is present |
| Provenance missing | Private GitHub repo | Expected limitation for private repos |
| `workflow_call` mismatch | Parent workflow name validated | Put publish in the workflow npm expects, or configure parent name |

## What NOT to do

- Do not add `secrets.NPM_TOKEN` to the publish job
- Do not use `registry-url` + token together on publish (OIDC handles auth)
- Do not publish on every `push` to `main` without explicit user request
- Do not create duplicate publish workflows (`ci.yml` + `publish.yml`) unless retiring the old one

## Reference files

- `references/workflow-publish-job.yml` — copy-paste publish job + triggers
- `references/trusted-publisher-checklist.md` — npm + GitHub setup checklist for the user
