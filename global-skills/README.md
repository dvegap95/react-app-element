# Global Cursor Skills

User-level Agent Skills for the **entire Cursor ecosystem** — not tied to any single project.

Cursor discovers skills from:

| Location | Scope |
|---|---|
| `~/.cursor/skills/` | All projects (global) |
| `~/.agents/skills/` | All projects (global, alternate path) |

Project `.cursor/skills/` only applies to that repo. **Do not** rely on project-level copies for cross-repo use.

## One-time install

From a clone of this repo:

```bash
./global-skills/install.sh
```

Or one-liner (after this is on `main`):

```bash
git clone --depth 1 https://github.com/dvegap95/react-app-element.git /tmp/rae-skills
/tmp/rae-skills/global-skills/install.sh
rm -rf /tmp/rae-skills
```

## Skills included

| Skill | Invoke | Purpose |
|---|---|---|
| `npm-trusted-publishing` | `/npm-trusted-publishing` | OIDC npm CI/CD publish + first local publish for never-published packages |

## Update

Re-run `install.sh` after pulling latest `global-skills/`.
