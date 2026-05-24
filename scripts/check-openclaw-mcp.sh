#!/usr/bin/env bash
# Quick check before wiring OpenClaw into Cursor MCP.
set -euo pipefail

echo "== OpenClaw MCP preflight =="

OPENCLAW_BIN=""
for candidate in \
  "$(command -v openclaw 2>/dev/null || true)" \
  "${HOME}/.openclaw/bin/openclaw" \
  "/opt/homebrew/bin/openclaw" \
  "/usr/local/bin/openclaw"; do
  if [[ -n "${candidate}" && -x "${candidate}" ]]; then
    OPENCLAW_BIN="${candidate}"
    break
  fi
done

if [[ -n "${OPENCLAW_BIN}" ]]; then
  echo "✓ openclaw CLI: ${OPENCLAW_BIN}"
  "${OPENCLAW_BIN}" --version 2>/dev/null || true
else
  echo "✗ openclaw CLI not found on PATH or ~/.openclaw/bin"
  echo "  Install: curl -fsSL https://openclaw.ai/install.sh | bash"
  echo "  Or: npm install -g openclaw@latest && openclaw onboard --install-daemon"
fi

if [[ -d "/Applications/OpenClaw.app" ]]; then
  echo "✓ OpenClaw.app in /Applications (local gateway — good for Cursor MCP)"
elif [[ -d "${HOME}/Applications/Chrome Apps.localized/OpenClaw Cloud.app" ]]; then
  echo "ℹ OpenClaw Cloud.app found (Chrome PWA → https://cloud.getopenclaw.ai/dashboard/webchat)"
  echo "  This is the hosted web chat — NOT a local MCP server by itself."
  echo "  Cursor MCP needs either:"
  echo "    • local CLI: curl -fsSL https://openclaw.ai/install.sh | bash"
  echo "    • OR Cloud gateway URL + token from your OpenClaw Cloud dashboard (remote MCP bridge)"
fi

CONFIG_JSON="${HOME}/.openclaw/config.json"
OPENCLAW_JSON="${HOME}/.openclaw/openclaw.json"
if [[ -f "${CONFIG_JSON}" ]]; then
  echo "✓ found ${CONFIG_JSON}"
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY' "${CONFIG_JSON}" 2>/dev/null || true
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
key = (
    data.get("api", {}).get("key")
    or data.get("gateway", {}).get("apiKey")
    or data.get("apiKey")
)
print("  api key present:", "yes" if key else "no (check config shape)")
PY
  fi
elif [[ -f "${OPENCLAW_JSON}" ]]; then
  echo "✓ found ${OPENCLAW_JSON}"
else
  echo "✗ no ~/.openclaw/config.json or openclaw.json"
fi

if [[ -n "${OPENCLAW_BIN}" ]]; then
  echo ""
  echo "Gateway status:"
  "${OPENCLAW_BIN}" gateway status 2>/dev/null || echo "  (run: openclaw gateway status)"
fi

URL="${OPENCLAW_MCP_URL:-http://localhost:3721/mcp}"
KEY="${OPENCLAW_API_KEY:-}"

echo ""
echo "SSE endpoint: ${URL}"
if [[ -n "${KEY}" ]]; then
  echo "✓ OPENCLAW_API_KEY is set (${#KEY} chars)"
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer ${KEY}" \
    -H "Accept: text/event-stream" \
    "${URL}" || echo "000")"
  echo "  HTTP probe: ${code} (401/405 can be normal depending on server; connection refused = gateway down)"
else
  echo "✗ OPENCLAW_API_KEY not set"
  echo "  export OPENCLAW_API_KEY=\$(python3 -c \"import json; print(json.load(open('${HOME}/.openclaw/config.json')).get('api',{}).get('key',''))\")"
fi

echo ""
echo "Cursor config: ${PWD}/.cursor/mcp.json (local stdio: openclaw mcp serve)"
echo "If 'openclaw' not on PATH for Cursor, swap in .cursor/openclaw_mcp_local_stdio.json"
echo "Reload Cursor after gateway is running (Settings → MCP → openclaw green)."
