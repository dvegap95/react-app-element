# npm Trusted Publisher — one-time setup checklist

Use this when onboarding a new package or repo to OIDC publishing.

## Prerequisites

- [ ] Package name available on npm (`npm view PACKAGE_NAME` → 404)
- [ ] `package.json` has matching `repository.url` (`git+https://github.com/OWNER/REPO.git`)
- [ ] CI workflow updated with OIDC publish job (see `workflow-publish-job.yml`)
- [ ] Workflow filename decided: _______________ (e.g. `ci.yml`)

## First publish (package does not exist on npm yet)

Trusted Publisher is configured per **package settings**, so the package must exist first.

```bash
npm login          # interactive — browser / passkey
npm ci && npm test && npm run build
npm publish        # unscoped: no --access flag; scoped public: --access public
```

## Configure Trusted Publisher

1. Open https://www.npmjs.com/package/PACKAGE_NAME → **Settings**
2. **Trusted publishing** → **GitHub Actions**
3. Fill in:

| Field | Value |
|---|---|
| Organization or user | `OWNER` |
| Repository | `REPO` |
| Workflow filename | `WORKFLOW.yml` (filename only, case-sensitive) |
| Environment name | _(leave empty unless using GitHub Environments)_ |
| Allowed actions | `npm publish` |

4. Save

## Optional security hardening

- [ ] Settings → **Publishing access** → require 2FA and disallow tokens
- [ ] Revoke unused Automation / Granular Access Tokens
- [ ] Enable tag protection on `v*` in GitHub repo settings

## Release

**Tag (recommended):**
```bash
git tag v0.1.0
git push origin v0.1.0
```

**Manual:**
Actions → **WORKFLOW_NAME** → Run workflow → check **Publish** → Run

## Verify

```bash
npm view PACKAGE_NAME version
npm view PACKAGE_NAME repository
```
