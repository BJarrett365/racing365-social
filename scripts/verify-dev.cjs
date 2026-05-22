/**
 * Quick check that the dev server answers on 127.0.0.1 and localhost.
 * Requests are **sequential** and redirects are not followed — parallel compiles
 * (e.g. `/` + `/login` at once) corrupt `.next/server/app-paths-manifest.json`.
 *
 * Usage: PORT=8081 node scripts/verify-dev.cjs
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || "8081");
const root = path.join(__dirname, "..");
const manifestPath = path.join(root, ".next", "server", "app-paths-manifest.json");
const paths = ["/login", "/healthz.txt", "/api/health"];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 45_000 }, (res) => {
      let body = "";
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body, location: res.headers.location }));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryHost(label, hostname) {
  const base = `http://${hostname}:${port}`;
  console.log(`\n--- ${label} (${base}) ---`);
  for (const p of paths) {
    try {
      const r = await get(`${base}${p}`);
      const extra = r.location ? ` → ${r.location}` : "";
      console.log(`  ${p} → HTTP ${r.status}${extra}`);
      await sleep(400);
    } catch (e) {
      console.log(`  ${p} → FAIL: ${e instanceof Error ? e.message : e}`);
    }
  }

  try {
    const login = await get(`${base}/login`);
    if (login.status !== 200) {
      console.log(`  /login (css probe) → HTTP ${login.status} (skip chunk check)`);
      return;
    }
    const m = login.body.match(/href="(\/_next\/static\/css\/app\/layout\.css[^"]*)"/);
    const cssPath = m && m[1] ? m[1] : null;
    if (!cssPath) {
      console.log(`  /login → HTTP 200 but no layout.css link in HTML (skip chunk check)`);
      return;
    }
    await sleep(300);
    const cssUrl = `${base}${cssPath}`;
    const css = await get(cssUrl);
    const ok = css.status === 200 && css.body.length > 10_000;
    console.log(
      `  ${cssPath.split("?")[0]} → HTTP ${css.status} (${css.body.length} bytes) ${ok ? "OK" : "FAIL (unstyled-dev risk)"}`,
    );
    if (!ok) {
      process.exitCode = 41;
    }
  } catch (e) {
    console.log(`  client chunk probe → FAIL: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 41;
  }
}

(async () => {
  console.log(`verify-dev: PORT=${port}`);
  if (!fs.existsSync(manifestPath)) {
    console.error(
      "\nMissing .next/server/app-paths-manifest.json — dev cache is corrupted or still compiling.\n" +
        "Run: npm run dev:restart\n" +
        "Then wait ~10s before loading pages (avoid parallel tabs on first load).\n",
    );
    process.exitCode = 42;
  } else {
    console.log("\napp-paths-manifest.json → OK");
  }

  await tryHost("IPv4 loopback", "127.0.0.1");
  await sleep(500);
  await tryHost("localhost", "localhost");

  if (process.exitCode === 41) {
    console.error(
      "\nClient CSS failed. If the site looks unstyled: npm run clean && npm run dev:restart\n" +
        "(Avoid NEXT_DIST_DIR=.next-dev with webpack here — client /_next/static may 404.)\n",
    );
  }

  if (!fs.existsSync(manifestPath)) {
    console.error("\nManifest disappeared during verify — parallel compile race. npm run dev:restart\n");
    process.exitCode = 42;
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
