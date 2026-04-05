#!/usr/bin/env bash
# sync-agents.sh — agents/ (source) → .claude/agents/ (deployed) への同期
# PM.md は {phase}-PM.md にリネームしてコピーする
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$REPO_ROOT/agents"
DST_DIR="$REPO_ROOT/.claude/agents"

if [ ! -d "$SRC_DIR" ]; then
  echo "ERROR: Source directory not found: $SRC_DIR"
  exit 1
fi

if [ ! -d "$DST_DIR" ]; then
  echo "ERROR: Destination directory not found: $DST_DIR"
  exit 1
fi

copied=0
for phase in discovery delivery operations; do
  phase_dir="$SRC_DIR/$phase"
  if [ ! -d "$phase_dir" ]; then
    echo "WARNING: Phase directory not found: $phase_dir"
    continue
  fi

  for src_file in "$phase_dir"/*.md; do
    [ -f "$src_file" ] || continue
    filename="$(basename "$src_file")"

    # PM.md → {phase}-PM.md にリネーム
    if [ "$filename" = "PM.md" ]; then
      dst_file="$DST_DIR/${phase}-PM.md"
    else
      dst_file="$DST_DIR/$filename"
    fi

    cp "$src_file" "$dst_file"
    copied=$((copied + 1))
  done
done

echo "Synced $copied files from agents/ to .claude/agents/"

# 孤立ファイル検出（.claude/agents/ に存在するが agents/ にソースがないファイル）
orphans=0
for dst_file in "$DST_DIR"/*.md; do
  [ -f "$dst_file" ] || continue
  filename="$(basename "$dst_file")"

  found=false
  # {phase}-PM.md → agents/{phase}/PM.md を検索
  if [[ "$filename" =~ ^(discovery|delivery|operations)-PM\.md$ ]]; then
    phase="${BASH_REMATCH[1]}"
    if [ -f "$SRC_DIR/$phase/PM.md" ]; then
      found=true
    fi
  else
    # 通常ファイル: いずれかの phase ディレクトリにあるか検索
    for phase in discovery delivery operations; do
      if [ -f "$SRC_DIR/$phase/$filename" ]; then
        found=true
        break
      fi
    done
  fi

  if [ "$found" = false ]; then
    echo "ORPHAN: $dst_file (no source in agents/)"
    orphans=$((orphans + 1))
  fi
done

if [ "$orphans" -gt 0 ]; then
  echo "WARNING: Found $orphans orphan file(s) in .claude/agents/"
fi
