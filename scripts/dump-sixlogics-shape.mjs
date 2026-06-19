#!/usr/bin/env node
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const base = env.SIXLOGICS_FIXTURE_BASE?.trim() || "https://datafeed.sixlogics.com/api";
const matchId = process.argv[2] ?? "3177321";

function walkKeys(obj, prefix = "", depth = 0, out = []) {
  if (depth > 4 || out.length > 40 || obj === null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    if (obj[0] && typeof obj[0] === "object") walkKeys(obj[0], `${prefix}[0]`, depth + 1, out);
    return out;
  }
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(path);
    walkKeys(obj[k], path, depth + 1, out);
    if (out.length >= 40) break;
  }
  return out;
}

for (const ep of ["SportccFixture", "Match"]) {
  const url = new URL(`${base}/${ep}`);
  url.searchParams.set("userID", env.SIXLOGICS_USER_ID);
  url.searchParams.set("pass", env.SIXLOGICS_PASS);
  url.searchParams.set("sport_id", "1");
  url.searchParams.set("match_id", matchId);
  const res = await fetch(url);
  const text = await res.text();
  console.log(`\n=== ${ep} HTTP ${res.status} len ${text.length}`);
  if (!text.trim()) continue;
  const payload = JSON.parse(text);
  console.log("top:", Object.keys(payload));
  console.log("paths:", walkKeys(payload).slice(0, 25).join("\n  "));
}
