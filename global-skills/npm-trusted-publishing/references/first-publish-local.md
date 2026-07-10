# First local publish — package not on npm yet

Use when `npm view PACKAGE_NAME version` returns **404 Not Found**.

Trusted Publishing (OIDC) only works **after** the package exists on npm. The agent prepares the repo; the user performs **one interactive local publish**, then configures Trusted Publisher, then CI handles future releases.

---

## Agent: prepare the repo (automate these steps)

### 1. Verify package name is available

```bash
npm view PACKAGE_NAME version
# Expect: E404 / Not Found — name is free
```

If the name is taken, stop and ask the user to pick a new `package.json` name or use a scoped name (`@owner/package`).

### 2. Harden `package.json` for npm visibility

Ensure or add:

```json
{
  "name": "PACKAGE_NAME",
  "version": "0.1.0",
  "description": "...",
  "author": "GITHUB_OWNER",
  "license": "MIT",
  "sideEffects": false,
  "repository": {
    "type": "git",
    "url": "git+https://github.com/OWNER/REPO.git"
  },
  "keywords": ["...", "..."],
  "homepage": "https://github.com/OWNER/REPO#readme",
  "bugs": {
    "url": "https://github.com/OWNER/REPO/issues"
  },
  "files": ["dist"],
  "scripts": {
    "prepublishOnly": "npm run build",
    "prepack": "npm run build"
  }
}
```

Scoped public packages also need:

```json
"publishConfig": { "access": "public" }
```

### 3. Keep README honest until first publish

**Before first publish** — do **not** claim the package is on the registry. Use this Install section:

```markdown
## Install

> **Note:** `PACKAGE_NAME` is not published to the npm registry yet.
> Install from this repository until the first release is live.

\`\`\`bash
git clone https://github.com/OWNER/REPO.git
cd REPO
npm install && npm run build

# in your consuming project:
npm install file:../path/to/REPO
\`\`\`
```

**After first publish succeeds** — update Install to:

```markdown
## Install

\`\`\`bash
npm install PACKAGE_NAME
\`\`\`

**From source** (for local development):

\`\`\`bash
git clone https://github.com/OWNER/REPO.git
cd REPO
npm install && npm run build
npm install file:../path/to/REPO
\`\`\`
```

### 4. Add CI workflow with OIDC publish job (for after first publish)

Merge publish job into existing CI — see `workflow-publish-job.yml`.  
Record the workflow filename (e.g. `ci.yml`) — user needs it for npm Trusted Publisher.

### 5. Verify locally before handing off to user

```bash
npm ci
npm test
npm run build
npm pack --dry-run
npm publish --dry-run
```

All must pass. Commit and push preparation changes.

---

## User: first local publish (manual — one time)

The agent **cannot** do this step in CI without credentials. Give the user these exact instructions:

### Step A — Log in (interactive, no long-lived token needed)

```bash
npm login
```

This opens a browser and uses your passkey / security key (Touch ID, etc.). A short-lived session is written to `~/.npmrc`.

### Step B — Publish from the repo root

```bash
cd path/to/REPO
git pull
npm ci
npm test
npm run build
npm publish
```

For scoped public packages:

```bash
npm publish --access public
```

### Step C — Verify on the registry

```bash
npm view PACKAGE_NAME version
```

### Step D — Configure npm Trusted Publisher

Open `https://www.npmjs.com/package/PACKAGE_NAME` → **Settings → Trusted publishing → GitHub Actions**:

| Field | Value |
|---|---|
| Organization or user | `OWNER` |
| Repository | `REPO` |
| Workflow filename | `WORKFLOW.yml` (e.g. `ci.yml`) |
| Allowed actions | `npm publish` |

### Step E — Future releases via CI

```bash
# bump version in package.json first, then:
git tag v0.1.1
git push origin v0.1.1
```

Or: Actions → **CI** → Run workflow → check **Publish** → Run.

---

## Optional hardening (after Trusted Publisher works)

- npm package **Settings → Publishing access** → require 2FA and disallow tokens
- Revoke unused Automation / Granular Access Tokens
- GitHub: protect `v*` tags

---

## Common first-publish errors

| Error | Fix |
|---|---|
| `403 Forbidden` | Wrong account, or scoped package needs `--access public` |
| `402 Payment Required` | Scoped package defaulting to private — use `--access public` |
| `ENEEDAUTH` in CI before Step D | Expected — configure Trusted Publisher after first local publish |
| README says `npm install` but 404 | README not updated for pre-publish state — apply Step 3 above |
