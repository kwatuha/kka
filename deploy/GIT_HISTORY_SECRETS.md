# Secrets and Git history

## Why “we deleted it” still shows on GitHub

Git is **append-only**. When you remove a password from a file, Git keeps the **old version forever** in earlier commits. GitHub’s UI (blame, commit browse, compare) can still show lines like:

```bash
-d '{"username":"akwatuha","password":"reset123"}'
```

Anyone with the old commit SHA can read them. **Rotating the password** is mandatory; **rewriting history** is how you remove the leak from the repo.

## What to do instead of hardcoding

Use environment variables (same pattern as `test_encounter_prepopulation.sh` and `deploy/sync-evidence-checklist-remote.sh`):

```bash
export HMIS_TEST_USER='…'
export HMIS_TEST_PASSWORD='…'
curl … -d "{\"username\":\"${HMIS_TEST_USER}\",\"password\":\"${HMIS_TEST_PASSWORD}\"}"
```

Never put real passwords in:

- Markdown examples (use env vars or `YOUR_PASSWORD` with no real value)
- Default form values in React (`user-form.tsx`, login hints)
- SQL dumps, `.env` files, or OCR scratch files under `.tmp/`

Keep dumps and `.env*` **gitignored** (`api/database/dumps/`, `deploy/.env.kakamega`).

## Purge secrets already pushed to GitHub

**1. Rotate** every password that ever appeared in git (including `reset123`, `admin123`, old admin hashes, JWT/M-Pesa secrets from env examples).

**2. Rewrite the branch** so those blobs are not reachable from any branch tip:

```bash
./deploy/git-rewrite-kakamega-clean-history.sh
```

This creates a **single new root commit** from the current tree (no parent commits containing old lines).

**3. Force-push** the rewritten branch (coordinate with anyone else cloning the repo):

```bash
git push --force origin kakamega
git push --force origin main   # only if main should match kakamega
```

**4. Prune local old objects** (after force push):

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**5. Delete local backup branches** that still point at pre-scrub history (e.g. `kakamega-backup-pre-purge-*`, old feature branches with dumps).

**6. GitHub:** Resolve secret-scanning alerts; old commit URLs may still work briefly until GC. For sensitive leaks, use GitHub **secret scanning** remediation and consider [GitHub support](https://support.github.com) to drop cached objects if required.

## Optional: scrub strings across many commits

If you must keep multi-commit history, use `git filter-repo` with `--replace-text` and `--invert-paths` for dump directories. For this project, a **single-commit orphan baseline** on `kakamega` is usually simpler.

## Going forward

- Pre-push review: `git grep -i 'password.*reset\|admin123\|@kiplombe\.com' $(git rev-list HEAD)`
- Do not commit database dumps or `.tmp/` OCR output.
- Issue credentials via ICT / password manager, not the repository.
