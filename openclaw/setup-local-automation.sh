#!/usr/bin/env bash
# One-time setup: local OpenClaw gateway + Planet Sport cron jobs.
# OpenClaw Cloud.app alone cannot run shell tasks on your Mac — this installs the local CLI.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASK_RUNNER="${REPO_ROOT}/scripts/planetsport-tasks.mjs"

echo "== Planet Sport × OpenClaw local automation =="
echo "Repo: ${REPO_ROOT}"
echo ""

OPENCLAW_BIN=""
for candidate in \
  "$(command -v openclaw 2>/dev/null || true)" \
  "${HOME}/.openclaw/bin/openclaw"; do
  if [[ -n "${candidate}" && -x "${candidate}" ]]; then
    OPENCLAW_BIN="${candidate}"
    break
  fi
done

if [[ -z "${OPENCLAW_BIN}" ]]; then
  echo "OpenClaw CLI not found. Installing..."
  curl -fsSL https://openclaw.ai/install-cli.sh | bash
  export PATH="${HOME}/.openclaw/bin:${PATH}"
  OPENCLAW_BIN="${HOME}/.openclaw/bin/openclaw"
fi

echo "Using: ${OPENCLAW_BIN}"
"${OPENCLAW_BIN}" --version || true
echo ""

if ! "${OPENCLAW_BIN}" gateway status 2>/dev/null | grep -qi running; then
  echo "Starting OpenClaw gateway (daemon)..."
  "${OPENCLAW_BIN}" onboard --install-daemon 2>/dev/null || "${OPENCLAW_BIN}" gateway install 2>/dev/null || true
  "${OPENCLAW_BIN}" gateway start 2>/dev/null || true
fi

echo ""
echo "Gateway:"
"${OPENCLAW_BIN}" gateway status 2>/dev/null || echo "(run: openclaw gateway status)"
echo ""

# Link workspace so the assistant knows this repo
WORKSPACE="${HOME}/.openclaw/workspace"
mkdir -p "${WORKSPACE}"
if [[ ! -f "${WORKSPACE}/PLANETSPORT.md" ]]; then
  cp "${REPO_ROOT}/openclaw/PLANETSPORT.md" "${WORKSPACE}/PLANETSPORT.md"
  echo "Copied PLANETSPORT.md → ${WORKSPACE}/PLANETSPORT.md"
fi

echo ""
echo "Registering cron jobs (skip if already exist)..."

register_cron() {
  local name="$1"
  local cron_expr="$2"
  local message="$3"
  if "${OPENCLAW_BIN}" cron list 2>/dev/null | grep -q "${name}"; then
    echo "  · ${name} (already registered)"
    return
  fi
  "${OPENCLAW_BIN}" cron add \
    --name "${name}" \
    --cron "${cron_expr}" \
    --tz "Europe/London" \
    --session isolated \
    --message "${message}" \
    2>/dev/null && echo "  ✓ ${name}" || echo "  ✗ ${name} (register manually — see openclaw/PLANETSPORT.md)"
}

register_cron "planetsport-epl-daily" "0 6 * * *" \
  "Run Planet Sport EPL schedule refresh: node ${TASK_RUNNER} epl-schedule — report fixture count and any errors."

register_cron "planetsport-wc-weekly" "0 7 * * 1" \
  "Run Planet Sport WC schedule refresh: node ${TASK_RUNNER} wc-schedule — report Betway ID coverage."

register_cron "planetsport-status-hourly" "0 * * * *" \
  "Run node ${TASK_RUNNER} status and alert only if WC fixtures < 100 or EPL fixtures = 0."

echo ""
echo "Cursor MCP: ensure ${REPO_ROOT}/.cursor/mcp.json uses openclaw mcp serve"
echo "Test task runner: node ${TASK_RUNNER} status"
echo ""
echo "OpenClaw Cloud.app is web-only — use this local gateway for shell automation on your Mac."
