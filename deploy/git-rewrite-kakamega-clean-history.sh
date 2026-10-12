#!/usr/bin/env bash
# Replace kakamega branch history with ONE commit (current tree). Removes all prior
# commits from that branch so deleted passwords/emails are not reachable via git log.
#
# Usage: from repo root, on branch kakamega with a clean working tree you want to keep:
#   ./deploy/git-rewrite-kakamega-clean-history.sh
#   git push --force origin kakamega
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash working tree changes before rewriting history." >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "kakamega" ]]; then
  echo "Switch to branch kakamega first (now on: $CURRENT_BRANCH)." >&2
  exit 1
fi

BACKUP="kakamega-backup-before-orphan-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP" HEAD
echo "Backup branch: $BACKUP (delete after successful force-push)"

MSG="AZ CarePlus HMIS (Kakamega) — clean history baseline

Single root commit; no prior repository history on this branch.
Credentials and dumps must not be committed — see deploy/GIT_HISTORY_SECRETS.md."

git checkout --orphan kakamega-orphan-tmp
git rm -rf --cached . >/dev/null 2>&1 || true
git add -A
git rm -rf --cached scripts/__pycache__ .tmp api/database/dumps 2>/dev/null || true
git add -A
git commit -m "$MSG"

git branch -D kakamega
git branch -m kakamega

echo ""
echo "Done. kakamega now has ONE commit: $(git rev-parse --short HEAD)"
echo "Verify: git log --oneline -3"
echo "Then:    git push --force origin kakamega"
