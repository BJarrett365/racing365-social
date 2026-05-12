/**
 * Start Next.js dev (default distDir `.next` from next.config unless NEXT_DIST_DIR is set).
 *
 * Frees the dev port, then starts `next dev`. Turbopack is the default because webpack dev
 * intermittently writes manifests without the matching `.next/static` client assets on this
 * machine, which leaves the browser with unstyled HTML.
 *
 * Also stops any process already listening on the dev port (macOS/Linux) so an old
 * broken Node server cannot keep serving after the build folder was removed.
 *
 * Do not pre-create `.next` subtrees before `next dev` — that can leave the server expecting
 * `middleware-manifest.json` and similar files that only appear after Next's first compile.
 */
const { existsSync, rmSync, readFileSync } = require("fs");
const { join } = require("path");
const { spawn, execSync, execFileSync } = require("child_process");
const http = require("http");

const root = join(__dirname, "..");
try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (pkg.name !== "racing365-social") {
    console.error(
      "[run-dev] Wrong folder: package.json name is not racing365-social. cd into the racing365-social repo root, then run npm run dev.",
    );
    process.exit(1);
  }
} catch (e) {
  console.error("[run-dev] Could not read package.json — run from the project root.", e);
  process.exit(1);
}
const distDir = (process.env.NEXT_DIST_DIR || ".next").trim() || ".next";
const nextDir = join(root, distDir);
const devPort = process.env.PORT || "8081";
/**
 * Bind address for `next dev`. See scripts/print-default-listen-host.cjs (macOS `::` for localhost).
 */
let devHost;
try {
  devHost = execFileSync(process.execPath, [join(__dirname, "print-default-listen-host.cjs")], {
    encoding: "utf8",
    cwd: root,
  }).trim();
} catch {
  devHost = "0.0.0.0";
}
if (!devHost) devHost = "0.0.0.0";
/** Use `USE_TURBO=0 npm run dev` only if you need to debug webpack-specific behavior. */
const useTurbo = process.env.USE_TURBO !== "0";

function pidsListeningOnTcpPort(port) {
  const p = String(port);
  let out = "";
  try {
    out = execSync(`lsof -nP -iTCP:${p} -sTCP:LISTEN -t`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return [];
  }
  if (!out) return [];
  const ids = new Set();
  for (const line of out.split(/\s+/)) {
    const n = Number(line.trim());
    if (Number.isFinite(n) && n > 0) ids.add(n);
  }
  return [...ids];
}

function releasePort(port) {
  const p = String(port);
  if (process.platform === "darwin" || process.platform === "linux") {
    const killed = new Set();
    try {
      for (let round = 0; round < 2; round++) {
        for (const pid of pidsListeningOnTcpPort(p)) {
          killed.add(pid);
          try {
            process.kill(pid, "SIGKILL");
          } catch (_) {
            /* gone */
          }
        }
        if (round === 0) {
          try {
            execSync("sleep 1", { stdio: "ignore" });
          } catch (_) {
            /* ignore */
          }
        }
      }
      if (killed.size) {
        console.error(`[run-dev] freed port ${p}: killed PIDs ${[...killed].sort((a, b) => a - b).join(", ")}`);
      }
    } catch (_) {
      /* lsof missing */
    }
    if (process.platform === "linux") {
      try {
        execSync(`fuser -k ${p}/tcp`, { stdio: "ignore" });
      } catch (_) {
        /* ignore */
      }
    }
  }
}

if (process.argv.includes("--kill-port-only")) {
  releasePort(devPort);
  process.exit(0);
}

if (process.env.SKIP_RELEASE_PORT !== "1") {
  releasePort(devPort);
  try {
    execSync(process.platform === "win32" ? "ping 127.0.0.1 -n 3 >nul 2>&1" : "sleep 2", { stdio: "ignore" });
  } catch (_) {
    /* ignore */
  }
}

if (process.env.FORCE_CLEAN_DEV_DIST === "1" && existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.error(`[run-dev] Removed ${distDir} (FORCE_CLEAN_DEV_DIST=1).`);
}

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const args = [nextCli, "dev", "-p", devPort, "-H", devHost];
if (useTurbo) args.push("--turbo");

/** Avoid EMFILE / broken CSS & HMR on macOS (too many file watchers). Disable: WATCHPACK_POLLING=0 */
const devEnv = { ...process.env };
if (useTurbo) {
  devEnv.USE_TURBO = "1";
}
if (devEnv.WATCHPACK_POLLING === undefined || devEnv.WATCHPACK_POLLING === "") {
  devEnv.WATCHPACK_POLLING = "true";
}

console.error(
  `[run-dev] Starting Next.js on port ${devPort} (host ${devHost}, dist ${distDir}).\n` +
    `[run-dev] Open: http://127.0.0.1:${devPort}/  or  http://localhost:${devPort}/\n` +
    `[run-dev] Quick restart: npm run dev:restart\n` +
    `[run-dev] If the site is blank or 500: npm run dev:restart  (or dev:kill-port then dev)\n` +
    (!useTurbo && devEnv.WATCHPACK_POLLING === "true"
      ? `[run-dev] WATCHPACK_POLLING=true + next.config webpack poll (dev). Disable poll: NEXT_WEBPACK_POLL=0; disable both: WATCHPACK_POLLING=0\n`
      : "") +
    `[run-dev] Language Studio import crons: set ENABLE_DEV_CRON_POLL=1 to poll this server like npm start; otherwise nothing calls /api/cron/language-imports until you refresh manually.\n` +
    `[run-dev] Do not use npm start until you run npm run build.\n`,
);

const devCronPollEnabled =
  process.env.ENABLE_DEV_CRON_POLL === "1" && process.env.CRON_POLL_DISABLED !== "1";
const cronPollMs = Number(process.env.CRON_POLL_INTERVAL_MS || 60_000);

function pollDueCrons() {
  const headers = {};
  if (process.env.CRON_SECRET) headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.ADMIN_TOKEN) headers["x-admin-token"] = process.env.ADMIN_TOKEN;
  const req = http.request(
    {
      hostname: "127.0.0.1",
      port: devPort,
      path: "/api/cron/language-imports",
      method: "POST",
      headers,
      timeout: 25_000,
    },
    (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          console.error(`[run-dev] cron poll failed ${res.statusCode}: ${body.slice(0, 300)}`);
          return;
        }
        try {
          const data = JSON.parse(body);
          if (data.ran) console.error(`[run-dev] cron poll ran ${data.ran} due job(s).`);
        } catch {
          /* ignore */
        }
      });
    },
  );
  req.on("timeout", () => req.destroy(new Error("cron poll timed out")));
  req.on("error", (error) => {
    console.error(`[run-dev] cron poll error: ${error.message}`);
  });
  req.end();
}

const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: devEnv,
});

if (
  devCronPollEnabled &&
  Number.isFinite(cronPollMs) &&
  cronPollMs >= 30_000
) {
  console.error(
    `[run-dev] ENABLE_DEV_CRON_POLL=1: calling /api/cron/language-imports every ${Math.round(cronPollMs / 1000)}s (same behavior as npm start). Omit this env to avoid background imports while coding.\n`,
  );
  setTimeout(() => {
    pollDueCrons();
    setInterval(pollDueCrons, cronPollMs);
  }, 15_000);
}

child.on("exit", (code) => process.exit(code ?? 0));
