#!/usr/bin/env node
/**
 * Sync 2026 F1 driver headshots into public/grid/drivers/{slug}.png
 * Source: Formula 1 official media CDN (front portrait, cropped to template size).
 *
 * Usage: node scripts/sync-f1-driver-images.mjs [--slug=kimi-antonelli] [--force]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "grid", "drivers");
const F1_VERSION = "v1740000001";

/** slug → F1 CDN asset prefix (without front/right suffix) */
const DRIVERS = [
  ["max-verstappen", "common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01"],
  ["kimi-antonelli", "common/f1/2026/mercedes/andant01/2026mercedesandant01"],
  ["george-russell", "common/f1/2026/mercedes/georus01/2026mercedesgeorus01"],
  ["charles-leclerc", "common/f1/2026/ferrari/chalec01/2026ferrarichalec01"],
  ["lewis-hamilton", "common/f1/2026/ferrari/lewham01/2026ferrarilewham01"],
  ["lando-norris", "common/f1/2026/mclaren/lannor01/2026mclarenlannor01"],
  ["oscar-piastri", "common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01"],
  ["pierre-gasly", "common/f1/2026/alpine/piegas01/2026alpinepiegas01"],
  ["franco-colapinto", "common/f1/2026/alpine/fracol01/2026alpinefracol01"],
  ["fernando-alonso", "common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01"],
  ["lance-stroll", "common/f1/2026/astonmartin/lanstr01/2026astonmartinlanstr01"],
  ["oliver-bearman", "common/f1/2026/haasf1team/olibea01/2026haasf1teamolibea01"],
  ["esteban-ocon", "common/f1/2026/haasf1team/estoco01/2026haasf1teamestoco01"],
  ["gabriel-bortoleto", "common/f1/2026/audi/gabbor01/2026audigabbor01"],
  ["nico-hulkenberg", "common/f1/2026/audi/nichul01/2026audinichul01"],
  ["valtteri-bottas", "common/f1/2026/cadillac/valbot01/2026cadillacvalbot01"],
  ["sergio-perez", "common/f1/2026/cadillac/serper01/2026cadillacserper01"],
  ["alex-albon", "common/f1/2026/williams/alealb01/2026williamsalealb01"],
  ["carlos-sainz", "common/f1/2026/williams/carsai01/2026williamscarsai01"],
  ["liam-lawson", "common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01"],
  ["arvid-lindblad", "common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01"],
  ["isack-hadjar", "common/f1/2026/redbullracing/isahad01/2026redbullracingisahad01"],
];

const args = process.argv.slice(2);
const onlySlug = args.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);
const force = args.includes("--force");

function sips(...sipsArgs) {
  execFileSync("sips", sipsArgs, { stdio: "pipe" });
}

async function downloadPortrait(assetPrefix) {
  const url = `https://media.formula1.com/image/upload/f_auto/q_auto/${F1_VERSION}/${assetPrefix}front.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`Empty response for ${url}`);
  return buf;
}

function processPortrait(inputPath, outputPath) {
  const cropped = `${inputPath}.crop.png`;
  // Head-and-shoulders from the official front portrait (1608×3840; face ~y400).
  sips("--cropToHeightWidth", "900", "1608", "--cropOffset", "400", "0", inputPath, "--out", cropped);
  sips("-Z", "200", cropped, "--out", outputPath);
  fs.unlinkSync(cropped);
}

async function syncDriver(slug, assetPrefix) {
  const outPath = path.join(OUT_DIR, `${slug}.png`);
  if (!force && fs.existsSync(outPath)) {
    console.log(`skip ${slug} (exists)`);
    return;
  }

  const tmp = path.join(OUT_DIR, `.tmp-${slug}.png`);
  const buf = await downloadPortrait(assetPrefix);
  fs.writeFileSync(tmp, buf);
  processPortrait(tmp, outPath);
  fs.unlinkSync(tmp);
  const size = fs.statSync(outPath).size;
  console.log(`saved ${slug}.png (${size} bytes)`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const list = onlySlug ? DRIVERS.filter(([slug]) => slug === onlySlug) : DRIVERS;
  if (onlySlug && list.length === 0) {
    console.error(`Unknown slug: ${onlySlug}`);
    process.exit(1);
  }

  let failed = 0;
  for (const [slug, assetPrefix] of list) {
    try {
      await syncDriver(slug, assetPrefix);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${slug}:`, err instanceof Error ? err.message : err);
    }
  }
  if (failed > 0) process.exit(1);
}

main();
