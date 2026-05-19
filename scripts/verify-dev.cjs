/**
 * Quick check that the dev server answers on 127.0.0.1 and localhost.
 * Also verifies `/_next/static` client chunks after `/login` compiles (catches "unstyled" dev).
 *
 * Usage: PORT=8081 node scripts/verify-dev.cjs
 */
const http = require("http");
const { URL } = require("url");

const port = Number(process.env.PORT || "8081");
const paths = ["/", "/healthz.txt", "/api/health"];

function get(url, redirectLimit = 5) {
  return new Promise((resolve, reject) => {
    if (redirectLimit <= 0) {
      reject(new Error("too many redirects"));
      return;
    }
    const req = http.get(url, { timeout: 45_000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, url).href;
        res.resume();
        get(nextUrl, redirectLimit - 1).then(resolve).catch(reject);
        return;
      }
      let body = "";
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
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

  try {
    const login = await get(`${base}/login`);
    if (login.status !== 200) {
      console.log(`  /login → HTTP ${login.status} (skip chunk check)`);
      return;
    }
    const m = login.body.match(/href="(\/_next\/static\/css\/app\/layout\.css[^"]*)"/);
    const cssPath = m && m[1] ? m[1] : null;
    if (!cssPath) {
      console.log(`  /login → HTTP 200 but no layout.css link in HTML (skip chunk check)`);
      return;
    }
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
  await tryHost("IPv4 loopback", "127.0.0.1");
  await tryHost("localhost", "localhost");
  if (process.exitCode === 41) {
    console.error(
      "\nClient CSS failed. If the site looks unstyled: npm run clean && npm run dev:restart\n" +
        "(Avoid NEXT_DIST_DIR=.next-dev with webpack here — client /_next/static may 404.)\n",
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
