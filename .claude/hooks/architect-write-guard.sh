#!/bin/bash
# PreToolUse hook for the `architect` subagent.
#
# The architect agent must only ever write/edit plan files under docs/plans/
# (never source code). Since a subagent's `tools:` frontmatter only accepts
# bare tool names — not path-scoped patterns like `Edit(docs/plans/**)` — this
# hook enforces the path restriction for every Write/Edit call the agent makes.
#
# Wired up via the `hooks.PreToolUse` field in .claude/agents/architect.md.

set -euo pipefail

input="$(cat)"

file_path="$(jq -r '.tool_input.file_path // empty' <<<"$input")"

if [[ -z "$file_path" ]]; then
  # No file_path we can check (shouldn't happen for Write/Edit) — let normal
  # permission handling decide.
  exit 0
fi

# Resolve relative to the project root so both relative and absolute paths
# are checked consistently.
project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
case "$file_path" in
  /*) resolved="$file_path" ;;
  *) resolved="$project_dir/$file_path" ;;
esac

allowed_dir="$project_dir/docs/plans"

case "$resolved" in
  "$allowed_dir"/*)
    exit 0
    ;;
  *)
    jq -n --arg reason "The architect agent may only write/edit files under docs/plans/ (planning docs, never source code). Blocked path: $file_path" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: $reason
      }
    }'
    exit 0
    ;;
esac
