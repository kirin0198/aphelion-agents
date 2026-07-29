#!/usr/bin/env bash
# Smoke test for `aphelion-agents update`.
# Runs in a temp directory: init -> mutate target file -> update -> assert overwrite.
# Intended for manual / pre-release runs. Exit 0 = pass, non-zero = fail.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"
node "$REPO_ROOT/bin/aphelion-agents.mjs" init >/dev/null

# Assert: settings.local.json deny-list template installed by init (#31)
if ! [ -f "$TMP/.claude/settings.local.json" ]; then
  echo "FAIL: init did not install .claude/settings.local.json"
  exit 1
fi
if ! diff -q "$REPO_ROOT/src/.claude/settings.local.json" "$TMP/.claude/settings.local.json" >/dev/null; then
  echo "FAIL: init's settings.local.json diverges from canonical src/.claude/settings.local.json"
  exit 1
fi
if ! grep -q "Bash(rm -rf /\*)" "$TMP/.claude/settings.local.json"; then
  echo "FAIL: deny-list missing destructive_fs entries"
  exit 1
fi

# Mutate target side so we can detect overwrite
echo "MUTATED" > "$TMP/.claude/rules/sandbox-policy.md"

# Run update
node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null

# Assert: target file no longer contains the mutation marker
if grep -qx "MUTATED" "$TMP/.claude/rules/sandbox-policy.md"; then
  echo "FAIL: rules/sandbox-policy.md was not overwritten by update"
  exit 1
fi

# Assert: target content matches repo HEAD byte-for-byte
# (canonical source for rules/ lives at src/.claude/rules/ since 0.3.0; see #44)
if ! diff -q "$REPO_ROOT/src/.claude/rules/sandbox-policy.md" "$TMP/.claude/rules/sandbox-policy.md" >/dev/null; then
  echo "FAIL: rules/sandbox-policy.md diverges from src/.claude/rules/ HEAD"
  exit 1
fi

# Assert: settings.local.json is preserved when target side has one
echo '{"local":"keep"}' > "$TMP/.claude/settings.local.json"
node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null
if ! grep -q '"local":"keep"' "$TMP/.claude/settings.local.json"; then
  echo "FAIL: settings.local.json was not preserved on update"
  exit 1
fi

echo "PASS: rules/ refreshed and settings.local.json preserved"

# ────────────────────────────────────────────────────────────────────
# Hooks MVP regression tests (#107)
# ────────────────────────────────────────────────────────────────────

# Assert: hooks/ scripts installed by init
for hook_file in aphelion-secrets-precommit.sh aphelion-sensitive-file-guard.sh aphelion-deps-postinstall.sh; do
  if ! [ -f "$TMP/.claude/hooks/$hook_file" ]; then
    echo "FAIL: init did not install .claude/hooks/$hook_file"
    exit 1
  fi
done
if ! [ -f "$TMP/.claude/hooks/lib/secret-patterns.sh" ]; then
  echo "FAIL: init did not install .claude/hooks/lib/secret-patterns.sh"
  exit 1
fi
echo "PASS: hooks/ scripts installed by init (3 hook scripts + lib)"

# Assert: hooks/ scripts have execute permission (R8 mitigation)
for hook_file in aphelion-secrets-precommit.sh aphelion-sensitive-file-guard.sh aphelion-deps-postinstall.sh; do
  if ! [ -x "$TMP/.claude/hooks/$hook_file" ]; then
    echo "FAIL: .claude/hooks/$hook_file is not executable"
    exit 1
  fi
done
echo "PASS: hooks/ scripts have execute permission (+x)"

# Assert: settings.json installed by init
if ! [ -f "$TMP/.claude/settings.json" ]; then
  echo "FAIL: init did not install .claude/settings.json"
  exit 1
fi
echo "PASS: settings.json installed by init"

# Assert: settings.json existing fields are preserved on update (merge, #114)
# Note: merge reformats JSON with 2-space indent, so use grep with flexible spacing
# Since #202 the manifest records which hooks Aphelion knows about, and an absent
# entry is read as "the user removed it". Drop the manifest here so this test keeps
# exercising the add path (equivalent to a pre-0.3.9 install).
echo '{"custom":"hook_preserved"}' > "$TMP/.claude/settings.json"
rm -f "$TMP/.claude/.aphelion-manifest.json"
node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null 2>&1
# merge: custom field must be retained; Aphelion hooks must be added
if ! grep -q '"custom"' "$TMP/.claude/settings.json" || ! grep -q '"hook_preserved"' "$TMP/.claude/settings.json"; then
  echo "FAIL: settings.json did not preserve user custom field on update"
  exit 1
