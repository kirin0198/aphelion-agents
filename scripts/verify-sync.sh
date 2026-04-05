#!/usr/bin/env bash
# verify-sync.sh — agents/ と .claude/agents/ の差分を検出する
# 差分がある場合は非ゼロで終了し、ドリフトしたファイルを表示する
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$REPO_ROOT/agents"
DST_DIR="$REPO_ROOT/.claude/agents"

drift=0

for phase in discovery delivery operations; do
  phase_dir="$SRC_DIR/$phase"
  [ -d "$phase_dir" ] || continue

  for src_file in "$phase_dir"/*.md; do
    [ -f "$src_file" ] || continue
    filename="$(basename "$src_file")"

    if [ "$filename" = "PM.md" ]; then
      dst_file="$DST_DIR/${phase}-PM.md"
    else
      dst_file="$DST_DIR/$filename"
    fi

    if [ ! -f "$dst_file" ]; then
      echo "MISSING: $dst_file (source: $src_file)"
      drift=$((drift + 1))
    elif ! diff -q "$src_file" "$dst_file" > /dev/null 2>&1; then
      echo "DRIFT: $src_file != $dst_file"
      drift=$((drift + 1))
    fi
  done
done

if [ "$drift" -eq 0 ]; then
  echo "OK: agents/ and .claude/agents/ are in sync"
  exit 0
else
  echo "FAIL: $drift file(s) out of sync"
  exit 1
fi
