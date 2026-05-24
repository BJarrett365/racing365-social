#!/usr/bin/env node
/**
 * Planet Sport Studio — automation tasks for OpenClaw Assistant, cron, or Cursor.
 *
 * Usage:
 *   node scripts/planetsport-tasks.mjs list
 *   node scripts/planetsport-tasks.mjs wc-schedule
 *   node scripts/planetsport-tasks.mjs epl-schedule
 *   node scripts/planetsport-tasks.mjs schedules
 *   node scripts/planetsport-tasks.mjs status
 *
 * OpenClaw (chat or cron): run from repo root with absolute path to this script.
 */
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const TASKS = {
  "wc-schedule": {
    label: "Refresh World Cup 2026 fixtures + Betway IDs",
    script: "seed-wc2026-schedule.mjs",
    args: [],
  },
  "epl-schedule": {
    label: "Refresh Premier League upcoming fixtures + Betway IDs",
    script: "seed-epl-schedule.mjs",
    args: [],
  },
  schedules: {
    label: "Refresh WC + EPL schedules",
    composite: ["wc-schedule", "epl-schedule"],
  },
  status: {
    label: "Report schedule store counts (no fetch)",
    handler: reportStatus,
  },
};

function usage() {
  console.log(`Planet Sport automation tasks

Commands:
  list           Show all tasks
  wc-schedule    Betway WC 2026 import (Puppeteer)
  epl-schedule   Betway Premier League upcomings import
  schedules      Run wc-schedule then epl-schedule
  status         Fixture counts from local JSON stores

Examples:
  node scripts/planetsport-tasks.mjs status
  node scripts/planetsport-tasks.mjs schedules

Repo: ${ROOT}
`);
}

async function readFixtureStore(file, key = "fixtures") {
  try {
    const raw = await fs.readFile(path.join(ROOT, "data/local/plexa-match-report", file), "utf-8");
    const data = JSON.parse(raw);
    const rows = Array.isArray(data[key]) ? data[key] : [];
    const withBetway = rows.filter((r) => r.betwayMatchId).length;
    return { count: rows.length, betway: withBetway, updatedAt: data.updatedAt ?? null };
  } catch {
    return { count: 0, betway: 0, updatedAt: null };
  }
}

async function reportStatus() {
  const wc = await readFixtureStore("wc2026-fixtures.json");
  const epl = await readFixtureStore("epl-fixtures.json");
  const out = {
    ok: true,
    task: "status",
    repo: ROOT,
    wc2026: wc,
    epl,
  };
  console.log(JSON.stringify(out, null, 2));
  return out;
}

function runScript(scriptName, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn(process.execPath, [scriptPath, ...extraArgs], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function runTask(id) {
  const task = TASKS[id];
  if (!task) throw new Error(`Unknown task: ${id}`);

  if (task.handler) {
    await task.handler();
    return;
  }

  if (task.composite) {
    for (const sub of task.composite) {
      await runTask(sub);
    }
    await reportStatus();
    return;
  }

  console.log(`\n▶ ${task.label}\n`);
  await runScript(task.script, task.args ?? []);
  console.log(`\n✓ ${id} complete\n`);
}

async function main() {
  const cmd = process.argv[2]?.trim() || "list";

  if (cmd === "list" || cmd === "help" || cmd === "-h" || cmd === "--help") {
    usage();
    console.log("Registered tasks:");
    for (const [id, task] of Object.entries(TASKS)) {
      console.log(`  ${id.padEnd(14)} ${task.label}`);
    }
    return;
  }

  const started = Date.now();
  try {
    await runTask(cmd);
    const summary = cmd === "status" ? null : await readSummary();
    if (summary) {
      console.log("Summary:", JSON.stringify(summary));
    }
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

async function readSummary() {
  const wc = await readFixtureStore("wc2026-fixtures.json");
  const epl = await readFixtureStore("epl-fixtures.json");
  return { wc2026: `${wc.betway}/${wc.count} Betway IDs`, epl: `${epl.betway}/${epl.count} Betway IDs` };
}

main();