fi
if ! grep -q 'aphelion-secrets-precommit.sh' "$TMP/.claude/settings.json"; then
  echo "FAIL: settings.json did not get Aphelion hooks merged on update"
  exit 1
fi
echo "PASS: settings.json merged on update (user fields preserved + Aphelion hooks added)"

# Assert: hooks/ is refreshed (overlay) on update even when settings.json is preserved
echo "MUTATED_HOOK" > "$TMP/.claude/hooks/aphelion-secrets-precommit.sh"
node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null 2>&1
if grep -qx "MUTATED_HOOK" "$TMP/.claude/hooks/aphelion-secrets-precommit.sh"; then
  echo "FAIL: hooks/aphelion-secrets-precommit.sh was not refreshed by update"
  exit 1
fi
echo "PASS: hooks/ overlay refreshed on update (canonical content restored)"

echo "PASS: all hooks MVP regression tests passed"

# ────────────────────────────────────────────────────────────────────
# settings.json merge regression tests (#114)
# 独立した tmp dir (TMP_MERGE) を使い、TMP の状態変化から切り離す
# ────────────────────────────────────────────────────────────────────
TMP_MERGE="$(mktemp -d)"

# シナリオ 1: 空ディレクトリへの init → "created" (template 通りに新規配置)
(cd "$TMP_MERGE" && node "$REPO_ROOT/bin/aphelion-agents.mjs" init >/dev/null 2>&1)
if ! diff -q "$REPO_ROOT/src/.claude/settings.json" "$TMP_MERGE/.claude/settings.json" >/dev/null 2>&1; then
  echo "FAIL [merge-s1]: init settings.json diverges from template on fresh install"
  rm -rf "$TMP_MERGE"
  exit 1
fi
echo "PASS [merge-s1]: init on empty dir creates settings.json matching template"

# シナリオ 2: Aphelion 以外の hook を持つ既存 settings.json で init --force → "merged" + ユーザー設定保持
USER_SETTINGS_PATH="$TMP_MERGE/.claude/settings.json"
cat > "$USER_SETTINGS_PATH" <<'EOJSON'
{
  "outputStyle": "dark",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/my-custom-hook.sh"
          }
        ]
      }
    ]
  }
}
EOJSON
(cd "$TMP_MERGE" && node "$REPO_ROOT/bin/aphelion-agents.mjs" init --force >/dev/null 2>&1)
# ユーザーのカスタム hook が残っていることを確認 (merge 後は 2-space indent)
if ! grep -q '"outputStyle"' "$USER_SETTINGS_PATH" || ! grep -q '"dark"' "$USER_SETTINGS_PATH"; then
  echo "FAIL [merge-s2]: init did not preserve user's outputStyle field"
  rm -rf "$TMP_MERGE"
  exit 1
fi
if ! grep -q '"command": "/usr/local/bin/my-custom-hook.sh"' "$USER_SETTINGS_PATH"; then
  echo "FAIL [merge-s2]: init did not preserve user's custom hook entry"
  rm -rf "$TMP_MERGE"
  exit 1
fi
if ! grep -q 'aphelion-secrets-precommit.sh' "$USER_SETTINGS_PATH"; then
  echo "FAIL [merge-s2]: init did not add Aphelion secrets-precommit hook"
  rm -rf "$TMP_MERGE"
  exit 1
fi
echo "PASS [merge-s2]: init with existing user settings.json merges Aphelion hooks (user settings preserved)"

# シナリオ 3: 同コマンド再実行 (idempotency) → Aphelion entry が重複しない
(cd "$TMP_MERGE" && node "$REPO_ROOT/bin/aphelion-agents.mjs" init --force >/dev/null 2>&1)
COUNT=$(grep -c 'aphelion-secrets-precommit.sh' "$USER_SETTINGS_PATH" || true)
if [ "$COUNT" -ne 1 ]; then
  echo "FAIL [merge-s3]: idempotency broken — aphelion-secrets-precommit.sh appears $COUNT times (expected 1)"
  rm -rf "$TMP_MERGE"
  exit 1
fi
echo "PASS [merge-s3]: idempotent merge — Aphelion entries not duplicated on re-run"

