#!/usr/bin/env node
/**
 * GET every app `api` Route Handler (`route.ts`), with placeholders for dynamic segments,
 * plus a few top-level pages. Reports 401, 403, 404 (and optionally all non-2xx).
 *
 * Usage:
 *   node scripts/check-local-http.mjs
 *   node scripts/check-local-http.mjs --base http://127.0.0.1:3000
 *   node scripts/check-local-http.mjs --all-non2xx
 *
 * Start the dev server first: npm run dev  (default http://127.0.0.1:8081)
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const appApi = join(root, "app", "api");

const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const base = (
  (bi >= 0 && args[bi + 1] ? args[bi + 1] : null) ||
  process.env.AUDIT_BASE ||
  "http://127.0.0.1:8081"
).replace(/\/$/, "");
const allNon2xx = args.includes("--all-non2xx");

function placeholderForSegment(seg) {
  if (!seg.startsWith("[") || !seg.endsWith("]")) return seg;
  const inner = seg.slice(1, -1);
  if (inner.startsWith("...")) return "catch-all-segment";
  const lower = inner.toLowerCase();
  if (lower.includes("slug")) return "audit-placeholder-slug";
  if (lower.includes("session")) return "audit-session-id";
  if (lower.includes("task")) return "audit-task-id";
  if (lower.includes("project")) return "00000000-0000-0000-0000-000000000001";
  if (lower.includes("revision")) return "00000000-0000-0000-0000-000000000002";
  if (lower.endsWith("id")) return "00000000-0000-0000-0000-000000000001";
  return "audit-param";
}

async function collectApiRoutes(dir = appApi, parts = []) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectApiRoutes(p, [...parts, ent.name])));
    } else if (ent.name === "route.ts" || ent.name === "route.js") {
      const segs = parts.map(placeholderForSegment);
      const path = `/api/${segs.join("/")}`;
      out.push({ path });
    }
  }
  return out;
}

/** Shallow page paths (GET HTML); extend if needed. */
const EXTRA_PATHS = [
  "/",
  "/login",
  "/tools",
  "/tools/rss-import-builder",
  "/admin",
  "/language-studio",
  "/health",
  "/api/health",
];

async function probe(path) {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ac.signal,
      headers: { accept: "*/*" },
    });
    return { path, url, status: res.status };
  } catch (e) {
    return { path, url, status: 0, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const apiRoutes = await collectApiRoutes();
  const paths = [...new Set([...apiRoutes.map((r) => r.path), ...EXTRA_PATHS])].sort();

  console.log(`Base: ${base}`);
  console.log(`Probing ${paths.length} paths (GET)…`);

  const concurrency = 5;
  /** @type {{ path: string; url: string; status: number; error?: string }[]} */
  const results = [];
  let i = 0;
  async function worker() {
    while (i < paths.length) {
      const path = paths[i++];
      results.push(await probe(path));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  results.sort((a, b) => a.path.localeCompare(b.path));

  if (allNon2xx) {
    console.log("(listing all non-2xx / redirects)\n");
    for (const r of results) {
      if (r.status === 0) console.log(`${r.status}\tERR\t${r.path}\t${r.error || ""}`);
      else if (r.status >= 300) console.log(`${r.status}\t${r.path}`);
    }
  } else {
    console.log("(listing 401 / 403 / 404 only)\n");
    for (const r of results) {
      if ([401, 403, 404].includes(r.status)) console.log(`${r.status}\t${r.path}`);
    }
  }

  const connFail = results.filter((r) => r.status === 0);
  if (connFail.length) {
    console.log("\nConnection failures (status 0) — start the dev server, then re-run:");
    console.log("  npm run dev   →  http://127.0.0.1:8081");
    for (const r of connFail.slice(0, 15)) console.log(`  ERR\t${r.path}\t${r.error || ""}`);
    if (connFail.length > 15) console.log(`  … and ${connFail.length - 15} more`);
    process.exitCode = 1;
    return;
  }

  const count = (n) => results.filter((r) => r.status === n).length;
  const c401 = count(401);
  const c403 = count(403);
  const c404 = count(404);
  const c405 = count(405);
  const c200 = count(200);
  const c204 = count(204);
  const c307 = count(307);
  const c308 = count(308);

  console.log("\n--- Summary (GET only; many APIs expect POST or a session cookie) ---");
  console.log(`  200 OK:     ${c200}`);
  console.log(`  204:        ${c204}`);
  console.log(`  401:        ${c401}  (unauthenticated — normal for protected routes)`);
  console.log(`  403:        ${c403}`);
  console.log(`  404:        ${c404}`);
  console.log(`  405:        ${c405}  (Method Not Allowed — often POST-only route hit with GET)`);
  console.log(`  307/308:    ${c307 + c308}  (redirects, if any)`);

  const problems = results.filter((r) => [403, 404].includes(r.status));
  if (problems.length) {
    console.log("\n403 / 404 (review these):");
    for (const r of problems) console.log(`  ${r.status}\t${r.path}`);
    process.exitCode = 1;
  }

  if (args.includes("--fail-on-401") && c401 > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
