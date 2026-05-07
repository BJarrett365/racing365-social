/**
 * `next start` with the same default bind rules as run-dev (see print-default-listen-host.cjs).
 */
const { spawn } = require("child_process");
const { join } = require("path");
const { execFileSync } = require("child_process");
const http = require("http");

const root = join(__dirname, "..");
const port = process.env.PORT || "8081";
let host;
try {
  host = execFileSync(process.execPath, [join(__dirname, "print-default-listen-host.cjs")], {
    encoding: "utf8",
    cwd: root,
  }).trim();
} catch {
  host = "0.0.0.0";
}
if (!host) host = "0.0.0.0";

console.error(`[run-start] http://localhost:${port}/ and http://127.0.0.1:${port}/ (bind -H ${host}; override with DEV_HOST)\n`);

const cronPollMs = Number(process.env.CRON_POLL_INTERVAL_MS || 60_000);
const cronPollEnabled = process.env.CRON_POLL_DISABLED !== "1" && Number.isFinite(cronPollMs) && cronPollMs >= 30_000;

function pollDueCrons() {
  const headers = {};
  if (process.env.CRON_SECRET) headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.ADMIN_TOKEN) headers["x-admin-token"] = process.env.ADMIN_TOKEN;
  const req = http.request(
    {
      hostname: "127.0.0.1",
      port,
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
          console.error(`[run-start] cron poll failed ${res.statusCode}: ${body.slice(0, 300)}`);
          return;
        }
        try {
          const data = JSON.parse(body);
          if (data.ran) console.error(`[run-start] cron poll ran ${data.ran} due job(s).`);
        } catch {
          // Ignore successful non-JSON responses; the endpoint normally returns JSON.
        }
      });
    },
  );
  req.on("timeout", () => req.destroy(new Error("cron poll timed out")));
  req.on("error", (error) => {
    console.error(`[run-start] cron poll error: ${error.message}`);
  });
  req.end();
}

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextCli, "start", "-p", port, "-H", host], {
  cwd: root,
  stdio: "inherit",
});

if (cronPollEnabled) {
  console.error(`[run-start] Cron scheduler enabled: checking due jobs every ${Math.round(cronPollMs / 1000)}s.\n`);
  setTimeout(() => {
    pollDueCrons();
    setInterval(pollDueCrons, cronPollMs);
  }, 15_000);
}

child.on("exit", (code) => process.exit(code ?? 0));
