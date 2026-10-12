#!/usr/bin/env bash
# Replace kakamega branch history with ONE commit (exact current HEAD tree only).
# Does not add untracked files (unlike git add -A on orphan checkout).
#
# Usage:
#   ./deploy/git-rewrite-kakamega-clean-history.sh
#   git push --force origin kakamega
#   git push --force origin kakamega:main   # if main should match
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

TREE="$(git rev-parse HEAD^{tree})"
NEW="$(git commit-tree "$TREE" -m "$MSG")"
git checkout "$BACKUP"
git branch -f kakamega "$NEW"
git checkout kakamega

echo ""
echo "Done. kakamega now has ONE commit: $(git rev-parse --short HEAD)"
echo "Verify: git log --oneline -3"
echo "Then:    git push --force origin kakamega"
