#!/usr/bin/env node
/**
 * Hostname for `next dev` / `next start` -H (printed to stdout).
 * - DEV_HOST in the environment wins (shell or .env.local below).
 * - Else macOS uses `::` so http://localhost:PORT (::1) works; other platforms use `0.0.0.0`.
 *
 * Binding only IPv4 (0.0.0.0) on macOS often breaks http://localhost when it resolves to ::1 first.
 */
const { existsSync, readFileSync } = require("fs");
const { join } = require("path");

function loadDevHostFromEnvLocal() {
  if (String(process.env.DEV_HOST || "").trim()) return;
  try {
    const p = join(__dirname, "..", ".env.local");
    if (!existsSync(p)) return;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const m = t.match(/^DEV_HOST\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[1].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (v) process.env.DEV_HOST = v;
      break;
    }
  } catch {
    /* ignore */
  }
}

loadDevHostFromEnvLocal();

const fromEnv = String(process.env.DEV_HOST || "").trim();
if (fromEnv) {
  process.stdout.write(fromEnv);
  process.exit(0);
}
process.stdout.write(process.platform === "darwin" ? "::" : "0.0.0.0");
