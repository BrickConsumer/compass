#!/usr/bin/env bash
# Take the list as it stands on the branch "headlines", into a file, for the job to build on.
# Run by .github/workflows/headlines.yml from a checkout of the repository:
#
#   bash scripts/take-headlines.sh out/headlines.json
#
# With no such branch yet there is no list, and that is not a fault: the run starts one. Anything else that stops
# the list being read is a fault, and the run stops here. It must not go on to build a list from nothing, because a
# feed may hold only its latest headline, and what an earlier list kept from it would be lost for good.
set -euo pipefail

file="${1:?Say where to put the list}"
branch="headlines"

mkdir -p "$(dirname "$file")"
# a list left by an earlier run is not the list as it stands
rm -f "$file"

# 0 when the branch is there, 2 when the repository answered and it is not, and anything else when it could not be asked
status=0
git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1 || status=$?
if [ "$status" -eq 2 ]; then
  echo "There is no branch $branch yet, so this run starts the list."
  exit 0
fi
if [ "$status" -ne 0 ]; then
  echo "::error::The repository could not be asked whether the branch $branch exists (git answered $status)."
  exit 1
fi

git fetch --quiet --depth 1 origin "$branch"
git show "FETCH_HEAD:headlines.json" > "$file.part"
mv "$file.part" "$file"
echo "Took the list from the branch $branch."
