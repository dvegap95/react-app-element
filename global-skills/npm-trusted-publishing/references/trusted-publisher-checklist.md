# npm Trusted Publisher — one-time setup checklist

Use this when onboarding a new package or repo to OIDC publishing.

## 0. Is the package on npm yet?

```bash
npm view PACKAGE_NAME version
```

- **404** → package not published. Follow `first-publish-local.md` first (agent prepares repo; user runs `npm login` + `npm publish` locally).
- **Version returned** → skip to section 1 below.

---

## First local publish (required when 404)

```bash
npm login          # interactive — browser / passkey (no long-lived token)
npm ci && npm test && npm run build
npm publish        # scoped public: npm publish --access public
npm view PACKAGE_NAME version
```

Then continue to **Configure Trusted Publisher** below.

---

## Prerequisites (agent should complete before user publishes)

- [ ] Package name available on npm (`npm view PACKAGE_NAME` → 404)
- [ ] `package.json` metadata complete (repository, keywords, homepage, bugs, author, prepublishOnly)
- [ ] README honest about pre-publish state (no false `npm install` claim)
- [ ] CI workflow updated with OIDC publish job (see `workflow-publish-job.yml`)
- [ ] `npm pack --dry-run` and `npm publish --dry-run` pass locally
- [ ] Workflow filename decided: _______________ (e.g. `ci.yml`)

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

## Release (after Trusted Publisher is configured)

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

## After first publish

- [ ] Update README Install section to `npm install PACKAGE_NAME` as primary
- [ ] Keep source-install fallback for contributors
