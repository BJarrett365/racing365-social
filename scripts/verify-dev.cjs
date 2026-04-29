/**
 * Quick check that the dev server answers on 127.0.0.1 and localhost.
 * Usage: PORT=8081 node scripts/verify-dev.cjs
 */
const http = require("http");

const port = Number(process.env.PORT || "8081");
const paths = ["/", "/healthz.txt", "/api/health"];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: body.slice(0, 200) }));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function tryHost(label, hostname) {
  const base = `http://${hostname}:${port}`;
  console.log(`\n--- ${label} (${base}) ---`);
  for (const p of paths) {
    try {
      const r = await get(`${base}${p}`);
      console.log(`  ${p} → HTTP ${r.status}`);
    } catch (e) {
      console.log(`  ${p} → FAIL: ${e instanceof Error ? e.message : e}`);
    }
  }
}

(async () => {
  console.log(`verify-dev: PORT=${port}`);
  await tryHost("IPv4 loopback", "127.0.0.1");
  await tryHost("localhost", "localhost");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