# シナリオ 4: 不正 JSON ファイルで init --force → スキップ + 警告、init 自体は成功終了
echo "NOT VALID JSON {{{{" > "$USER_SETTINGS_PATH"
OUTPUT=$((cd "$TMP_MERGE" && node "$REPO_ROOT/bin/aphelion-agents.mjs" init --force) 2>&1) || true
EXIT_CODE=$?
if [ "$EXIT_CODE" -ne 0 ]; then
  echo "FAIL [merge-s4]: init exited with non-zero code ($EXIT_CODE) on malformed settings.json"
  rm -rf "$TMP_MERGE"
  exit 1
fi
if ! echo "$OUTPUT" | grep -qi "JSON"; then
  echo "FAIL [merge-s4]: init did not emit a warning about JSON parse failure"
  rm -rf "$TMP_MERGE"
  exit 1
fi
if ! grep -q "NOT VALID JSON" "$USER_SETTINGS_PATH"; then
  echo "FAIL [merge-s4]: malformed settings.json was overwritten (expected skip)"
  rm -rf "$TMP_MERGE"
  exit 1
fi
echo "PASS [merge-s4]: malformed settings.json → skipped + warning, init continues"

# シナリオ 5: update 側でも Aphelion 以外の hook を保持しつつマージ
cat > "$USER_SETTINGS_PATH" <<'EOJSON'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/user-write-guard.sh"
          }
        ]
      }
    ]
  }
}
EOJSON
(cd "$TMP_MERGE" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null 2>&1)
if ! grep -q '"command": "/usr/local/bin/user-write-guard.sh"' "$USER_SETTINGS_PATH"; then
  echo "FAIL [merge-s5]: update did not preserve user's custom hook entry"
  rm -rf "$TMP_MERGE"
  exit 1
fi
if ! grep -q 'aphelion-secrets-precommit.sh' "$USER_SETTINGS_PATH"; then
  echo "FAIL [merge-s5]: update did not add Aphelion hooks"
  rm -rf "$TMP_MERGE"
  exit 1
fi
echo "PASS [merge-s5]: update merges Aphelion hooks (user settings preserved)"

# シナリオ 6: update の idempotency
(cd "$TMP_MERGE" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null 2>&1)
COUNT=$(grep -c 'aphelion-secrets-precommit.sh' "$USER_SETTINGS_PATH" || true)
if [ "$COUNT" -ne 1 ]; then
  echo "FAIL [merge-s6]: update idempotency broken — aphelion-secrets-precommit.sh appears $COUNT times"
  rm -rf "$TMP_MERGE"
  exit 1
fi
echo "PASS [merge-s6]: update idempotent — Aphelion entries not duplicated on re-run"

# シナリオ 7: update + 不正 JSON → スキップ + 警告、update 自体は成功終了
echo "NOT VALID JSON {{{{" > "$USER_SETTINGS_PATH"
OUTPUT=$((cd "$TMP_MERGE" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update) 2>&1) || true
EXIT_CODE=$?
if [ "$EXIT_CODE" -ne 0 ]; then
  echo "FAIL [merge-s7]: update exited with non-zero code ($EXIT_CODE) on malformed settings.json"
  rm -rf "$TMP_MERGE"
  exit 1
fi
if ! echo "$OUTPUT" | grep -qi "JSON"; then
  echo "FAIL [merge-s7]: update did not emit a warning about JSON parse failure"
  rm -rf "$TMP_MERGE"
  exit 1
fi
if ! grep -q "NOT VALID JSON" "$USER_SETTINGS_PATH"; then
  echo "FAIL [merge-s7]: malformed settings.json was overwritten on update (expected skip)"
  rm -rf "$TMP_MERGE"
  exit 1
fi
echo "PASS [merge-s7]: update + malformed settings.json → skipped + warning, update continues"

rm -rf "$TMP_MERGE"
echo "PASS: all settings.json merge regression tests passed (#114)"

# ────────────────────────────────────────────────────────────────────
# P7 regex regression test (PR 1d #107)
# Verifies that the `--` separator fix allows grep to match a PEM
# private key header without interpreting `-----BEGIN` as flags.
# ────────────────────────────────────────────────────────────────────

# Source the lib into a subshell so we don't pollute this script's env
PRIVATE_KEY_FIXTURE="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4PAtEsHAjVCnhk=
-----END RSA PRIVATE KEY-----"

TMP_LIB_TEST="$(mktemp -d)"
# Copy lib from init'd dir (already exists in TMP)
cp "$REPO_ROOT/src/.claude/hooks/lib/secret-patterns.sh" "$TMP_LIB_TEST/secret-patterns.sh"

