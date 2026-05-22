/**
 * Pre-compile key dev routes sequentially after a clean restart.
 * Parallel on-demand compiles can corrupt .next manifests on macOS webpack dev.
 *
 * Usage: PORT=8081 node scripts/warm-dev.cjs
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");

const port = Number(process.env.PORT || "8081");
const host = process.env.DEV_WARM_HOST || "127.0.0.1";
const root = path.join(__dirname, "..");
const pauseMs = Number(process.env.DEV_WARM_PAUSE_MS || "2000");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

function authCookie() {
  const secret = process.env.PLEXA_SESSION_SECRET;
  if (!secret) return "";
  const payload = {
    userId: "dev-warm",
    email: "dev-warm@local",
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `plexa_session=${encodeURIComponent(`${body}.${sig}`)}`;
}

const routes = [
  "/login",
  "/",
  "/language-studio?tab=Rewrite",
  "/language-studio?tab=Imports",
  "/api/health",
];

function get(path, cookie) {
  return new Promise((resolve, reject) => {
    const headers = cookie ? { Cookie: cookie } : undefined;
    const req = http.get(
      { hostname: host, port, path, timeout: 120_000, headers },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function waitForHealth(maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const status = await get("/api/health");
      if (status === 200) return;
    } catch {
      /* server still starting */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("dev server did not become healthy in time");
}

(async () => {
  loadEnvLocal();
  const cookie = authCookie();
  console.error(`[warm-dev] Waiting for http://${host}:${port}/api/health …`);
  await waitForHealth();
  console.error(`[warm-dev] Warming routes sequentially (${pauseMs}ms pause, auth=${cookie ? "yes" : "no"})…`);
  for (const route of routes) {
    try {
      const status = await get(route, cookie);
      console.error(`[warm-dev] ${route} → ${status}`);
    } catch (error) {
      console.error(`[warm-dev] ${route} → FAIL: ${error instanceof Error ? error.message : error}`);
    }
    await new Promise((r) => setTimeout(r, pauseMs));
  }
  const manifest = path.join(root, ".next", "server", "app-paths-manifest.json");
  if (!fs.existsSync(manifest)) {
    console.error("[warm-dev] WARNING: app-paths-manifest.json missing after warm — run npm run dev:restart again.");
    process.exitCode = 42;
  } else {
    console.error("[warm-dev] Done.");
  }
})().catch((error) => {
  console.error(`[warm-dev] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
