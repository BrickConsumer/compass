#!/usr/bin/env bash
# Put the list on the branch "headlines", which holds that file and a note saying what it is, and nothing else.
# Run by .github/workflows/headlines.yml from a checkout of the repository:
#
#   bash scripts/push-headlines.sh out/headlines.json
#
# The first run makes the branch, with no history shared with the rest of the repository. Every later run adds one
# commit to it. Nothing here touches any other branch, nothing is ever force-pushed, and the checkout it is run from
# is left as it was found: no name is set in it and no branch of it is moved.
set -euo pipefail

file="${1:?Say which file holds the list}"
branch="headlines"
work="$(mktemp -d)"
trap 'git worktree remove --force "$work" 2>/dev/null || true' EXIT

# 0 when the branch is there, 2 when the repository answered and it is not, and anything else when it could not be asked
status=0
git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1 || status=$?
if [ "$status" -ne 0 ] && [ "$status" -ne 2 ]; then
  echo "::error::The repository could not be asked whether the branch $branch exists (git answered $status)."
  exit 1
fi

if [ "$status" -eq 0 ]; then
  git fetch --quiet --depth 1 origin "$branch"
  git worktree add --quiet --detach "$work" FETCH_HEAD
else
  git worktree add --quiet --detach "$work"
  git -C "$work" checkout --quiet --orphan "$branch"
  git -C "$work" rm -r --force --quiet .
  printf '%s\n' \
    "# Compass's list of headlines" "" \
    "This branch holds one file, \`headlines.json\`, written every few hours by the job in" \
    "\`.github/workflows/headlines.yml\` on \`main\`. Compass downloads it when \"Fetch headlines\" is switched on." \
    "" "What it is and the terms of each source are in \`docs/fetched-headlines-spec.md\` on \`main\`." \
    > "$work/README.md"
  git -C "$work" add README.md
fi

cp "$file" "$work/headlines.json"
git -C "$work" add headlines.json
if git -C "$work" diff --cached --quiet; then
  echo "The list is as it was. Nothing to publish."
  exit 0
fi
# the commit is the job's, said on the commit itself, so that a person's own checkout is never left writing as the job
git -C "$work" -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit --quiet -m "Headlines, checked $(date -u +%Y-%m-%dT%H:%MZ)"
git -C "$work" push --quiet origin "HEAD:refs/heads/$branch"
echo "Published to the branch $branch."