P7_RESULT=$(bash -c "
  source '$TMP_LIB_TEST/secret-patterns.sh'
  if aphelion_secret_grep \"\$1\"; then
    echo 'matched'
  else
    echo 'no-match'
  fi
" -- "$PRIVATE_KEY_FIXTURE" 2>&1)

rm -rf "$TMP_LIB_TEST"

if [ "$P7_RESULT" = "P7" ] || echo "$P7_RESULT" | grep -q "^P7"; then
  echo "PASS [P7-regression]: PEM private key header correctly detected after -- fix"
else
  echo "FAIL [P7-regression]: PEM private key header not detected (got: $P7_RESULT)"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────
# Distribution reconciliation tests (#202 / #203 / #207)
# 独立した tmp dir (TMP_DIST) を使う
# ────────────────────────────────────────────────────────────────────
TMP_DIST="$(mktemp -d)"
trap 'rm -rf "$TMP" "$TMP_DIST"' EXIT

(cd "$TMP_DIST" && node "$REPO_ROOT/bin/aphelion-agents.mjs" init >/dev/null 2>&1)

# #203: doc-flow テンプレートが配布されること
if ! [ -f "$TMP_DIST/.claude/templates/doc-flow/hld.en.md" ]; then
  echo "FAIL [dist-templates]: init did not install .claude/templates/doc-flow/"
  exit 1
fi
TEMPLATE_COUNT=$(ls "$TMP_DIST/.claude/templates/doc-flow/" | wc -l | tr -d ' ')
if [ "$TEMPLATE_COUNT" -lt 12 ]; then
  echo "FAIL [dist-templates]: expected >=12 doc-flow templates, found $TEMPLATE_COUNT"
  exit 1
fi
# package.json files に templates が含まれること (npx 配布経路の回帰ロック)
if ! grep -q '"\.claude/templates"' "$REPO_ROOT/package.json"; then
  echo "FAIL [dist-templates]: package.json files does not list .claude/templates"
  exit 1
fi
echo "PASS [dist-templates]: doc-flow templates installed and listed in package.json files (#203)"

# マニフェストが生成されること
MANIFEST="$TMP_DIST/.claude/.aphelion-manifest.json"
if ! [ -f "$MANIFEST" ]; then
  echo "FAIL [dist-manifest]: init did not write .aphelion-manifest.json"
  exit 1
fi
echo "PASS [dist-manifest]: init writes the distribution manifest"

# #202: ユーザーが削除した hook entry は update で復活しない
node -e '
const fs = require("fs");
const p = process.argv[1];
const s = JSON.parse(fs.readFileSync(p, "utf8"));
s.hooks.PostToolUse = (s.hooks.PostToolUse ?? []).filter(
  (e) => !JSON.stringify(e).includes("deps-postinstall"));
s.hooks.PreToolUse.push({matcher: "Bash", hooks: [{type: "command", command: "/usr/local/bin/user-own.sh"}]});
fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
' "$TMP_DIST/.claude/settings.json"
(cd "$TMP_DIST" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null 2>&1)
if grep -q 'deps-postinstall' "$TMP_DIST/.claude/settings.json"; then
  echo "FAIL [dist-tombstone]: update revived a hook entry the user had removed (#202)"
  exit 1
fi
if ! grep -q 'user-own.sh' "$TMP_DIST/.claude/settings.json"; then
  echo "FAIL [dist-tombstone]: update dropped the user's own hook entry"
  exit 1
fi
if ! grep -q 'aphelion-secrets-precommit.sh' "$TMP_DIST/.claude/settings.json"; then
  echo "FAIL [dist-tombstone]: update dropped a hook the user had NOT removed"
  exit 1
fi
# 再実行しても復活せず、重複もしない
(cd "$TMP_DIST" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null 2>&1)
if grep -q 'deps-postinstall' "$TMP_DIST/.claude/settings.json"; then
  echo "FAIL [dist-tombstone]: hook revived on the second update"
  exit 1
fi
COUNT=$(grep -c 'aphelion-secrets-precommit.sh' "$TMP_DIST/.claude/settings.json" || true)
if [ "$COUNT" -ne 1 ]; then
  echo "FAIL [dist-tombstone]: idempotency broken — secrets-precommit appears $COUNT times"
  exit 1
fi
echo "PASS [dist-tombstone]: user-removed hooks stay removed; others refreshed idempotently (#202)"

# #207: orphan は既定では報告のみ、--prune で削除される
echo "zombie" > "$TMP_DIST/.claude/agents/zombie-agent.md"
node -e '
const fs = require("fs");
const p = process.argv[1];
const m = JSON.parse(fs.readFileSync(p, "utf8"));
m.files.push("agents/zombie-agent.md");
fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
' "$MANIFEST"
OUT=$( (cd "$TMP_DIST" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update) 2>&1 )
if ! echo "$OUT" | grep -q "zombie-agent.md"; then
  echo "FAIL [dist-orphan]: update did not report the orphaned file"
  exit 1
fi
if ! [ -f "$TMP_DIST/.claude/agents/zombie-agent.md" ]; then
  echo "FAIL [dist-orphan]: update deleted a file without --prune"
  exit 1
fi
# 未解決 orphan は次回も報告される (carry-forward)
OUT=$( (cd "$TMP_DIST" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update) 2>&1 )
if ! echo "$OUT" | grep -q "zombie-agent.md"; then
  echo "FAIL [dist-orphan]: unresolved orphan was forgotten on the next update"
  exit 1
fi
(cd "$TMP_DIST" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update --prune >/dev/null 2>&1)
if [ -f "$TMP_DIST/.claude/agents/zombie-agent.md" ]; then
  echo "FAIL [dist-orphan]: --prune did not delete the orphaned file"
  exit 1
fi
echo "PASS [dist-orphan]: orphans reported by default, carried forward, deleted only with --prune (#207)"

# #207 legacy: マニフェスト無しの旧環境でも既知の撤去済みファイルを検出する
TMP_LEGACY="$(mktemp -d)"
(cd "$TMP_LEGACY" && node "$REPO_ROOT/bin/aphelion-agents.mjs" init >/dev/null 2>&1)
rm -f "$TMP_LEGACY/.claude/.aphelion-manifest.json"
echo "old pm shortcut" > "$TMP_LEGACY/.claude/commands/pm.md"
OUT=$( (cd "$TMP_LEGACY" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update) 2>&1 )
if ! echo "$OUT" | grep -q "commands/pm.md"; then
  echo "FAIL [dist-legacy]: legacy install without a manifest did not report commands/pm.md"
  rm -rf "$TMP_LEGACY"
  exit 1
fi
rm -rf "$TMP_LEGACY"
echo "PASS [dist-legacy]: known removed files detected on pre-manifest installs (#207)"

# ────────────────────────────────────────────────────────────────────
# Dogfooding hooks must not be distributed (#197)
# ────────────────────────────────────────────────────────────────────
TMP_DOGFOOD="$(mktemp -d)"
(cd "$TMP_DOGFOOD" && node "$REPO_ROOT/bin/aphelion-agents.mjs" init >/dev/null 2>&1)
for dev_hook in aphelion-md-sync.sh aphelion-agent-count-check.sh aphelion-task-md-lifecycle.sh; do
  if [ -f "$TMP_DOGFOOD/.claude/hooks/$dev_hook" ]; then
    echo "FAIL [dogfooding]: $dev_hook was distributed to a user project (#197)"
    rm -rf "$TMP_DOGFOOD"
    exit 1
  fi
done
# the four user-facing hooks must still arrive
for user_hook in aphelion-secrets-precommit.sh aphelion-sensitive-file-guard.sh \
                 aphelion-deps-postinstall.sh aphelion-project-rules-check.sh; do
  if ! [ -f "$TMP_DOGFOOD/.claude/hooks/$user_hook" ]; then
    echo "FAIL [dogfooding]: user-facing hook $user_hook is missing after init"
    rm -rf "$TMP_DOGFOOD"
    exit 1
  fi
done
# a pre-0.3.13 install that already has one is reported as an orphan
echo "stale" > "$TMP_DOGFOOD/.claude/hooks/aphelion-md-sync.sh"
rm -f "$TMP_DOGFOOD/.claude/.aphelion-manifest.json"
OUT=$( (cd "$TMP_DOGFOOD" && node "$REPO_ROOT/bin/aphelion-agents.mjs" update) 2>&1 )
if ! echo "$OUT" | grep -q "aphelion-md-sync.sh"; then
  echo "FAIL [dogfooding]: a previously distributed dogfooding hook was not reported as an orphan"
  rm -rf "$TMP_DOGFOOD"
  exit 1
fi
rm -rf "$TMP_DOGFOOD"
echo "PASS [dogfooding]: dev-only hooks excluded from distribution, user hooks intact, legacy copies reported (#197)"
