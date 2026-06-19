#!/usr/bin/env node
/**
 * Batch-build Report 2.0 reports and match previews.
 * Usage:
 *   node scripts/match-report-build-now.mjs
 *   node scripts/match-report-build-now.mjs --reports-only
 *   node scripts/match-report-build-now.mjs --previews-only
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REPORT_IDS = [
  "mrpt-mpmpai7p-hvhbpz",
  "mrpt-mpj38a3i-x7ewxt",
  "mrpt-mpjstim1-0pit98",
];

const PREVIEW_MATCH_IDS = ["2990364", "2990377", "2990368"];

const SPORT365_STANDINGS = "https://www.sport365.com/football/england/premier-league#/standings";
const SPORT365_STATS = "https://www.sport365.com/football/england/premier-league";
const WHOSCORED_CANDIDATES = [
  "https://www.whoscored.com/matches/1903460/livestatistics/england-premier-league-2025-2026-west-ham-leeds",
  "https://www.whoscored.com/matches/1903453/livestatistics/england-premier-league-2025-2026-leeds-brighton",
  "https://www.whoscored.com/matches/1903458/livestatistics/england-premier-league-2025-2026-brighton-manchester-united",
  "https://www.whoscored.com/matches/1903459/livestatistics/england-premier-league-2025-2026-west-ham-leeds-united",
];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const BASE = process.env.MATCH_REPORT_E2E_BASE?.trim() || "http://127.0.0.1:8081";
const SESSION_SECRET =
  process.env.PLEXA_SESSION_SECRET?.trim() ||
  process.env.ADMIN_TOKEN?.trim() ||
  "plexa-local-dev-session-secret-change-before-hosting";

const args = new Set(process.argv.slice(2));
const reportsOnly = args.has("--reports-only");
const previewsOnly = args.has("--previews-only");

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sessionCookie() {
  const payload = { userId: "build-now", role: "admin", exp: Math.floor(Date.now() / 1000) + 86400 };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `plexa_session=${body}.${sig}`;
}

async function api(method, route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: sessionCookie() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${route} → ${res.status}: ${data.error || text.slice(0, 300)}`);
  }
  return data;
}

async function pollJob(jobId, label, maxMs = 900_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const job = await api("GET", `/api/match-report/jobs/${jobId}`);
    process.stdout.write(`\r  ${label}: ${job.status}${job.phase ? ` — ${job.phase}` : ""}   `);
    if (job.status === "completed") {
      console.log("");
      return job;
    }
    if (job.status === "failed") {
      console.log("");
      throw new Error(`${label} failed: ${job.error || "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`${label} timed out`);
}

function wordCount(html) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

function h2Sections(html) {
  return [...String(html || "").matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[1].trim());
}

function hasReport20(html) {
  return h2Sections(html).includes("Turning Point");
}

async function generateMedia(projectId, isReport) {
  const kick = await api("POST", "/api/match-report/generate-media", {
    projectId,
    includeSixteenConclusions: isReport,
  });
  if (kick.async && kick.jobId) {
    await pollJob(kick.jobId, isReport ? "Report media" : "Preview media");
    return (await api("GET", `/api/match-report/projects/${projectId}`)).project;
  }
  return kick.project ?? (await api("GET", `/api/match-report/projects/${projectId}`)).project;
}

async function skipIfAtStep(project, projectId, layer) {
  if (project.workflowStep !== layer) return project;
  console.log(`▶ Skip ${layer}…`);
  return (await api("POST", "/api/match-report/import/skip", { projectId, layer, reason: "Batch build" })).project;
}

async function ensureReportImports(projectId) {
  let project = (await api("GET", `/api/match-report/projects/${projectId}`)).project;

  if (!project.layers?.sport365Commentary?.lines?.length) {
    console.log("▶ Import SixLogics commentary…");
    project = (await api("POST", "/api/match-report/import/sixlogics-commentary", { projectId })).project;
  }

  if (!project.layers?.leagueTable) {
    console.log("▶ Import league table…");
    project = (await api("POST", "/api/match-report/import/league-table", { projectId, url: SPORT365_STANDINGS }))
      .project;
  }

  if (!project.layers?.leagueSeasonStats) {
    console.log("▶ Import league stats…");
    project = (await api("POST", "/api/match-report/import/league-stats", { projectId, url: SPORT365_STATS })).project;
  }

  project = await skipIfAtStep(project, projectId, "loop_feed");

  if (!project.layers?.optaPlayerData?.players?.length) {
    let imported = false;
    for (const url of WHOSCORED_CANDIDATES) {
      try {
        console.log(`▶ Try WhoScored ${url.match(/matches\/(\d+)/)?.[1]}…`);
        project = (
          await api("POST", "/api/match-report/import/opta-player-data", {
            projectId,
            provider: "whoscored",
            url,
          })
        ).project;
        imported = true;
        break;
      } catch (e) {
        console.log(`  skip: ${String(e.message).split("→").pop()?.trim()}`);
      }
    }
    if (!imported && project.workflowStep === "whoscored") {
      project = await skipIfAtStep(project, projectId, "whoscored");
    }
  }

  project = await skipIfAtStep(project, projectId, "manual_sources");

  if (!project.playerIntelligence?.ratings?.length) {
    console.log("▶ Player intelligence…");
    project = (await api("POST", "/api/match-report/player-intelligence", { projectId })).project;
  }

  return project;
}

async function buildReportProject(projectId) {
  let project = (await api("GET", `/api/match-report/projects/${projectId}`)).project;
  console.log(`\n========== REPORT: ${project.displayLabel} (${projectId}) ==========`);

  if (project.mediaOutputs?.reportHtml && hasReport20(project.mediaOutputs.reportHtml)) {
    const words = wordCount(project.mediaOutputs.reportHtml);
    if (words >= 700) {
      console.log(`▶ Already Report 2.0 (${words} words) — regenerating for latest prompt…`);
    }
  }

  project = await ensureReportImports(projectId);

  console.log("▶ Build Event Picture…");
  await api("POST", "/api/match-report/build-picture", { projectId });

  console.log("▶ Generate Report 2.0…");
  project = await generateMedia(projectId, true);

  console.log("▶ Fact check…");
  project = (await api("POST", "/api/match-report/fact-check", { projectId })).project;

  const sections = h2Sections(project.mediaOutputs?.reportHtml);
  console.log("---");
  console.log(`Headline: ${project.mediaOutputs?.headline}`);
  console.log(`Words: ${wordCount(project.mediaOutputs?.reportHtml)} | Sections: ${sections.length}`);
  console.log(`Editorial: ${project.reportEditorialScore?.overall ?? "n/a"} | FC: ${project.factCheck?.status} (${project.factCheck?.articleScore?.overall ?? "n/a"})`);

  const outDir = path.join(ROOT, "data", "local", "e2e-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${projectId}-report.html`);
  fs.writeFileSync(
    outFile,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.mediaOutputs?.headline}</title></head><body>${project.mediaOutputs?.reportHtml ?? ""}${project.mediaOutputs?.playerRatingsHtml ?? ""}</body></html>`,
    "utf-8",
  );
  console.log(`Saved: ${outFile}`);
  return project;
}

async function findOrCreatePreview(matchId) {
  const entries = (await api("GET", "/api/match-report/projects")).entries ?? [];
  const existing = entries.find((e) => e.contentType === "match_preview" && e.matchId === matchId);
  if (existing) {
    console.log(`▶ Reuse preview ${existing.projectId} for match ${matchId}`);
    return (await api("GET", `/api/match-report/projects/${existing.projectId}`)).project;
  }

  console.log(`▶ Create preview for match ${matchId}…`);
  const created = await api("POST", "/api/match-report/projects", {
    matchId,
    sportId: "1",
    contentType: "match_preview",
    reportScope: "full",
    reportFormat: "neutral",
    editorial: {
      targetBrand: "football365",
      useCreatorProfile: true,
      journalistProfileId: "ljournalist-mpk2096e-3qt8qe",
    },
  });
  return created.project;
}

async function buildPreviewForMatch(matchId) {
  let project = await findOrCreatePreview(matchId);
  const projectId = project.id;
  console.log(`\n========== PREVIEW: ${project.displayLabel} (${projectId}) ==========`);

  if (project.workflowStep === "competition_rules") {
    project = (await api("POST", `/api/match-report/projects/${projectId}/advance`)).project;
  }

  if (!project.layers?.fixtureContext) {
    console.log("▶ Preview fixture context…");
    project = (await api("POST", "/api/match-report/import/preview-fixture-context", { projectId })).project;
  }

  if (!project.layers?.leagueTable) {
    console.log("▶ Import league table…");
    project = (await api("POST", "/api/match-report/import/league-table", { projectId, url: SPORT365_STANDINGS }))
      .project;
  }

  if (!project.layers?.leagueSeasonStats) {
    console.log("▶ Import league stats…");
    project = (await api("POST", "/api/match-report/import/league-stats", { projectId, url: SPORT365_STATS })).project;
  }

  project = await skipIfAtStep(project, projectId, "loop_feed");
  project = await skipIfAtStep(project, projectId, "manual_sources");

  console.log("▶ Build Preview Picture…");
  await api("POST", "/api/match-report/build-picture", { projectId });

  console.log("▶ Generate preview…");
  project = await generateMedia(projectId, false);

  console.log("▶ Fact check…");
  project = (await api("POST", "/api/match-report/fact-check", { projectId })).project;

  const sections = h2Sections(project.mediaOutputs?.reportHtml);
  const editorial = project.previewEditorialScore ?? project.reportEditorialScore;
  console.log("---");
  console.log(`Headline: ${project.mediaOutputs?.headline}`);
  console.log(`Words: ${wordCount(project.mediaOutputs?.reportHtml)} | Sections: ${sections.length}`);
  console.log(`Editorial: ${editorial?.overall ?? "n/a"} | FC: ${project.factCheck?.status} (${project.factCheck?.articleScore?.overall ?? "n/a"})`);

  const outDir = path.join(ROOT, "data", "local", "e2e-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${projectId}-preview.html`);
  fs.writeFileSync(
    outFile,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.mediaOutputs?.headline}</title></head><body>${project.mediaOutputs?.reportHtml ?? ""}</body></html>`,
    "utf-8",
  );
  console.log(`Saved: ${outFile}`);
  return project;
}

async function main() {
  console.log(`Batch build — ${BASE}`);
  const summary = [];

  if (!previewsOnly) {
    for (const id of REPORT_IDS) {
      try {
        const p = await buildReportProject(id);
        summary.push({
          type: "report",
          id,
          words: wordCount(p.mediaOutputs?.reportHtml),
          editorial: p.reportEditorialScore?.overall,
          fc: p.factCheck?.status,
        });
      } catch (e) {
        console.error(`FAILED report ${id}:`, e.message);
        summary.push({ type: "report", id, error: e.message });
      }
    }
  }

  if (!reportsOnly) {
    for (const matchId of PREVIEW_MATCH_IDS) {
      try {
        const p = await buildPreviewForMatch(matchId);
        summary.push({
          type: "preview",
          id: p.id,
          matchId,
          words: wordCount(p.mediaOutputs?.reportHtml),
          editorial: (p.previewEditorialScore ?? p.reportEditorialScore)?.overall,
          fc: p.factCheck?.status,
        });
      } catch (e) {
        console.error(`FAILED preview ${matchId}:`, e.message);
        summary.push({ type: "preview", matchId, error: e.message });
      }
    }
  }

  console.log("\n========== SUMMARY ==========");
  for (const row of summary) {
    if (row.error) {
      console.log(`${row.type} ${row.id ?? row.matchId}: ERROR — ${row.error}`);
    } else {
      console.log(
        `${row.type} ${row.id}: ${row.words} words | editorial ${row.editorial} | ${row.fc}`,
      );
    }
  }
}

main().catch((err) => {
  console.error("\nBatch build failed:", err.message);
  process.exit(1);
});
