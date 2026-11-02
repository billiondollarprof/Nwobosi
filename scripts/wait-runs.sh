#!/usr/bin/env bash
# =============================================================================
# wait-runs.sh: wait for every GitHub Actions run on one commit to finish,
# then print each run and job with its result.
#
# Why: going live (docs/rules/BRANCHING.md) waits for every run a push
# starts: CI, the smoke test, and on main the edge functions. Copied from the
# Rhema repo on 2026-11-02.
#
# Usage:  scripts/wait-runs.sh <branch> <commit>
# Exits 0 only if every run succeeded. Prints the job ids, so a failed job's
# log can be read with the GitHub tool get_job_logs.
# =============================================================================
set -euo pipefail
BRANCH="${1:?Give the branch}"
SHA="$(git rev-parse "${2:?Give the commit}")"

# ===== 1. Wait for the runs to appear (GitHub takes a few seconds) =====
ids=""
for attempt in $(seq 1 18); do
  ids="$(gh run list --branch "$BRANCH" --limit 10 --json databaseId,headSha \
    -q ".[] | select(.headSha == \"$SHA\") | .databaseId")"
  [ -n "$ids" ] && break
  sleep 5
done
[ -n "$ids" ] || { echo "No runs started for $SHA on $BRANCH"; exit 1; }
sleep 10
ids="$(gh run list --branch "$BRANCH" --limit 10 --json databaseId,headSha \
  -q ".[] | select(.headSha == \"$SHA\") | .databaseId")"

# ===== 2. Wait for each to finish =====
for id in $ids; do
  until [ "$(gh run view "$id" --json status -q .status)" = completed ]; do sleep 15; done
done

# ===== 3. Report =====
all_green=1
for id in $ids; do
  line="$(gh run view "$id" --json name,conclusion,jobs \
    -q '"\(.name): \(.conclusion) | " + ([.jobs[] | "\(.name)=\(.conclusion) (job \(.databaseId))"] | join(", "))')"
  echo "$line"
  case "$line" in *": success |"*) ;; *) all_green=0 ;; esac
done
[ "$all_green" = 1 ] && echo "ALL GREEN" || { echo "SOMETHING IS RED: stop, read the failed log, fix it through testing."; exit 1; }
